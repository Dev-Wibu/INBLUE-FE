import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { formatNumber } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { applicationService } from "@/services/application.manager";
import { companyManager, type JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function formatSalaryRaw(min?: number, max?: number) {
  if (min && max) {
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  }
  if (min) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryFrom")} ${formatNumber(min)}`;
  }
  if (max) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryTo")} ${formatNumber(max)}`;
  }
  return i18n.t("enterpriseJobdescriptiondetailpage.salaryAgreement");
}

function formatDate(dateStr?: string) {
  if (!dateStr) return i18n.t("enterpriseJobdescriptiondetailpage.unlimited");
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getLevelBadgeColor(level?: string) {
  switch (level?.toUpperCase()) {
    case "INTERN":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30";
    case "FRESHER":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30";
    case "JUNIOR":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30";
    case "MIDDLE":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

function getStatusBadgeColor(status?: string) {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30";
    case "CLOSED":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRoundTypeIcon(type?: string) {
  switch (type?.toUpperCase()) {
    case "CV_SCREENING":
      return <Users className="h-4 w-4" />;
    case "EMAIL_SIMULATOR":
      return <Briefcase className="h-4 w-4" />;
    case "QUIZ":
      return <Zap className="h-4 w-4 text-amber-500" />;
    case "DB_DESIGN":
      return <AlertCircle className="h-4 w-4" />;
    case "AI_INTERVIEW":
      return <Bot className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

export function JobDescriptionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const jdIdNum = Number(id);

  const { hasPurchased, hasApplied, applicationId, isLoadingStatus, refetchStatus } =
    useJdPurchaseStatus(jdIdNum);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await companyManager.getJobById(Number(id));
        if (result.success && result.data) {
          setJob(result.data);
        } else {
          setError(t("enterpriseJobdescriptiondetailpage.noVacancyInformationFound"));
        }
      } catch (err) {
        console.error("[JobDescriptionDetailPage] Error:", err);
        setError(t("enterpriseJobdescriptiondetailpage.errorLoadingInfo"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [id, isLoggedIn, t]);

  const handleBuyPackage = async () => {
    if (!isLoggedIn) {
      toast.error(t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply"));
      navigate(`/login?redirect=/enterprise/job/${id}`);
      return;
    }
    if (!jdIdNum) return;

    setIsBuying(true);
    try {
      localStorage.setItem("pending_jd_purchase_id", String(jdIdNum));
      const checkoutUrl = await jdPurchaseManager.createPayment(jdIdNum);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("[BuyPackage] Error:", err);
      toast.error(
        t("payment.createPaymentFailed", "Không thể tạo đơn thanh toán. Vui lòng thử lại.")
      );
    } finally {
      setIsBuying(false);
    }
  };

  const handleApply = async () => {
    if (!isLoggedIn) {
      toast.error(t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply"));
      navigate(`/login?redirect=/enterprise/job/${id}`);
      return;
    }
    if (job?.status !== "OPEN") {
      toast.warning(t("enterpriseJobdescriptiondetailpage.thisPositionIsCurrentlyNo"));
      return;
    }
    if (!jdIdNum) return;

    setIsApplying(true);
    try {
      const result = await applicationService.apply(jdIdNum);
      if (result.success) {
        toast.success(t("enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck"));
        await refetchStatus();
        const refreshResult = await companyManager.getJobById(jdIdNum);
        if (refreshResult.success && refreshResult.data) {
          setJob(refreshResult.data);
        }
        const createdAppId = result.data?.id;
        if (createdAppId) {
          navigate(`/user?tab=applicationHistory&appId=${createdAppId}`);
        } else {
          navigate(`/user?tab=applicationHistory`);
        }
      } else {
        const errorMsg =
          result.error ||
          t("enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain");
        toast.error(errorMsg, {
          duration: 5000,
        });
      }
    } catch (err: unknown) {
      console.error("[Apply] Catch error:", err);
      const is402 =
        (err &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status: number }).status === 402) ||
        (err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 402);
      if (is402) {
        toast.error(t("payment.paymentRequiredToApply", "Bạn cần mua gói apply cho JD này trước."));
      } else {
        toast.error(t("enterpriseJobdescriptiondetailpage.errorApplyingPleaseTryAgain"));
      }
    } finally {
      setIsApplying(false);
    }
  };

  const renderActionButton = (fullWidth = false) => {
    const widthClass = fullWidth ? "w-full" : "";

    if (job?.status !== "OPEN") {
      return (
        <Button disabled className={`rounded-xl bg-slate-400 text-white ${widthClass}`} size="lg">
          {t("enterpriseJobdescriptiondetailpage.recruitmentHasBeenClosed")}
        </Button>
      );
    }

    if (!isLoggedIn) {
      return (
        <Button
          onClick={() => navigate(`/login?redirect=/enterprise/job/${id}`)}
          className={`rounded-xl bg-indigo-600 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-indigo-700 ${widthClass}`}
          size="lg">
          {t("enterpriseJobdescriptiondetailpage.loginToApply")}
        </Button>
      );
    }

    if (isLoadingStatus) {
      return (
        <Button disabled className={`rounded-xl bg-slate-400 text-white ${widthClass}`} size="lg">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          {t("common.checking", "Đang kiểm tra...")}
        </Button>
      );
    }

    const priceText =
      typeof job?.price === "number" && job.price > 0
        ? `${formatNumber(job.price)} VND`
        : typeof job?.price === "number" && job.price === 0
          ? t("common.free", "Miễn phí")
          : "99.000 VND";

    const primaryAction = hasPurchased ? (
      <Button
        onClick={handleApply}
        disabled={isApplying}
        className={`rounded-xl bg-indigo-600 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-indigo-700 ${widthClass}`}
        size="lg">
        {isApplying ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t("common.processing")}
          </>
        ) : hasApplied ? (
          t("enterpriseJobdescriptiondetailpage.reapply")
        ) : (
          t("enterpriseJobdescriptiondetailpage.applyNow")
        )}
      </Button>
    ) : (
      <Button
        onClick={handleBuyPackage}
        disabled={isBuying}
        className={`rounded-xl bg-amber-600 font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 ${widthClass}`}
        size="lg">
        {isBuying ? (
          <>
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t("common.processing")}
          </>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 shrink-0 text-amber-100" />
            {t("payment.buyPackageWithPrice", {
              defaultValue: `Mua gói — ${priceText}`,
              price: priceText,
            })}
          </span>
        )}
      </Button>
    );

    if (!hasApplied) {
      return primaryAction;
    }

    return (
      <div className={`flex gap-3 ${fullWidth ? "w-full flex-col" : "flex-wrap"}`}>
        {primaryAction}
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              applicationId
                ? `/user?tab=applicationHistory&appId=${applicationId}`
                : "/user?tab=applicationHistory"
            )
          }
          className={`rounded-xl border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 ${widthClass}`}
          size="lg">
          <CheckCircle2 className="mr-2 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {t("enterpriseJobdescriptiondetailpage.alreadyAppliedView")}
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />
        {/* Skeleton Header */}
        <div className="border-b border-slate-200 bg-white py-5 dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-8 w-96 bg-slate-200 dark:bg-slate-800" />
            </div>
            <Skeleton className="hidden h-10 w-40 rounded-xl bg-slate-200 md:block dark:bg-slate-800" />
          </div>
        </div>

        {/* Skeleton Body */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="h-64 w-full rounded-[20px] bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-64 w-full rounded-[20px] bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-[20px] bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-32 w-full rounded-[20px] bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />

        {/* Sleek Breadcrumb Header even on error */}
        <div className="border-b border-slate-200 bg-white py-4 dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-[#66B2FF]">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("general.back")}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <Card className="rounded-[20px] border-red-100 bg-red-50/50 p-8 shadow-sm dark:border-red-900/20 dark:bg-red-950/10">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("enterpriseJobdescriptiondetailpage.locationNotFound")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {error || t("enterpriseJobdescriptiondetailpage.errorLoadingInfo")}
              </p>
              <Button
                onClick={() => navigate(-1)}
                className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                {t("general.back")}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const logoUrl = (job as any).companyLogo || (job as any).thumbnailUrl || (job as any).companyLogoUrl || null;

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px] pb-24 md:pb-0 dark:bg-slate-950">
      <HomepageHeader />

      {/* Back button */}
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-[#66B2FF]">
          <ArrowLeft className="h-4 w-4" />
          {t("general.back")}
        </button>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        
        {/* Hero Section */}
        <div className="mb-10 flex flex-col gap-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8 dark:border-slate-800/60 dark:bg-slate-900/40">
          
          <div className="flex flex-1 flex-col items-start gap-5 sm:flex-row">
            {/* Logo */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-indigo-100 bg-indigo-50 text-2xl font-bold text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-400">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={job.companyName || "Company"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-10 w-10" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={getLevelBadgeColor(job.level)}>
                  {job.level || t("common.notDetermined")}
                </Badge>
                <Badge className={`border ${getStatusBadgeColor(job.status)}`}>
                  {job.status === "OPEN"
                    ? t("enterpriseJobdescriptiondetailpage.currentlyRecruiting")
                    : job.status === "CLOSED"
                      ? t("enterpriseJobdescriptiondetailpage.closed")
                      : t("common.draft1")}
                </Badge>
              </div>
              <h1 className="mb-1 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl dark:text-white">
                {job.title || t("enterpriseJobdescriptiondetailpage.recruitmentPosition")}
              </h1>
              <Link
                to={job.companyId ? `/enterprise/company/${job.companyId}` : "#"}
                className="inline-flex items-center text-base font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                {job.companyName || t("enterpriseJobdescriptiondetailpage.recruitmentCompany")}
              </Link>
              
              <div className="mt-5 flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Banknote className="h-5 w-5" />
                  {formatSalaryRaw(job.salaryMin, job.salaryMax)}
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="h-[18px] w-[18px] text-slate-400" />
                  {job.location || t("common.hoChiMinh")}
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <CalendarDays className="h-[18px] w-[18px] text-slate-400" />
                  HSD: {formatDate(job.deadlineAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment / Apply Card (Desktop Right) */}
          <div className="flex shrink-0 flex-col rounded-2xl bg-slate-50/80 p-5 md:w-[280px] dark:bg-[#0B0F19]/50 border border-slate-100 dark:border-slate-800/40">
            {job.status === "OPEN" ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {t("payment.applicationFee", "Phí ứng tuyển")}
                  </span>
                  {hasPurchased ? (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      Đã thanh toán
                    </Badge>
                  ) : null}
                </div>
                <div className="mb-5 flex items-center gap-2">
                  <Coins className="h-6 w-6 text-amber-500" />
                  <span className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-500">
                    {typeof job?.price === "number" && job.price > 0
                      ? `${formatNumber(job.price)} VND`
                      : typeof job?.price === "number" && job.price === 0
                        ? t("common.free", "Miễn phí")
                        : "99.000 VND"}
                  </span>
                </div>
                {renderActionButton(true)}
              </>
            ) : (
              <div>{renderActionButton(true)}</div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="grid gap-12 lg:grid-cols-3">
          
          <div className="space-y-12 lg:col-span-2">
            {/* Description */}
            <section>
              <h2 className="mb-4 flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Briefcase className="h-4 w-4" />
                </div>
                {t("common.jobDescription")}
              </h2>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                  {job.description || t("enterpriseJobdescriptiondetailpage.noJobDescriptionYet")}
                </p>
              </div>
            </section>

            {/* Requirements */}
            <section>
              <h2 className="mb-4 flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                {t("common.candidateRequirements")}
              </h2>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                  {job.requirements || t("enterpriseJobdescriptiondetailpage.thereAreNoSpecificRequirements")}
                </p>
              </div>
              
              {/* Skills (merged into requirements) */}
              {job.skills && job.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {t("enterpriseJobdescriptiondetailpage.requiredSkills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="rounded-lg border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Benefits */}
            <section>
              <h2 className="mb-4 flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                {t("common.welfare")}
              </h2>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                  {job.benefits || t("enterpriseJobdescriptiondetailpage.thereIsNoBenefitInformation")}
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar Area (Rounds Pipeline) */}
          <div className="lg:border-l lg:border-slate-200 lg:pl-10 dark:lg:border-slate-800/60">
            <h2 className="mb-8 flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {t("enterpriseJobdescriptiondetailpage.interviewProcess")}
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {job.rounds?.length || 0}
              </span>
            </h2>

            {job.rounds && job.rounds.length > 0 ? (
              <div className="relative space-y-8">
                {/* Vertical Line connecting nodes */}
                <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-indigo-100 dark:bg-indigo-950" />
                
                {job.rounds.map((round, index) => (
                  <div key={round.id || index} className="relative z-10 flex gap-5">
                    {/* Node */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-indigo-100 text-sm font-bold text-indigo-600 shadow-sm dark:border-[#0B0F19] dark:bg-indigo-900 dark:text-indigo-400">
                      {index + 1}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 pt-1.5 pb-2">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {round.name || t("common.roundVar0", { var_0: index + 1 })}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-slate-200 bg-white text-[11.5px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <span className="mr-1 text-indigo-600 dark:text-indigo-400">{getRoundTypeIcon(round.roundType)}</span>
                          {round.roundType?.replace("_", " ") || t("common.notDetermined")}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                        {round.passThreshold && (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>Điểm chuẩn: <strong className="text-slate-700 dark:text-slate-300">{round.passThreshold}%</strong></span>
                          </div>
                        )}
                        {round.configData?.timeLimitMinutes && (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>Thời gian: <strong className="text-slate-700 dark:text-slate-300">{round.configData.timeLimitMinutes} {t("common.minute")}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Chưa cập nhật quy trình phỏng vấn.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
