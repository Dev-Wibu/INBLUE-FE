import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { type JobDescription } from "@/services/company.manager";
import {
  AlertCircle,
  Banknote,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format } from "date-fns";

function getLevelBadgeColor(level?: string) {
  switch (level?.toUpperCase()) {
    case "INTERN":
      return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40";
    case "FRESHER":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40";
    case "JUNIOR":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40";
    case "MIDDLE":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

function getStatusColor(status?: string) {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
    case "CLOSED":
      return { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-500" };
    default:
      return { dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" };
  }
}

function getStatusBadgeColor(status?: string) {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40";
    case "CLOSED":
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
  }
}

const ROUND_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  CV_SCREENING: { label: "CV Screening", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  EMAIL_SIMULATOR: { label: "Email Simulator", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
  QUIZ: { label: "Quiz", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  DB_DESIGN: { label: "DB Design", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
  AI_INTERVIEW: { label: "AI Interview", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  CODING: { label: "Coding", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
};

function getRoundTypeIcon(type?: string) {
  switch (type?.toUpperCase()) {
    case "CV_SCREENING": return <Users className="h-3.5 w-3.5" />;
    case "EMAIL_SIMULATOR": return <Briefcase className="h-3.5 w-3.5" />;
    case "QUIZ": return <Zap className="h-3.5 w-3.5" />;
    case "DB_DESIGN": return <AlertCircle className="h-3.5 w-3.5" />;
    case "AI_INTERVIEW": return <Bot className="h-3.5 w-3.5" />;
    default: return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function formatSalaryRaw(min?: number, max?: number) {
  if (min && max) return `${formatNumber(min)} – ${formatNumber(max)}`;
  if (min) return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryFrom")} ${formatNumber(min)}`;
  if (max) return `${i18n.t("enterpriseJobdescriptiondetailpage.salaryUpTo")} ${formatNumber(max)}`;
  return i18n.t("common.negotiate");
}

function formatDate(dateStr?: string) {
  if (!dateStr) return i18n.t("common.noDeadline", "Không có thời hạn");
  return format(new Date(dateStr), "dd/MM/yyyy");
}

interface JobDetailViewProps {
  job: JobDescription;
  hasPurchased: boolean;
  onApplyAction: () => void;
  isLoadingAction: boolean;
}

export function JobDetailView({ job, hasPurchased, onApplyAction, isLoadingAction }: JobDetailViewProps) {
  const { t } = useTranslation();
  const logoUrl = (job as any).companyLogo || (job as any).thumbnailUrl || (job as any).companyLogoUrl || null;
  const statusColor = getStatusColor(job.status);

  const renderActionButton = () => {
    if (job.status !== "OPEN") {
      return (
        <Button disabled size="sm" className="w-full bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
          {job.status === "CLOSED" ? t("enterpriseJobdescriptiondetailpage.jobClosed", "Đã đóng tuyển dụng") : t("enterpriseJobdescriptiondetailpage.draft1", "Bản nháp")}
        </Button>
      );
    }
    if (hasPurchased) {
      return (
        <Button onClick={onApplyAction} disabled={isLoadingAction} size="sm" className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
          {isLoadingAction ? t("common.processing", "Đang xử lý...") : "Vào làm bài ngay"}
        </Button>
      );
    }
    return (
      <Button onClick={onApplyAction} disabled={isLoadingAction} size="sm" className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
        {isLoadingAction ? t("common.processing", "Đang xử lý...") : "Thanh toán & Ứng tuyển"}
      </Button>
    );
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* ── Hero Header ── */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/40">
        {/* Top strip with company logo + title */}
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          {/* Logo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-indigo-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-indigo-400">
            {logoUrl ? (
              <img src={logoUrl} alt={job.companyName || "Company"} className="h-full w-full object-cover" />
            ) : (
              <span>{job.companyName?.slice(0, 2).toUpperCase() || "IB"}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Badges row */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {job.level && (
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getLevelBadgeColor(job.level)}`}>
                  {job.level}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeColor(job.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} />
                {job.status === "OPEN" ? t("enterpriseJobdescriptiondetailpage.currentlyRecruiting") : job.status === "CLOSED" ? t("enterpriseJobdescriptiondetailpage.closed") : t("common.draft1")}
              </span>
            </div>

            <h1 className="text-xl font-bold leading-snug text-slate-900 dark:text-white">
              {job.title || t("enterpriseJobdescriptiondetailpage.recruitmentPosition")}
            </h1>
            <Link
              to={job.companyId ? `/enterprise/company/${job.companyId}` : "#"}
              className="mt-0.5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              {job.companyName || t("enterpriseJobdescriptiondetailpage.recruitmentCompany")}
            </Link>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <Banknote className="h-4 w-4" />
                {formatSalaryRaw(job.salaryMin, job.salaryMax)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location || t("common.hoChiMinh")}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                HSD: {formatDate(job.deadlineAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {job.appliedCount || 0} ứng viên
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar: fee + action */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-slate-800/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("payment.applicationFee", "Phí ứng tuyển")}:
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {typeof job?.price === "number" && job.price > 0
                ? `${formatNumber(job.price)} VND`
                : typeof job?.price === "number" && job.price === 0
                  ? t("common.free", "Miễn phí")
                  : "Liên hệ"}
            </span>
            {hasPurchased && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Đã thanh toán
              </span>
            )}
          </div>
          <div className="w-44">
            {renderActionButton()}
          </div>
        </div>
      </div>

      {/* ── Body: 2-column ── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Left: content sections */}
        <div className="space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800/50 dark:border-slate-800/60 dark:bg-slate-900/40">
          {/* Job Description */}
          <section className="px-6 py-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Briefcase className="h-4 w-4" />
              {t("common.jobDescription")}
            </h2>
            <div className="text-[14.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {job.description || t("enterpriseJobdescriptiondetailpage.noJobDescriptionYet")}
            </div>
          </section>

          {/* Requirements */}
          <section className="px-6 py-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="h-4 w-4" />
              {t("common.candidateRequirements")}
            </h2>
            <div className="text-[14.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {job.requirements || t("enterpriseJobdescriptiondetailpage.thereAreNoSpecificRequirements")}
            </div>

            {job.skills && job.skills.length > 0 && (
              <div className="mt-5">
                <p className="mb-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("enterpriseJobdescriptiondetailpage.requiredSkills")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Benefits */}
          <section className="px-6 py-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Zap className="h-4 w-4" />
              {t("common.welfare")}
            </h2>
            <div className="text-[14.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {job.benefits || t("enterpriseJobdescriptiondetailpage.thereIsNoBenefitInformation")}
            </div>
          </section>
        </div>

        {/* Right: Pipeline */}
        <div>
          <div className="sticky top-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/50">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Clock className="h-4 w-4 text-indigo-500" />
                {t("enterpriseJobdescriptiondetailpage.interviewProcess")}
                <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {job.rounds?.length || 0}
                </span>
              </h2>
            </div>

            <div className="p-5">
              {job.rounds && job.rounds.length > 0 ? (
                <ol className="space-y-0">
                  {job.rounds.map((round, index) => {
                    const meta = ROUND_TYPE_META[round.roundType?.toUpperCase() || ""] || {
                      label: round.roundType || t("common.notDetermined"),
                      color: "text-slate-600 dark:text-slate-400",
                      bg: "bg-slate-50 dark:bg-slate-800/40",
                    };
                    const isLast = index === job.rounds!.length - 1;

                    return (
                      <li key={round.id || index} className="flex gap-3">
                        {/* Spine */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${meta.bg} ${meta.color}`}>
                            {index + 1}
                          </div>
                          {!isLast && <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" style={{ minHeight: 20 }} />}
                        </div>

                        {/* Content */}
                        <div className={`min-w-0 flex-1 ${!isLast ? "pb-5" : "pb-1"}`}>
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                            <span className={meta.color}>{getRoundTypeIcon(round.roundType)}</span>
                            {round.name || t("common.roundVar0", { var_0: index + 1 })}
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>

                          <div className="mt-1.5 space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                            {Boolean(round.passThreshold) && (
                              <div>Điểm chuẩn: <strong className="text-slate-700 dark:text-slate-300">{round.passThreshold}%</strong></div>
                            )}
                            {Boolean(round.configData?.timeLimitMinutes) && (
                              <div>Thời gian: <strong className="text-slate-700 dark:text-slate-300">{round.configData?.timeLimitMinutes} {t("common.minute")}</strong></div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  Chưa cập nhật quy trình phỏng vấn.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
