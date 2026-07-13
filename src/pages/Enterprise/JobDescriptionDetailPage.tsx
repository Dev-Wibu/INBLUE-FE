import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import i18n from "@/lib/i18n";
import { applicationService, type Application } from "@/services/application.manager";
import { companyManager, type JobDescription } from "@/services/company.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
function formatSalary(min?: number, max?: number, currency = "VND") {
  const format = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    return `${(num / 1000).toFixed(0)}K`;
  };
  if (min && max) {
    return `${format(min)} - ${format(max)} ${currency}`;
  }
  if (min) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryFrom")} ${format(min)} ${currency}`;
  }
  if (max) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryTo")} ${format(max)} ${currency}`;
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
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "FRESHER":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "JUNIOR":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "MIDDLE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}
function getStatusBadgeColor(status?: string) {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "CLOSED":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function getRoundTypeIcon(type?: string) {
  switch (type?.toUpperCase()) {
    case "CV_SCREENING":
      return <Users className="h-5 w-5" />;
    case "EMAIL_SIMULATOR":
      return <Briefcase className="h-5 w-5" />;
    case "QUIZ":
      return <Zap className="h-5 w-5" />;
    case "DB_DESIGN":
      return <AlertCircle className="h-5 w-5" />;
    case "AI_INTERVIEW":
      return <Bot className="h-5 w-5" />;
    default:
      return <CheckCircle2 className="h-5 w-5" />;
  }
}
// Statuses that block a new application for the same JD.
// FAILED / SOFT_FAILED allow the user to re-apply (start a fresh attempt).
const BLOCKING_APPLICATION_STATUSES = ["IN_PROGRESS", "PASSED"] as const;

export function JobDescriptionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const [job, setJob] = useState<JobDescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
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

        // Fetch the user's existing applications to decide whether the Apply
        // button should be disabled. We surface only the most-recent application
        // for this JD (BE may currently return duplicates due to missing
        // unique-constraint on `(user_id, jd_id)`).
        if (isLoggedIn) {
          const myAppsResult = await applicationService.getMyApplications();
          if (myAppsResult.success && myAppsResult.data) {
            const appsForThisJd = myAppsResult.data
              .filter((app) => app.jdId === Number(id) && !app.isDeleted)
              .sort((a, b) => {
                const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (aTs !== bTs) return bTs - aTs;
                return (b.id ?? 0) - (a.id ?? 0);
              });
            setExistingApplication(appsForThisJd[0] ?? null);
          }
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
  // Only block when there is an application still in an active phase
  // (IN_PROGRESS / PASSED). FAILED and SOFT_FAILED allow the user to re-apply.
  const isApplicationActive =
    existingApplication !== null &&
    BLOCKING_APPLICATION_STATUSES.includes(
      existingApplication.status as (typeof BLOCKING_APPLICATION_STATUSES)[number]
    );
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
    if (isApplicationActive) {
      toast.warning(t("enterpriseJobdescriptiondetailpage.alreadyAppliedActive"));
      return;
    }
    if (!job?.id) return;
    setIsApplying(true);
    try {
      const result = await applicationService.apply(job.id);
      if (result.success) {
        toast.success(t("enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck"));
        // Track the newly created application so the button stays disabled
        // until the user finishes the new attempt.
        if (result.data) {
          setExistingApplication(result.data);
        } else {
          // Defensive fallback: refetch my-applications to keep state truthful
          // even when BE returns no body.
          const myAppsResult = await applicationService.getMyApplications();
          if (myAppsResult.success && myAppsResult.data) {
            const appsForThisJd = myAppsResult.data
              .filter((app) => app.jdId === job.id && !app.isDeleted)
              .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
            setExistingApplication(appsForThisJd[0] ?? null);
          }
        }
        // Refresh job data to update applied count
        const refreshResult = await companyManager.getJobById(job.id);
        if (refreshResult.success && refreshResult.data) {
          setJob(refreshResult.data);
        }
      } else {
        const errorMsg =
          result.error ||
          t("enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain");
        toast.error(errorMsg, {
          duration: 5000,
        });
      }
    } catch (err) {
      console.error("[Apply] Catch error:", err);
      toast.error(t("enterpriseJobdescriptiondetailpage.errorApplyingPleaseTryAgain"));
    } finally {
      setIsApplying(false);
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />
        <div className="mx-auto max-w-7xl px-6 py-24">
          <Skeleton className="mb-6 h-10 w-32" />
          <Skeleton className="mb-8 h-48 w-full" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
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
        <div className="mx-auto max-w-7xl px-6 py-24">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#0047AB] dark:text-slate-400 dark:hover:text-[#66B2FF]">
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </button>
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-red-700 dark:text-red-400">
                {error || t("enterpriseJobdescriptiondetailpage.locationNotFound")}
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <HomepageHeader />
      <div className="mx-auto max-w-7xl px-6 py-24">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#0047AB] dark:text-slate-400 dark:hover:text-[#66B2FF]">
          <ArrowLeft className="h-4 w-4" />
          {t("general.back")}
        </button>

        {/* Header card */}
        <Card className="mb-6 border-[#0047AB]/20 dark:border-[#66B2FF]/20">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
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
                <h1 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">
                  {job.title || t("enterpriseJobdescriptiondetailpage.recruitmentPosition")}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location || t("common.hoChiMinh")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>
                      {job.appliedCount || 0} {t("common.candidate")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Apply */}
              <Button
                onClick={handleApply}
                disabled={isApplying || job.status !== "OPEN" || isApplicationActive}
                className={`text-white ${isApplicationActive || job.status !== "OPEN" ? "cursor-not-allowed bg-green-600 hover:bg-green-600" : !isLoggedIn ? "cursor-not-allowed bg-slate-400 hover:bg-slate-500" : "bg-[#0047AB] hover:bg-[#003d8f]"}`}
                size="lg">
                {isApplying ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("common.processing")}
                  </>
                ) : isApplicationActive ? (
                  t("enterpriseJobdescriptiondetailpage.applied")
                ) : existingApplication ? (
                  t("enterpriseJobdescriptiondetailpage.reapply")
                ) : job.status !== "OPEN" ? (
                  t("enterpriseJobdescriptiondetailpage.recruitmentHasBeenClosed")
                ) : !isLoggedIn ? (
                  t("enterpriseJobdescriptiondetailpage.loginToApply")
                ) : (
                  t("enterpriseJobdescriptiondetailpage.applyNow")
                )}
              </Button>
            </div>

            {/* Deadline */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <Calendar className="h-5 w-5 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t("general.deadline")}{" "}
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatDate(job.deadlineAt)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[#0047AB]" />
                  {t("common.jobDescription")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                  {job.description || t("enterpriseJobdescriptiondetailpage.noJobDescriptionYet")}
                </p>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#0047AB]" />
                  {t("common.candidateRequirements")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                  {job.requirements ||
                    t("enterpriseJobdescriptiondetailpage.thereAreNoSpecificRequirements")}
                </p>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  {t("common.welfare")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                  {job.benefits ||
                    t("enterpriseJobdescriptiondetailpage.thereIsNoBenefitInformation")}
                </p>
              </CardContent>
            </Card>

            {/* Interview Rounds */}
            {job.rounds && job.rounds.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#0047AB]" />
                    {t("enterpriseJobdescriptiondetailpage.interviewProcess")}
                    {job.rounds.length} {t("common.ring")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {job.rounds.map((round, index) => (
                      <div
                        key={round.id || index}
                        className="flex gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0047AB]/10 text-[#0047AB]">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {round.name ||
                                t("common.roundVar0", {
                                  var_0: index + 1,
                                })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getRoundTypeIcon(round.roundType)}
                              <span className="ml-1">
                                {round.roundType?.replace("_", " ") || t("common.notDetermined")}
                              </span>
                            </Badge>
                          </div>
                          <div className="mb-2 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <span>
                              {t("enterpriseJobdescriptiondetailpage.order")}{" "}
                              {round.roundOrder || index + 1}
                            </span>
                            {round.passThreshold && (
                              <span>
                                {t("enterpriseJobdescriptiondetailpage.passingScore")}{" "}
                                {round.passThreshold}%
                              </span>
                            )}
                            {round.configData?.timeLimitMinutes && (
                              <span>
                                {t("enterpriseJobdescriptiondetailpage.time")}{" "}
                                {round.configData.timeLimitMinutes} {t("common.minute")}
                              </span>
                            )}
                          </div>
                          {round.configData?.instruction && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {round.configData.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            <Button
              onClick={handleApply}
              disabled={isApplying || job.status !== "OPEN" || isApplicationActive}
              className={`w-full text-white ${isApplicationActive || job.status !== "OPEN" ? "cursor-not-allowed bg-green-600 hover:bg-green-600" : !isLoggedIn ? "cursor-not-allowed bg-slate-400 hover:bg-slate-500" : "bg-[#0047AB] hover:bg-[#003d8f]"}`}
              size="lg">
              {isApplying ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("common.processing")}
                </>
              ) : isApplicationActive ? (
                t("enterpriseJobdescriptiondetailpage.applied")
              ) : existingApplication ? (
                t("enterpriseJobdescriptiondetailpage.reapply")
              ) : job.status !== "OPEN" ? (
                t("enterpriseJobdescriptiondetailpage.recruitmentHasBeenClosed")
              ) : !isLoggedIn ? (
                t("enterpriseJobdescriptiondetailpage.loginToApply")
              ) : (
                t("enterpriseJobdescriptiondetailpage.applyNow")
              )}
            </Button>

            {/* Job Overview */}
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("enterpriseJobdescriptiondetailpage.recruitmentInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("common.rank")}
                  </span>
                  <Badge className={getLevelBadgeColor(job.level)}>
                    {job.level || t("common.notDetermined")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("common.salary")}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("enterpriseJobdescriptiondetailpage.location")}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {job.location || t("common.hoChiMinh")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("common.submissionDeadline")}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatDate(job.deadlineAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t("enterpriseJobdescriptiondetailpage.numberOfApplicants")}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {job.appliedCount || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("enterpriseJobdescriptiondetailpage.requiredSkills")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="dark:border-slate-600">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Info */}
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("enterpriseJobdescriptiondetailpage.companyInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0047AB]/10">
                    <Briefcase className="h-6 w-6 text-[#0047AB]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {job.companyName ||
                        t("enterpriseJobdescriptiondetailpage.recruitmentCompany")}
                    </p>
                    {job.companyId && (
                      <Link
                        to={`/enterprise/company/${job.companyId}`}
                        className="text-xs text-[#0047AB] hover:underline dark:text-[#66B2FF]">
                        {t("enterpriseJobdescriptiondetailpage.viewCompany")}
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
