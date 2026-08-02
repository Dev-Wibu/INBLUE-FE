import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEmailSubmission, useEmailSubmissionsForApplication } from "@/hooks/useEmailSubmission";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type EmailSubmission = components["schemas"]["EmailSubmission"];

interface EmailSimulatorModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

const RECRUITER_EMAIL = "hanptse184261@fpt.edu.vn";
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per backend cron

type Phase =
  | { kind: "DRAFT" }
  | { kind: "WAITING_FOR_FIRST_EMAIL" }
  | { kind: "PENDING" }
  | { kind: "EMAIL_RECEIVED" }
  | { kind: "REJECTED"; reason: "IGNORED" | "ERROR"; message: string }
  | { kind: "POLL_TIMEOUT" };

/** Linear/Stripe Style Modern Circular SVG Gauge Clock */
function ModernGaugeClock({
  score,
  label,
  color = "indigo",
  hasData = true,
}: {
  score: number;
  label: string;
  color?: "indigo" | "emerald";
  hasData?: boolean;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const displayScore = hasData ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const styles =
    color === "emerald"
      ? {
          ring: "text-emerald-400",
          text: "text-emerald-400",
          bg: "border-emerald-500/20 bg-emerald-950/20",
        }
      : {
          ring: "text-indigo-400",
          text: "text-indigo-400",
          bg: "border-indigo-500/20 bg-indigo-950/20",
        };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${styles.bg}`}>
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-800"
            fill="transparent"
          />
          {hasData && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className={`${styles.ring} transition-all duration-1000 ease-out`}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`text-xl font-black tracking-tight ${hasData ? styles.text : "text-slate-500"}`}>
            {hasData ? `${displayScore}%` : "--"}
          </span>
          <span className="text-[8px] font-extrabold tracking-wider text-slate-400 uppercase">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function EmailSimulatorModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: EmailSimulatorModuleProps) {
  const { t } = useTranslation();

  const [sampleBody, setSampleBody] = useState(
    "Kính gửi Anh/Chị,\n\nEm xin phép phản hồi email của Anh/Chị về vấn đề đang xảy ra...\n\nTrân trọng,\n[Tên của bạn]"
  );
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "DRAFT" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEmailId, setPreviewEmailId] = useState<number | null>(null);

  const subjectToken = `[INBLUE-APP-${applicationId}]`;
  const mailtoHref = useMemo(
    () =>
      `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(RECRUITER_EMAIL)}&su=${encodeURIComponent(subjectToken)}&body=${encodeURIComponent(sampleBody)}`,
    [sampleBody, subjectToken]
  );

  const { data: emails = [], dataUpdatedAt } = useEmailSubmissionsForApplication(
    applicationId,
    isCurrent || isCompleted
  );

  const latest = emails[0] as EmailSubmission | undefined;

  useEmailSubmission(previewEmailId ?? 0, previewOpen && previewEmailId != null);

  const emailSubmissionId: number | null =
    latest?.id ??
    (detail?.submissionData as { emailSubmissionId?: number | null } | undefined)
      ?.emailSubmissionId ??
    null;

  useEffect(() => {
    const detailStatus = detail?.status as string | undefined;

    if (detail && (detailStatus === "AI_EVALUATED" || detailStatus === "COMPLETED")) {
      if (latest?.status === "IGNORED") {
        setPhase({
          kind: "REJECTED",
          reason: "IGNORED",
          message: latest.errorMessage || "Email thiếu mã subject",
        });
        return;
      }
      if (latest?.status === "ERROR") {
        setPhase({
          kind: "REJECTED",
          reason: "ERROR",
          message: latest.errorMessage || "Có lỗi khi chấm email",
        });
        return;
      }
      if (phase.kind !== "EMAIL_RECEIVED") setPhase({ kind: "EMAIL_RECEIVED" });
      return;
    }

    if (!latest) {
      if (phase.kind === "WAITING_FOR_FIRST_EMAIL") return;
      if (phase.kind !== "DRAFT") setPhase({ kind: "DRAFT" });
      return;
    }
    if (latest.status === "PENDING" || latest.status === "PROCESSED") {
      if (phase.kind !== "PENDING") setPhase({ kind: "PENDING" });
    } else if (latest.status === "IGNORED") {
      setPhase({
        kind: "REJECTED",
        reason: "IGNORED",
        message: latest.errorMessage || "Email thiếu mã subject",
      });
    } else if (latest.status === "ERROR") {
      setPhase({
        kind: "REJECTED",
        reason: "ERROR",
        message: latest.errorMessage || "Có lỗi khi chấm email",
      });
    }
  }, [detail, latest, phase.kind]);

  useEffect(() => {
    if (phase.kind !== "WAITING_FOR_FIRST_EMAIL" && phase.kind !== "PENDING") return;
    if (!dataUpdatedAt) return;
    const remaining = POLL_TIMEOUT_MS - (Date.now() - dataUpdatedAt);
    if (remaining <= 0) {
      setPhase({ kind: "POLL_TIMEOUT" });
      return;
    }
    const id = setTimeout(() => setPhase({ kind: "POLL_TIMEOUT" }), remaining);
    return () => clearTimeout(id);
  }, [phase.kind, dataUpdatedAt]);

  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const aiScoreVal = detail?.aiScore ?? finalScore ?? 0;
  const hrScoreVal = detail?.hrScore ?? finalScore ?? 0;

  const aiFeedback = detail?.aiFeedback as
    | {
        generalComment?: string;
        strengths?: string[];
        weaknesses?: string[];
        extraMetrics?: Record<
          string,
          string | number | boolean | { score?: number; comment?: string; maxScore?: number }
        >;
      }
    | null
    | undefined;

  const renderMetricValue = (
    v: string | number | boolean | { score?: number; comment?: string; maxScore?: number }
  ): React.ReactNode => {
    if (typeof v === "object" && v !== null) {
      const score = v.score ?? 0;
      const max = v.maxScore ?? 0;
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-slate-100">
            {score}
            {max > 0 && <span className="ml-1 text-xs font-normal text-slate-400">/{max}</span>}
          </span>
          {v.comment && (
            <span className="max-w-[280px] text-right text-xs leading-snug text-slate-400 italic">
              {v.comment}
            </span>
          )}
        </div>
      );
    }
    return String(v);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = JSON.stringify({
        to: RECRUITER_EMAIL,
        subject: subjectToken,
        body: sampleBody,
        sentAt: new Date().toISOString(),
      });
      const res = await applicationDetailManager.submit({
        applicationId,
        textContent: payload,
      });
      if (res.success) {
        toast.success(
          t("userApplicationhistory.emailSubmitted", "Đã phát tín hiệu nộp bài thành công")
        );
        setPhase({ kind: "WAITING_FOR_FIRST_EMAIL" });
        onSuccess?.();
      } else {
        toast.error(res.error || "Gửi yêu cầu chấm thất bại");
      }
    } catch (err) {
      console.error("[EmailSimulatorModule] Submit error:", err);
      toast.error("Có lỗi xảy ra khi nộp bài");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success(t("common.copied", "Đã sao chép") + ` ${label}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* 🌟 Single Unified Top Recruitment Storyline Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                {phase.kind === "EMAIL_RECEIVED" || isCompleted
                  ? "BÁO CÁO ĐÁNH GIÁ MÔ PHỎNG EMAIL"
                  : "VÒNG 2: MÔ PHỎNG EMAIL • TRẠM LÀM BÀI"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">Vòng 2</span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">
              {phase.kind === "EMAIL_RECEIVED" || isCompleted
                ? "Email ứng viên đã được CronJob thu thập và AI hoàn tất chấm điểm giao tiếp công sở."
                : phase.kind === "PENDING" || phase.kind === "WAITING_FOR_FIRST_EMAIL"
                  ? "CronJob Server đang quét tự động hộp thư đến IMAP để thu thập bài làm của bạn..."
                  : "Gửi email trực tiếp từ Gmail/Outlook của bạn tới hệ thống nhà tuyển dụng theo mã định danh duy nhất."}
            </p>
          </div>
        </div>

        {/* Dynamic Action Status Pill */}
        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-300 shadow-sm shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>KẾT QUẢ: {detail.finalResult}</span>
            </span>
          ) : phase.kind === "PENDING" || phase.kind === "WAITING_FOR_FIRST_EMAIL" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm shadow-amber-950/40">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>CRONJOB ĐANG QUÉT MAIL</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>SẴN SÀNG GỬI MAIL</span>
            </span>
          )}
        </div>
      </div>

      {/* 📐 MAIN STUDIO CONTENT */}
      {phase.kind === "DRAFT" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* 👈 LEFT COLUMN (45% - lg:col-span-5): Recruiter Target & Step-by-Step Hub */}
          <div className="space-y-5 lg:col-span-5">
            {/* TASK & SCENARIO CARD */}
            <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-md backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t("userApplicationhistory.emailTaskTitle", "Đề bài (Task)")}
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  {round.configData?.instruction ||
                    t(
                      "userApplicationhistory.emailInstructionDefault",
                      "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng theo đúng chuẩn mực giao tiếp công sở."
                    )}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                  {t("userApplicationhistory.emailScenarioTitle", "Tình huống giao tiếp")}
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {round.configData?.evaluationCriteria ||
                    t(
                      "userApplicationhistory.emailInstructionDefault",
                      "Email từ cấp trên / khách hàng — đóng vai ứng viên phản hồi chuyên nghiệp, đề xuất giải pháp."
                    )}
                </p>
              </div>
            </Card>

            {/* RECRUITER TARGET ADDRESS & SUBJECT TOKEN CARD */}
            <Card className="space-y-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-900/90 p-5 shadow-lg shadow-indigo-950/20 backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-3">
                <Send className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-extrabold tracking-wider text-indigo-300 uppercase">
                  ĐỊA CHỈ NHẬN BÀI & MÃ ĐỊNH DANH
                </h4>
              </div>

              {/* Step 1: Destination Email */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300">
                  1. Gửi tới địa chỉ Email Nhà tuyển dụng:
                </span>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <code className="font-mono text-xs font-bold text-indigo-300">
                    {RECRUITER_EMAIL}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(RECRUITER_EMAIL, "Địa chỉ email")}
                    className="h-7 gap-1 px-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white">
                    <Copy className="h-3.5 w-3.5" />
                    <span>Sao chép</span>
                  </Button>
                </div>
              </div>

              {/* Step 2: Subject Token */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300">
                  2. Tiêu đề (Subject) BẮT BUỘC chứa mã định danh:
                </span>
                <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/40 p-2.5">
                  <code className="font-mono text-xs font-black text-amber-300">
                    {subjectToken}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(subjectToken, "Mã subject")}
                    className="h-7 gap-1 px-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-900/50">
                    <Copy className="h-3.5 w-3.5" />
                    <span>Sao chép mã</span>
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">
                  ⚠️ CronJob của Server dùng mã định danh này để gán email đúng vào bài thi của bạn.
                </p>
              </div>

              {/* Quick Action Button */}
              <a
                href={mailtoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-500">
                <ExternalLink className="h-4 w-4" />
                <span>Soạn nhanh bằng Gmail với mẫu sẵn</span>
              </a>
            </Card>
          </div>

          {/* 👉 RIGHT COLUMN (55% - lg:col-span-7): Interactive Live Drafter & Dispatcher */}
          <div className="space-y-5 lg:col-span-7">
            <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                    BẢN THẢO NỘI DUNG (THAM KHẢO & SOẠN BÀI)
                  </h4>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Draft Mode</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs">
                  <span className="w-16 font-bold text-slate-400 uppercase">Gửi tới:</span>
                  <code className="font-mono text-indigo-300">{RECRUITER_EMAIL}</code>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs">
                  <span className="w-16 font-bold text-slate-400 uppercase">Subject:</span>
                  <code className="font-mono font-bold text-amber-300">{subjectToken}</code>
                </div>

                <Textarea
                  rows={10}
                  value={sampleBody}
                  onChange={(e) => setSampleBody(e.target.value)}
                  disabled={isCompleted || !isCurrent}
                  className="resize-y rounded-xl border-slate-800 bg-slate-950 font-sans text-xs leading-relaxed text-slate-200 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <div className="text-[11px] text-slate-400">
                  <span>Sau khi đã bấm gửi email từ Gmail/Outlook của bạn:</span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || isCompleted || !isCurrent}
                  className="h-10 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-md hover:bg-indigo-500">
                  {submitting ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Đang kích hoạt CronJob...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Tôi đã gửi email, kích hoạt Robot chấm bài</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 📡 CRONJOB LIVE POLLING RADAR STATE (WAITING / PENDING) */}
      {(phase.kind === "WAITING_FOR_FIRST_EMAIL" || phase.kind === "PENDING") && (
        <Card className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/20 opacity-75" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-inner">
                <RefreshCw className="h-7 w-7 animate-spin" />
              </div>
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-extrabold text-amber-300">
                ROBOT CRONJOB ĐANG QUÉT HỘP THƯ IMAP SERVER...
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Hệ thống tự động quét hộp thư mỗi 1–3 phút để thu thập email có mã{" "}
                <code className="font-mono font-bold text-amber-300">{subjectToken}</code>.
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-center gap-2 pt-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> 1. Đã phát tín hiệu
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="flex animate-pulse items-center gap-1 text-amber-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> 2. CronJob đang thu thập
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-500">3. AI Chấm điểm</span>
            </div>
          </div>
        </Card>
      )}

      {/* WATCHDOG TIMEOUT STATE */}
      {phase.kind === "POLL_TIMEOUT" && (
        <Card className="space-y-4 rounded-2xl border border-amber-500/50 bg-amber-950/30 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase">
                QUÁ THỜI GIAN CHỜ CRONJOB (5 PHÚT)
              </h4>
              <p className="text-xs leading-relaxed text-slate-300">
                Chưa tìm thấy email trong hệ thống. Vui lòng kiểm tra lại xem bạn đã gửi email tới
                đúng địa chỉ <code className="font-mono text-amber-300">{RECRUITER_EMAIL}</code> và
                tiêu đề có chứa mã <code className="font-mono text-amber-300">{subjectToken}</code>{" "}
                chưa.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-9 gap-2 bg-amber-600 text-xs font-bold text-white hover:bg-amber-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Kích hoạt quét lại lần nữa</span>
          </Button>
        </Card>
      )}

      {/* REJECTED / ERROR STATE */}
      {phase.kind === "REJECTED" && (
        <Card className="space-y-4 rounded-2xl border border-rose-500/50 bg-rose-950/30 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-300 uppercase">
                {phase.reason === "IGNORED"
                  ? "EMAIL KHÔNG HỢP LỆ (THIẾU MÃ SUBJECT)"
                  : "CÓ LỖI XẢY RA KHI PHÂN TÍCH EMAIL"}
              </h4>
              <p className="text-xs leading-relaxed text-slate-300">{phase.message}</p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-9 gap-2 bg-rose-600 text-xs font-bold text-white hover:bg-rose-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Thử gửi lại email khác</span>
          </Button>
        </Card>
      )}

      {/* 📊 RESULT STATE (EMAIL_RECEIVED / AI_EVALUATED) */}
      {phase.kind === "EMAIL_RECEIVED" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* 🧠 LEFT NARRATIVE COLUMN (60% - lg:col-span-7) */}
          <div className="space-y-5 lg:col-span-7">
            {/* AI Executive Summary Card */}
            <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-900/90 p-5 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-300" />
                  <h3 className="text-xs font-extrabold tracking-wider text-indigo-300 uppercase">
                    BÁO CÁO PHÂN TÍCH EMAIL TỪ AI
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-0.5 text-xs font-bold text-indigo-200">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                  <span>AI EVALUATED</span>
                </span>
              </div>

              <p className="text-sm leading-relaxed font-normal text-slate-200">
                {aiFeedback?.generalComment || "Email đã được thu thập và đánh giá thành công."}
              </p>
            </Card>

            {/* Strengths */}
            {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
              <Card className="space-y-3 rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-md">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                    Điểm mạnh trong Email
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-200">
                  {aiFeedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Weaknesses */}
            {aiFeedback?.weaknesses && aiFeedback.weaknesses.length > 0 && (
              <Card className="space-y-3 rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-md">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                    Điểm cần cải thiện
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-200">
                  {aiFeedback.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* HR Note */}
            {detail?.hrNote && (
              <Card className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-md">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <UserCheck className="h-4 w-4 text-indigo-300" />
                  <h4 className="text-xs font-bold tracking-wider text-indigo-300 uppercase">
                    NHẬN XÉT TRỰC TIẾP TỪ HỘI ĐỒNG HR
                  </h4>
                </div>
                <div className="rounded-xl border-l-2 border-indigo-500 bg-slate-950/60 p-3.5 text-sm leading-relaxed text-slate-200 italic">
                  "{detail.hrNote}"
                </div>
              </Card>
            )}
          </div>

          {/* 📊 RIGHT ANALYTICS COLUMN (40% - lg:col-span-5) */}
          <div className="space-y-5 lg:col-span-5">
            {/* Dual Gauge Score Clocks */}
            <Card className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-200">Chỉ số Match Score</h4>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">AI vs HR</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ModernGaugeClock
                  score={aiScoreVal}
                  label="AI Score"
                  color="indigo"
                  hasData={true}
                />
                <ModernGaugeClock
                  score={hrScoreVal}
                  label="HR Score"
                  color="emerald"
                  hasData={true}
                />
              </div>
            </Card>

            {/* Candidate Sent Email Viewer Card */}
            <Card className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-200">Email đã thu thập</h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (emailSubmissionId != null) {
                      setPreviewEmailId(emailSubmissionId);
                      setPreviewOpen(true);
                    }
                  }}
                  disabled={emailSubmissionId == null}
                  className="h-7 gap-1 border-slate-700 bg-slate-800 text-[11px] font-semibold text-indigo-300 hover:bg-slate-700">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Xem đầy đủ</span>
                </Button>
              </div>

              {latest && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="w-12 text-[10px] font-bold text-slate-400 uppercase">
                      From:
                    </span>
                    <span className="truncate font-mono text-slate-200">{latest.senderEmail}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="w-12 text-[10px] font-bold text-slate-400 uppercase">
                      Subject:
                    </span>
                    <span className="truncate font-mono font-bold text-amber-300">
                      {latest.subject}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Extra Criteria Matrix */}
            {aiFeedback?.extraMetrics && Object.keys(aiFeedback.extraMetrics).length > 0 && (
              <Card className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-md">
                <span className="block border-b border-slate-800 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Tiêu chí chấm điểm chi tiết
                </span>

                <div className="divide-y divide-slate-800 text-xs">
                  {Object.entries(aiFeedback.extraMetrics).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between py-2">
                      <span className="font-medium text-slate-300">{k}</span>
                      {renderMetricValue(v)}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      <EmailPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewEmailId(null);
        }}
        emailSubmissionId={previewEmailId}
      />
    </div>
  );
}
