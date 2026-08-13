import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { type JobDescription } from "@/services/company.manager";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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

function formatSalaryRaw(min?: number, max?: number) {
  if (min && max) {
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  }
  if (min) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryFrom")} ${formatNumber(min)}`;
  }
  if (max) {
    return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryUpTo")} ${formatNumber(max)}`;
  }
  return i18n.t("common.negotiate");
}

function formatDate(dateStr?: string) {
  if (!dateStr) return i18n.t("common.noDeadline", "Không có thời hạn");
  return format(new Date(dateStr), "dd/MM/yyyy");
}

function getCompanyInitials(name?: string) {
  if (!name) return "IB";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "IB"
  );
}

const STANDARD_ROUND_NAMES = [
  "Lọc CV",
  "CV Screening",
  "CVスクリーニング",
  "Mô phỏng Email",
  "Email Simulator",
  "メールシミュレーター",
  "Trắc nghiệm",
  "Quiz",
  "クイズ",
  "Lập trình",
  "Coding",
  "コーディング",
  "Đánh giá Code",
  "Code Review",
  "コードレビュー",
  "Đánh giá Mentor",
  "Mentor Interview",
  "Mentor Review",
  "メンター面接",
  "Phỏng vấn AI",
  "AI Interview",
  "AI面接",
];

function getRoundTypeLabel(type?: string, t?: ReturnType<typeof useTranslation>["t"]) {
  if (!type) return t ? t("common.notDetermined", "Chưa xác định") : "Not Determined";
  const normalized = type.replace("MENTROR", "MENTOR");
  if (t) {
    const translated = t(`common.roundType.${normalized}`);
    if (translated && translated !== `common.roundType.${normalized}`) {
      return translated;
    }
  }
  return normalized.replace(/_/g, " ");
}

function getStandardRoundTitle(
  name?: string,
  type?: string,
  t?: ReturnType<typeof useTranslation>["t"]
) {
  if (type) {
    const typeLabel = getRoundTypeLabel(type, t);
    if (!name || STANDARD_ROUND_NAMES.includes(name.trim())) {
      return typeLabel;
    }
  }
  return name || (t ? t("common.roundVar0", { var_0: 1 }) : "Round");
}

interface JobDetailViewProps {
  job: JobDescription;
  hasPurchased: boolean;
  hasApplied?: boolean;
  onApplyAction: () => void;
  isLoadingAction: boolean;
  isLoadingStatus?: boolean;
  onBack?: () => void;
}

