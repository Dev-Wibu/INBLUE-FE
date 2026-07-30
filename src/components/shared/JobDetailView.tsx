import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type JobDescription } from "@/services/company.manager";
import { format } from "date-fns";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function getLevelBadgeColor(level?: string) {
  switch (level?.toUpperCase()) {
    case "INTERN":
      return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/30";
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
      return <Users className="h-3.5 w-3.5" />;
    case "EMAIL_SIMULATOR":
      return <Briefcase className="h-3.5 w-3.5" />;
    case "QUIZ":
      return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    case "DB_DESIGN":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "AI_INTERVIEW":
      return <Bot className="h-3.5 w-3.5" />;
    default:
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function getRoundTypeName(type?: string): string {
  const map: Record<string, string> = {
    CV_SCREENING: "Lọc CV",
    EMAIL_SIMULATOR: "Mô phỏng Email",
    QUIZ: "Trắc nghiệm",
    DB_DESIGN: "Thiết kế DB",
    AI_INTERVIEW: "Phỏng vấn AI",
    CODING: "Lập trình",
    CODE_REVIEW: "Đánh giá Code",
    MENTOR_REVIEW: "Đánh giá Mentor",
  };
  return type ? (map[type.toUpperCase()] ?? type.replace(/_/g, " ")) : "Vòng thi";
}

function formatSalaryRaw(min?: number, max?: number) {
  if (min && max) return `${formatNumber(min)} - ${formatNumber(max)}`;
  if (min) return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryFrom")} ${formatNumber(min)}`;
  if (max) return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryUpTo")} ${formatNumber(max)}`;
  return i18n.t("common.negotiate");
}

function formatDate(dateStr?: string) {
  if (!dateStr) return i18n.t("common.noDeadline", "Không có thời hạn");
  return format(new Date(dateStr), "dd/MM/yyyy");
}

const CONTENT_TABS = ["description", "requirements", "benefits"] as const;
type ContentTab = (typeof CONTENT_TABS)[number];

interface JobDetailViewProps {
  job: JobDescription;
  hasPurchased: boolean;
  onApplyAction: () => void;
  isLoadingAction: boolean;
  onBack?: () => void;
}

export function JobDetailView({
  job,
  hasPurchased,
  onApplyAction,
  isLoadingAction,
  onBack,
}: JobDetailViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ContentTab>("description");

  const jobExtra = job as JobDescription & { thumbnailUrl?: string; companyLogoUrl?: string };
  const logoUrl = jobExtra.companyLogoUrl || jobExtra.thumbnailUrl || null;

  const tabLabel: Record<ContentTab, string> = {
    description: t("common.jobDescription", "Mô tả"),
    requirements: t("common.candidateRequirements", "Yêu cầu"),
    benefits: t("common.welfare", "Phúc lợi"),
  };

  const tabContent: Record<ContentTab, string | undefined> = {
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
  };

  const tabEmpty: Record<ContentTab, string> = {
    description: t(
      "enterpriseJobdescriptiondetailpage.noJobDescriptionYet",
      "Chưa có mô tả công việc."
    ),
    requirements: t(
      "enterpriseJobdescriptiondetailpage.thereAreNoSpecificRequirements",
      "Chưa có yêu cầu cụ thể."
    ),
    benefits: t(
      "enterpriseJobdescriptiondetailpage.thereIsNoBenefitInformation",
      "Chưa có thông tin phúc lợi."
    ),
  };

  const renderActionButton = () => {
    if (job.status !== "OPEN") {
      return (
        <Button
          disabled
          size="sm"
          className="h-9 rounded-lg bg-slate-100 px-5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {job.status === "CLOSED"
            ? t("enterpriseJobdescriptiondetailpage.jobClosed", "Đã đóng tuyển dụng")
            : t("enterpriseJobdescriptiondetailpage.draft1", "Bản nháp")}
        </Button>
      );
    }
    if (hasPurchased) {
      return (
        <Button
          onClick={onApplyAction}
          disabled={isLoadingAction}
          size="sm"
          className="h-9 rounded-lg bg-emerald-600 px-5 text-white hover:bg-emerald-700">
          {isLoadingAction
            ? t("common.processing", "Đang xử lý...")
            : t("enterpriseJobdetailpage.startTestNow", "Vào làm bài ngay")}
        </Button>
      );
    }
    return (
      <Button
        onClick={onApplyAction}
        disabled={isLoadingAction}
        size="sm"
        className="h-9 rounded-lg bg-indigo-600 px-5 text-white hover:bg-indigo-700">
        {isLoadingAction
          ? t("common.processing", "Đang xử lý...")
          : t("enterpriseJobdetailpage.payAndApply", "Ứng tuyển ngay")}
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* ── Hero / Header Card ─────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        {/* Back row — lightweight, inside the hero */}
        {onBack && (
          <div className="border-b border-slate-100 px-5 py-2.5 dark:border-slate-800/50">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("general.back", "Quay lại danh sách")}
            </button>
          </div>
        )}

        {/* Main hero content */}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
          {/* Logo */}
          <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/60">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={job.companyName || "Company"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-7 w-7 text-indigo-400" />
            )}
          </div>

          {/* Info block */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {job.level && (
                <Badge
                  className={cn(
                    "border px-2 py-0.5 text-[11px] font-semibold",
                    getLevelBadgeColor(job.level)
                  )}>
                  {job.level}
                </Badge>
              )}
              <Badge
                className={cn(
                  "border px-2 py-0.5 text-[11px] font-semibold",
                  getStatusBadgeColor(job.status)
                )}>
                {job.status === "OPEN"
                  ? t("enterpriseJobdescriptiondetailpage.currentlyRecruiting", "Đang tuyển")
                  : job.status === "CLOSED"
                    ? t("enterpriseJobdescriptiondetailpage.closed", "Đóng")
                    : t("common.draft1", "Nháp")}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-xl leading-snug font-extrabold text-slate-900 dark:text-white">
              {job.title || t("enterpriseJobdescriptiondetailpage.recruitmentPosition")}
            </h1>

            {/* Company */}
            <Link
              to={job.companyId ? `/enterprise/company/${job.companyId}` : "#"}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              <Building2 className="h-3.5 w-3.5" />
              {job.companyName || t("enterpriseJobdescriptiondetailpage.recruitmentCompany")}
            </Link>

            {/* Meta chips */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-500">
                <Banknote className="h-4 w-4" />
                {formatSalaryRaw(job.salaryMin, job.salaryMax)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {job.location || "Hồ Chí Minh"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                HSD: {formatDate(job.deadlineAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {job.appliedCount ?? 0} ứng viên
              </span>
            </div>
          </div>

          {/* Action panel — inline right */}
          <div className="flex shrink-0 flex-col items-end gap-2 sm:items-end">
            {/* Fee */}
            <div className="flex items-center gap-1.5 text-right">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-[15px] font-extrabold text-amber-600 dark:text-amber-500">
                {typeof job?.price === "number" && job.price > 0
                  ? `${formatNumber(job.price)} VND`
                  : t("common.free", "Miễn phí")}
              </span>
              {hasPurchased && (
                <Badge className="ml-1 border-emerald-500/20 bg-emerald-500/10 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {t("enterpriseJobdetailpage.paid", "Đã thanh toán")}
                </Badge>
              )}
            </div>
            {renderActionButton()}
          </div>
        </div>
      </div>

      {/* ── Main content: 2-column grid ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_288px]">
        {/* Left — tabbed content */}
        <div className="flex flex-col gap-0 rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          {/* Tab nav */}
          <div className="flex border-b border-slate-100 px-1 dark:border-slate-800/60">
            {CONTENT_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-5 py-3.5 text-[13.5px] font-semibold transition-colors",
                  activeTab === tab
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}>
                {tabLabel[tab]}
                {activeTab === tab && (
                  <span className="absolute right-3 bottom-0 left-3 h-[2px] rounded-t-full bg-indigo-600 dark:bg-indigo-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-300">
              {tabContent[activeTab] || tabEmpty[activeTab]}
            </p>

            {/* Skills — only show on requirements tab */}
            {activeTab === "requirements" && job.skills && job.skills.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800/60">
                <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {t("enterpriseJobdescriptiondetailpage.requiredSkills", "Kỹ năng yêu cầu")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="rounded-lg border-slate-200 bg-slate-50 px-3 py-1 text-[13px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — pipeline sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-bold text-slate-900 dark:text-white">
                <Clock className="h-4 w-4 text-indigo-500" />
                {t("enterpriseJobdescriptiondetailpage.interviewProcess", "Quy trình phỏng vấn")}
              </h2>
              {(job.rounds?.length ?? 0) > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                  {job.rounds!.length}
                </span>
              )}
            </div>

            {/* Pipeline */}
            {job.rounds && job.rounds.length > 0 ? (
              <div className="relative space-y-0">
                {job.rounds.map((round, index) => {
                  const isLast = index === job.rounds!.length - 1;
                  return (
                    <div key={round.id || index} className="relative flex gap-3">
                      {/* Connector line */}
                      {!isLast && (
                        <div className="absolute top-7 bottom-0 left-[13px] w-[1.5px] bg-indigo-100 dark:bg-indigo-950/80" />
                      )}

                      {/* Step node */}
                      <div className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-[11px] font-bold text-white shadow-sm dark:border-slate-900/60 dark:bg-indigo-600">
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className={cn("flex-1 pb-5", isLast && "pb-0")}>
                        <div className="text-[13.5px] font-bold text-slate-900 dark:text-white">
                          {round.name || getRoundTypeName(round.roundType)}
                        </div>

                        {/* Type chip */}
                        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <span className="text-indigo-500 dark:text-indigo-400">
                            {getRoundTypeIcon(round.roundType)}
                          </span>
                          {round.roundType?.replace(/_/g, " ") ||
                            t("common.notDetermined", "Chưa xác định")}
                        </div>

                        {/* Meta */}
                        <div className="mt-2 space-y-1 text-[12px] text-slate-400 dark:text-slate-500">
                          {Boolean(round.passThreshold) && (
                            <div className="flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              {t("enterpriseJobdetailpage.passingScore", "Điểm chuẩn: ")}
                              <strong className="text-slate-600 dark:text-slate-400">
                                {round.passThreshold}%
                              </strong>
                            </div>
                          )}
                          {Boolean(round.configData?.timeLimitMinutes) && (
                            <div className="flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              {t("enterpriseJobdetailpage.duration", "Thời gian: ")}
                              <strong className="text-slate-600 dark:text-slate-400">
                                {round.configData?.timeLimitMinutes} {t("common.minute", "phút")}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-[13px] text-slate-400 dark:text-slate-500">
                  {t(
                    "enterpriseJobdetailpage.noInterviewProcess",
                    "Chưa cập nhật quy trình phỏng vấn."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
