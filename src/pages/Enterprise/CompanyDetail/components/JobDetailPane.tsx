import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { formatDate } from "@/lib/formatting";
import { applicationService } from "@/services/application.manager";
import type { Company, JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Heart,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { InterviewProcessTimeline } from "./InterviewProcessTimeline";

interface JobDetailPaneProps {
  job: JobDescription;
  company: Company;
}

export function JobDetailPane({ job, company }: JobDetailPaneProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [isSaved, setIsSaved] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { hasPurchased, hasApplied, isLoadingStatus, refetchStatus } = useJdPurchaseStatus(job.id);
  const normalizedJobStatus = job.status?.toUpperCase();
  const isJobOpen = normalizedJobStatus === "OPEN";

  const salaryText =
    job.salaryMin || job.salaryMax
      ? `${job.salaryMin ? job.salaryMin.toLocaleString() : 0} - ${
          job.salaryMax ? job.salaryMax.toLocaleString() : "Max"
        } ${job.currency || "VND"}`
      : t("enterpriseCompanydetail.negotiate");

  const companyInitials =
    company.name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TN";

  const handlePurchaseOrApply = async () => {
    if (!isLoggedIn) {
      toast.error(
        t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply", "Please log in to continue.")
      );
      navigate(`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }

    if (!isJobOpen) {
      toast.warning(
        t(
          "enterpriseJobdescriptiondetailpage.thisPositionIsCurrentlyNo",
          "This position is no longer open."
        )
      );
      return;
    }

    const jdId = Number(job.id);
    if (!Number.isFinite(jdId) || jdId <= 0) {
      toast.error(t("common.anErrorHasOccurred", "Unable to identify this job."));
      return;
    }

    setIsActionLoading(true);
    try {
      if (!hasPurchased) {
        localStorage.setItem("pending_jd_purchase_id", String(jdId));
        const payment = await jdPurchaseManager.createPayment(jdId);
        if (!payment.checkoutUrl) {
          throw new Error("No payment checkout URL received");
        }
        window.location.assign(payment.checkoutUrl);
        return;
      }

      const result = await applicationService.apply(jdId);
      if (!result.success) {
        if (result.statusCode === 402) {
          await refetchStatus();
          toast.error(
            t("payment.paymentRequiredToApply", "Bạn cần mua gói apply cho JD này trước."),
            { duration: 5000 }
          );
          return;
        }

        toast.error(
          result.error ||
            t(
              "enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain",
              "Unable to submit your application. Please try again."
            ),
          { duration: 5000 }
        );
        return;
      }

      toast.success(
        t(
          "enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck",
          "Application submitted successfully!"
        )
      );
      await refetchStatus();
      const applicationId = result.data?.id;
      navigate(
        applicationId
          ? `/user?tab=applicationHistory&appId=${applicationId}`
          : "/user?tab=applicationHistory"
      );
    } catch (error) {
      console.error("[JobDetailPane] Purchase/apply error:", error);
      toast.error(
        t("common.anErrorOccurredPleaseTryAgain", "Something went wrong. Please try again.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const hasRounds = Array.isArray(job.rounds) && job.rounds.length > 0;

  return (
    <div className="sticky top-20 flex h-[calc(100vh-96px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Scrollable Container containing Left Detail Content + Right Timeline */}
      <div className="scrollbar-thin flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Main Job Content (Image 2 style) */}
          <div className={hasRounds ? "space-y-5 xl:col-span-8" : "space-y-5 xl:col-span-12"}>
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {/* Top Navigation & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t("common.back", "Back")}</span>
                </button>

                <div className="flex items-center gap-2">
                  {job.level && (
                    <Badge
                      variant="secondary"
                      className="bg-indigo-50 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {job.level}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {t("enterpriseCompanydetail.currentlyRecruiting", "Currently recruiting")}
                  </Badge>
                </div>
              </div>

              {/* Company Logo & Job Title (Full Width) */}
              <div className="mt-4 flex items-start gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                  {company.logoUrl ? (
                    <Avatar className="h-full w-full rounded-lg">
                      <AvatarImage
                        src={company.logoUrl}
                        alt={company.name}
                        className="object-contain"
                      />
                      <AvatarFallback className="rounded-lg bg-transparent text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {companyInitials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold break-words text-slate-950 sm:text-2xl dark:text-white">
                    {job.title}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {company.name}
                  </p>
                </div>
              </div>

              {/* Bottom Info Bar & Price CTA Box */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                {/* Info Chips (Salary, Location, HSD) */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    {salaryText}
                  </span>

                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.location}</span>
                    </span>
                  )}

                  {job.deadlineAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>HSD: {formatDate(job.deadlineAt)}</span>
                    </span>
                  )}
                </div>

                {/* Price Box + Primary Action Button */}
                <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <div className="text-right">
                    <span className="block text-[10px] font-medium text-slate-400 uppercase">
                      Fee practice
                    </span>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {job.price ? `${job.price.toLocaleString()} VND` : "2,000 VND"}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => void handlePurchaseOrApply()}
                    disabled={isActionLoading || (isLoggedIn && isLoadingStatus) || !isJobOpen}
                    className="group rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {isLoggedIn && isLoadingStatus
                      ? t("common.checking", "Checking...")
                      : isActionLoading
                        ? t("common.processing", "Processing...")
                        : hasApplied
                          ? t("enterpriseJobdescriptiondetailpage.alreadyApplied", "Đã ứng tuyển ✓")
                          : !hasPurchased
                            ? t("payment.buyPackage", "Mua gói")
                            : t("enterpriseJobdescriptiondetailpage.applyNow", "Apply ngay")}
                    {!isLoadingStatus && hasPurchased && (
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSaved(!isSaved)}
                    className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-700">
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Sections: Job description, Candidate requirements, Welfare */}
            <div className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {/* Job description */}
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t("enterpriseCompanydetail.jobDescription", "Job description")}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                  {job.description || t("enterpriseCompanydetail.noCompanyDescription")}
                </p>
              </div>

              {/* Candidate requirements */}
              {job.requirements && (
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>
                      {t("enterpriseCompanydetail.jobRequirements", "Candidate requirements")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {job.requirements}
                  </p>
                </div>
              )}

              {/* Welfare / Benefits */}
              {job.benefits && (
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>{t("enterpriseCompanydetail.jobBenefits", "Welfare")}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {job.benefits}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sub-column: Vertical Interview Process Timeline (Image 2 style) */}
          {hasRounds && (
            <div className="xl:col-span-4">
              <InterviewProcessTimeline rounds={job.rounds} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