export function JobDetailView({
  job,
  hasPurchased,
  hasApplied = false,
  onApplyAction,
  isLoadingAction,
  isLoadingStatus = false,
  onBack,
}: JobDetailViewProps) {
  const { t } = useTranslation();
  const isJobOpen = job.status?.toUpperCase() === "OPEN";

  const renderActionButton = () => {
    if (!isJobOpen) {
      return (
        <Button
          disabled
          className="w-full rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {job.status === "CLOSED"
            ? t("enterpriseJobdescriptiondetailpage.jobClosed", "Đã đóng tuyển dụng")
            : t("enterpriseJobdescriptiondetailpage.draft1", "Bản nháp")}
        </Button>
      );
    }

    if (isLoadingStatus) {
      return (
        <Button
          disabled
          className="w-full rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {t("common.checking", "Đang kiểm tra...")}
        </Button>
      );
    }

    if (hasPurchased) {
      return (
        <Button
          onClick={onApplyAction}
          disabled={isLoadingAction}
          className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          {isLoadingAction
            ? t("common.processing", "Đang xử lý...")
            : hasApplied
              ? t("enterpriseJobdescriptiondetailpage.applyNow", "Apply ngay")
              : t("enterpriseJobdescriptiondetailpage.applyNow", "Apply ngay")}
        </Button>
      );
    }

    return (
      <Button
        onClick={onApplyAction}
        disabled={isLoadingAction}
        className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
        {isLoadingAction
          ? t("common.processing", "Đang xử lý...")
          : t("payment.buyPackage", "Mua gói")}
      </Button>
    );
  };

  const jobExtra = job as JobDescription & {
    thumbnailUrl?: string;
    companyLogoUrl?: string;
    companyLogo?: string;
    logoUrl?: string;
    company?: { logoUrl?: string; logo?: string; avatarUrl?: string };
  };
  const logoUrl =
    jobExtra.companyLogo ||
    jobExtra.companyLogoUrl ||
    jobExtra.logoUrl ||
    jobExtra.thumbnailUrl ||
    jobExtra.company?.logoUrl ||
    jobExtra.company?.logo ||
    jobExtra.company?.avatarUrl ||
    null;
  const initials = getCompanyInitials(job.companyName);

  return (
    <div className="flex flex-col pb-20">
      {/* 2-column grid: left = 7 cols, right = 5 cols for balanced ratio */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Left column (hero + content sections) ── */}
        <div className="space-y-6 lg:col-span-7">
          {/* Hero Card — compact */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Back row — ultra-thin, inside the card */}
            {onBack && (
              <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800/50">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("general.back", "Quay lại danh sách")}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start xl:flex-row xl:justify-between">
              {/* Logo + Info */}
              <div className="flex flex-1 items-start gap-4">
                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-indigo-100 bg-indigo-50 text-xl font-bold text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-400">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={job.companyName || "Company"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
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

                  <h1 className="mb-0.5 text-xl leading-snug font-extrabold text-slate-900 dark:text-white">
                    {job.title || t("enterpriseJobdescriptiondetailpage.recruitmentPosition")}
                  </h1>
                  <Link
                    to={job.companyId ? `/enterprise/company/${job.companyId}` : "#"}
                    className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    {job.companyName || t("enterpriseJobdescriptiondetailpage.recruitmentCompany")}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Banknote className="h-4 w-4" />
                      {formatSalaryRaw(job.salaryMin, job.salaryMax)}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {job.location || t("common.hoChiMinh")}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      HSD: {formatDate(job.deadlineAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment / Apply — inline right */}
              <div className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:w-[200px] dark:border-indigo-900/50 dark:bg-indigo-950/25">
                {job.status === "OPEN" && (
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-[15px] font-extrabold tracking-tight whitespace-nowrap text-amber-600 dark:text-amber-400">
                      {typeof job?.price === "number" && job.price > 0
                        ? `${formatNumber(job.price)} VND`
                        : typeof job?.price === "number" && job.price === 0
                          ? t("common.free", "Miễn phí")
                          : "99.000 VND"}
                    </span>
                  </div>
                )}
                {renderActionButton()}
              </div>
            </div>
          </div>

          {/* Job Details Big Card Container */}
          <div className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Description */}
            <section>
              <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Briefcase className="h-4 w-4" />
                </div>
                {t("common.jobDescription")}
              </h2>
              <div className="prose prose-slate prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">
                  {job.description || t("enterpriseJobdescriptiondetailpage.noJobDescriptionYet")}
                </p>
              </div>
            </section>

            <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />

            {/* Requirements */}
            <section>
              <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                {t("common.candidateRequirements")}
              </h2>
              <div className="prose prose-slate prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">
                  {job.requirements ||
                    t("enterpriseJobdescriptiondetailpage.thereAreNoSpecificRequirements")}
                </p>
              </div>

              {job.skills && job.skills.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("enterpriseJobdescriptiondetailpage.requiredSkills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="rounded-lg border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />

            {/* Benefits */}
            <section>
              <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                {t("common.welfare")}
              </h2>
              <div className="prose prose-slate prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">
                  {job.benefits ||
                    t("enterpriseJobdescriptiondetailpage.thereIsNoBenefitInformation")}
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* ── Right column (Pipeline — starts at the top, 5 cols) ── */}
        <div className="lg:col-span-5">
          <div className="sticky top-4 flex min-h-[440px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <Clock className="h-4 w-4" />
                </div>
                {t("enterpriseJobdescriptiondetailpage.interviewProcess")}
                <span className="ml-auto inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-indigo-100 px-2 text-xs font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400">
                  {job.rounds?.length || 0}
                </span>
              </h2>

              {job.rounds && job.rounds.length > 0 ? (
                <div className="relative">
                  {/* Connector line */}
                  <div className="absolute top-4 bottom-4 left-[15px] w-[2px] bg-gradient-to-b from-indigo-200 via-indigo-100 to-indigo-50 dark:from-indigo-800 dark:via-indigo-900 dark:to-indigo-950" />

                  <div className="space-y-1">
                    {job.rounds.map((round, index) => (
                      <div
                        key={round.id || index}
                        className="relative z-10 flex items-start gap-3.5 py-2.5">
                        {/* Node */}
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-extrabold text-white shadow-xs dark:bg-indigo-600">
                          {index + 1}
                        </div>

                        {/* Content row */}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {getStandardRoundTitle(round.name, round.roundType, t)}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <span className="text-indigo-500">
                                {getRoundTypeIcon(round.roundType)}
                              </span>
                              {getRoundTypeLabel(round.roundType, t)}
                            </span>
                          </div>
                          {(Boolean(round.passThreshold) ||
                            Boolean(round.configData?.timeLimitMinutes)) && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {Boolean(round.passThreshold) && (
                                <span>
                                  {t("enterpriseJobdetailpage.passingScore", "Điểm: ")}
                                  <strong className="font-bold text-slate-700 dark:text-slate-300">
                                    {round.passThreshold}%
                                  </strong>
                                </span>
                              )}
                              {Boolean(round.configData?.timeLimitMinutes) && (
                                <span>
                                  {t("enterpriseJobdetailpage.duration", "TG: ")}
                                  <strong className="font-bold text-slate-700 dark:text-slate-300">
                                    {round.configData?.timeLimitMinutes} {t("common.minute")}
                                  </strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t(
                      "enterpriseJobdetailpage.noInterviewProcess",
                      "Chưa cập nhật quy trình phỏng vấn."
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Tip box to balance card height */}
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{t("common.interviewTipTitle", "Lưu ý vòng phỏng vấn")}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed font-medium text-indigo-700 dark:text-indigo-400">
                {t(
                  "common.interviewTipDesc",
                  "Vui lòng hoàn thành lần lượt các vòng để hệ thống ghi nhận điểm và xuất báo cáo kết quả chi tiết."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
