import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bold,
  Bot,
  CheckCircle2,
  Copy,
  Globe,
  Inbox,
  Italic,
  Link2,
  List,
  Mail,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";
import type { JdInfoPayload } from "../RoundWorkspaceDispatcher";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface EmailSimulatorModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdInfo?: JdInfoPayload | null;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

const RECRUITER_EMAIL = "hanptse184261@fpt.edu.vn";

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
  jdInfo,
  isCompleted,
  isCurrent,
  onSuccess,
}: EmailSimulatorModuleProps) {
  const { t } = useTranslation();

  const [sampleBody, setSampleBody] = useState(
    "Kính gửi Anh/Chị,\n\nEm xin phép phản hồi email của Anh/Chị về vấn đề đang xảy ra...\n\nTrân trọng,\n[Tên của bạn]"
  );
  const [phase, setPhase] = useState<Phase>({ kind: "DRAFT" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEmailId, setPreviewEmailId] = useState<number | null>(null);

  const [copiedRecipient, setCopiedRecipient] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [popupLaunched, setPopupLaunched] = useState(false);
  const popupRef = React.useRef<Window | null>(null);

  const subjectToken = `[INBLUE-APP-${applicationId}]`;
  const mailtoHref = useMemo(
    () =>
      `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(RECRUITER_EMAIL)}&su=${encodeURIComponent(subjectToken)}&body=${encodeURIComponent(sampleBody)}`,
    [sampleBody, subjectToken]
  );

  // 1. Lấy emailSubmissionId trực tiếp từ application detail object (GET /api/application-details/application/{applicationId})
  const emailSubmissionId: number | null =
    (detail as { emailSubmissionId?: number | null } | undefined)?.emailSubmissionId ??
    (detail?.submissionData as { emailSubmissionId?: number | null } | undefined)
      ?.emailSubmissionId ??
    null;

  // 2. Nếu emailSubmissionId khác null/undefined, gọi GET /api/email-submissions/{id} để lấy kết quả chi tiết
  const { data: emailSubmission } = useEmailSubmission(
    emailSubmissionId ?? 0,
    emailSubmissionId != null && emailSubmissionId > 0
  );

  // Auto-fetch email submission for preview modal when opened
  useEmailSubmission(previewEmailId ?? 0, previewOpen && previewEmailId != null);

  // 3. Tự động poll refetch detail từ parent mỗi 5s nếu candidate đã bấm gửi (WAITING_FOR_FIRST_EMAIL) hoặc đang PENDING
  useEffect(() => {
    if (phase.kind !== "WAITING_FOR_FIRST_EMAIL" && phase.kind !== "PENDING") return;
    const interval = setInterval(() => {
      onSuccess?.();
    }, 5000);
    return () => clearInterval(interval);
  }, [phase.kind, onSuccess]);

  // 4. Cập nhật Phase dựa trên emailSubmissionId, emailSubmission và detail status
  useEffect(() => {
    const detailStatus = detail?.status as string | undefined;

    // Nếu detail đã COMPLETED hoặc AI_EVALUATED
    if (detail && (detailStatus === "AI_EVALUATED" || detailStatus === "COMPLETED")) {
      if (emailSubmission?.status === "IGNORED") {
        if (phase.kind !== "REJECTED") {
          setPhase({
            kind: "REJECTED",
            reason: "IGNORED",
            message: emailSubmission.errorMessage || "Email thiếu mã subject",
          });
        }
        return;
      }
      if (emailSubmission?.status === "ERROR") {
        if (phase.kind !== "REJECTED") {
          setPhase({
            kind: "REJECTED",
            reason: "ERROR",
            message: emailSubmission.errorMessage || "Có lỗi khi chấm email",
          });
        }
        return;
      }
      if (phase.kind !== "EMAIL_RECEIVED") {
        setPhase({ kind: "EMAIL_RECEIVED" });
      }
      return;
    }

    // Nếu emailSubmissionId là null (hệ thống chưa ghi nhận/chưa quét được email)
    if (emailSubmissionId == null) {
      if (phase.kind === "WAITING_FOR_FIRST_EMAIL") return;
      if (phase.kind !== "DRAFT") setPhase({ kind: "DRAFT" });
      return;
    }

    // Khi emailSubmissionId khác null
    if (!emailSubmission) {
      if (phase.kind !== "PENDING" && phase.kind !== "EMAIL_RECEIVED") {
        setPhase({ kind: "PENDING" });
      }
      return;
    }

    if (emailSubmission.status === "PENDING") {
      if (phase.kind !== "PENDING") setPhase({ kind: "PENDING" });
    } else if (emailSubmission.status === "PROCESSED") {
      if (phase.kind !== "EMAIL_RECEIVED") setPhase({ kind: "EMAIL_RECEIVED" });
    } else if (emailSubmission.status === "IGNORED") {
      if (phase.kind !== "REJECTED") {
        setPhase({
          kind: "REJECTED",
          reason: "IGNORED",
          message: emailSubmission.errorMessage || "Email thiếu mã subject",
        });
      }
    } else if (emailSubmission.status === "ERROR") {
      if (phase.kind !== "REJECTED") {
        setPhase({
          kind: "REJECTED",
          reason: "ERROR",
          message: emailSubmission.errorMessage || "Có lỗi khi chấm email",
        });
      }
    }
  }, [detail, emailSubmissionId, emailSubmission, phase.kind]);

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

  const handleSubmit = () => {
    // Không có submit endpoint — vòng này hoàn toàn dựa vào cronjob server quét email.
    // Chỉ chuyển phase sang WAITING để app bắt đầu poll trạng thái.
    toast.success(t("userApplicationhistory.emailSubmitted", "Xác nhận đã gửi email thành công"));
    setPhase({ kind: "WAITING_FOR_FIRST_EMAIL" });
    onSuccess?.();
  };

  const openGmailPopup = () => {
    // Chuyển phase sang WAITING để hệ thống bắt đầu poll kết quả từ application detail
    if (phase.kind === "DRAFT") {
      setPhase({ kind: "WAITING_FOR_FIRST_EMAIL" });
      onSuccess?.();
    }
    // Đóng popup cũ nếu còn mở
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    const width = 1000;
    const height = 720;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`;
    const popup = window.open(mailtoHref, "gmail_compose_popup", features);
    if (popup) {
      popupRef.current = popup;
      setPopupLaunched(true);
      // Poll mỗi 500ms để detect khi user đóng popup
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          setPopupLaunched(false);
        }
      }, 500);
    }
  };

  const copyToClipboard = (text: string, label: string, type?: "recipient" | "subject") => {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success(t("common.copied", "Đã sao chép") + ` ${label}`);
      if (type === "recipient") {
        setCopiedRecipient(true);
        setTimeout(() => setCopiedRecipient(false), 2000);
      } else if (type === "subject") {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      }
    });
  };

  return (
    <div className="space-y-6">
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
                  : "VÒNG 2: MÔ PHỎNG EMAIL • TRẠM THI TRỰC TUYẾN"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">Vòng 2</span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">
              {phase.kind === "EMAIL_RECEIVED" || isCompleted
                ? "Email của bạn đã được hệ thống thu thập và AI hoàn tất chấm điểm giao tiếp công sở."
                : phase.kind === "PENDING" || phase.kind === "WAITING_FOR_FIRST_EMAIL"
                  ? "Hệ thống background scheduler trên Server đang tự động quét hộp thư IMAP để thu thập email của bạn..."
                  : "Đọc kỹ Đề bài & Tình huống bên dưới, sau đó gửi email trực tiếp từ Gmail/Outlook theo đúng mã định danh."}
            </p>
          </div>
        </div>

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
              <span>SERVER ĐANG QUÉT BACKGROUND</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>SẴN SÀNG GỬI MAIL</span>
            </span>
          )}
        </div>
      </div>

      {phase.kind === "DRAFT" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <Card className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg backdrop-blur-md">
              <div className="space-y-2 border-b border-slate-800 pb-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                    TICKET #INC-{applicationId || 892}
                  </span>
                  <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-400 uppercase">
                    HIGH PRIORITY
                  </span>
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 uppercase">
                    CLIENT ESCALATION
                  </span>
                </div>
                <h3 className="mt-1 text-sm leading-snug font-bold text-slate-100">
                  {round.configData?.instruction ||
                    "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng theo đúng chuẩn mực giao tiếp công sở."}
                </h3>
              </div>

              <div className="space-y-2.5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 p-4 shadow-inner">
                <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-extrabold tracking-wider text-amber-300 uppercase">
                    Tình Huống & Bối Cảnh (Scenario Context)
                  </span>
                </div>
                <div className="text-xs leading-relaxed font-normal whitespace-pre-line text-slate-200">
                  {round.configData?.evaluationCriteria ||
                    "Email từ cấp trên / khách hàng — đóng vai ứng viên phản hồi chuyên nghiệp, đề xuất giải pháp."}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <Card className="relative space-y-4 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/95 to-slate-900/95 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-600">|</span>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
                      KHUNG SOẠN EMAIL
                    </h4>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                  ● Interactive Editor
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 shadow-inner">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-14 font-mono text-[11px] font-bold text-slate-400 uppercase">
                      Gửi tới:
                    </span>
                    <code className="truncate font-mono text-xs font-extrabold text-indigo-300">
                      {RECRUITER_EMAIL}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(RECRUITER_EMAIL, "Địa chỉ email", "recipient")}
                    className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-indigo-300 transition-all hover:bg-indigo-950/60 hover:text-white">
                    {copiedRecipient ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2.5 shadow-inner">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-14 font-mono text-[11px] font-bold text-amber-400 uppercase">
                      Subject:
                    </span>
                    <code className="truncate font-mono text-xs font-black text-amber-300">
                      {subjectToken}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(subjectToken, "Mã subject", "subject")}
                    className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-amber-300 transition-all hover:bg-amber-900/50">
                    {copiedSubject ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400">Đã chép mã</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Sao chép mã</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-t-xl border-x border-t border-slate-800 bg-slate-950/90 px-3 py-1.5 text-slate-400">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-300">Sans Serif</span>
                    <span className="text-slate-600">|</span>
                    <Bold className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200" />
                    <Italic className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200" />
                    <List className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200" />
                    <Link2 className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200" />
                    <Paperclip className="h-3.5 w-3.5 cursor-pointer hover:text-slate-200" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">Live Draft</span>
                </div>

                <Textarea
                  rows={13}
                  value={sampleBody}
                  onChange={(e) => setSampleBody(e.target.value)}
                  disabled={isCompleted || !isCurrent}
                  className="resize-y rounded-t-none rounded-b-xl border-x border-b border-slate-800 bg-slate-950 font-sans text-xs leading-relaxed text-slate-200 shadow-inner focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end border-t border-slate-800/80 pt-4">
                <Button
                  onClick={openGmailPopup}
                  disabled={isCompleted || !isCurrent}
                  className="h-9 gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-xs font-bold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-blue-500">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Mở Gmail</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* 👉 RIGHT SIDEBAR (25% - lg:col-span-3): Unified Assessment Guide & Profile */}
          <div className="space-y-4 lg:col-span-3">
            {/* Card 1: Executive Profile Card */}
            <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-indigo-950/20 to-slate-900/90 p-4 shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  VỊ TRÍ ỨNG TUYỂN
                </span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                  #APP-{applicationId}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-500/20 bg-slate-950 shadow-inner">
                  {jdInfo?.logoUrl ? (
                    <img
                      src={jdInfo.logoUrl}
                      alt={jdInfo.companyName || "Logo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-extrabold text-indigo-400">
                      {jdInfo?.companyName?.slice(0, 2).toUpperCase() ?? "CO"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-100">
                    {jdInfo?.companyName ?? "Công ty"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-indigo-300">
                    {jdInfo?.title ?? "Vị trí ứng tuyển"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 2: Unified Rules & Stepper Guide */}
            <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
                    THÔNG TIN & QUY ĐỊNH
                  </h4>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  IMAP Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-2.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    THỜI GIAN
                  </span>
                  <span className="mt-1 block text-xs font-extrabold text-slate-200">
                    Không giới hạn
                  </span>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5">
                  <span className="block text-[10px] font-bold text-amber-400 uppercase">
                    LƯỢT NỘP
                  </span>
                  <span className="mt-1 block text-xs font-extrabold text-amber-300">
                    1 lần duy nhất
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-800/80 pt-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Send className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="tracking-wider uppercase">BƯỚC THỰC HIỆN NỘP BÀI</span>
                </div>

                <div className="relative space-y-3.5 pl-5 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-800">
                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-slate-900">
                      1
                    </span>
                    <p className="text-xs leading-relaxed font-medium text-slate-200">
                      Soạn email từ <strong>Gmail</strong> hoặc <strong>Outlook</strong> cá nhân.
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-slate-900">
                      2
                    </span>
                    <div className="space-y-1 text-xs leading-relaxed font-medium text-slate-200">
                      <p>
                        Gửi tới{" "}
                        <code className="font-mono font-bold text-indigo-300">
                          {RECRUITER_EMAIL}
                        </code>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Tiêu đề chứa mã{" "}
                        <code className="font-mono font-bold text-amber-300">{subjectToken}</code>
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-slate-900">
                      3
                    </span>
                    <p className="text-xs leading-relaxed font-medium text-slate-200">
                      Bấm nút <strong>"Mở Gmail"</strong> để soạn & gửi mail. Hệ thống sẽ tự động
                      chấm điểm khi nhận mail.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

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
                BACKGROUND SCHEDULER ĐANG CHẠY QUÉT MAIL...
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Hệ thống Server tự động quét định kỳ hộp thư IMAP để thu thập email gửi tới có mã{" "}
                <code className="font-mono font-bold text-amber-300">{subjectToken}</code>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> 1. Đã xác nhận gửi
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="flex animate-pulse items-center gap-1 text-amber-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> 2. Server đang quét IMAP
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-500">3. AI Chấm điểm</span>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "POLL_TIMEOUT" && (
        <Card className="space-y-4 rounded-2xl border border-amber-500/50 bg-amber-950/30 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase">
                QUÁ THỜI GIAN CHỜ BACKGROUND SCHEDULER (5 PHÚT)
              </h4>
              <p className="text-xs leading-relaxed text-slate-300">
                Hệ thống chưa tìm thấy email. Vui lòng kiểm tra xem bạn đã gửi email tới đúng địa
                chỉ <code className="font-mono text-amber-300">{RECRUITER_EMAIL}</code> và tiêu đề
                có chứa mã <code className="font-mono text-amber-300">{subjectToken}</code> chưa.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-9 gap-2 bg-amber-600 text-xs font-bold text-white hover:bg-amber-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Thử lại lần nữa</span>
          </Button>
        </Card>
      )}

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

      {phase.kind === "EMAIL_RECEIVED" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
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

            <Card className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-300" />
                  <h4 className="text-xs font-bold tracking-wider text-indigo-300 uppercase">
                    NHẬN XÉT TRỰC TIẾP TỪ HỘI ĐỒNG HR
                  </h4>
                </div>
                <span className="text-[10px] font-medium text-slate-400">HR ĐÁNH GIÁ</span>
              </div>

              {detail?.hrNote ? (
                <div className="rounded-xl border-l-2 border-indigo-500 bg-slate-950/60 p-3.5 text-sm leading-relaxed text-slate-200 italic">
                  "{detail.hrNote}"
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate-400 italic">
                  Chưa có ghi chú trực tiếp từ Hội đồng tuyển dụng HR. (Hệ thống sẽ cập nhật ngay
                  khi HR hoàn tất rà soát).
                </p>
              )}
            </Card>

            <Card className="space-y-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-md">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Target className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  ĐỀ BÀI & TÌNH HUỐNG BAN ĐẦU
                </h4>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs leading-relaxed font-bold text-slate-100">
                  {round.configData?.instruction ||
                    "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng."}
                </p>
                <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-950 to-slate-950 p-3.5 text-xs leading-relaxed font-normal whitespace-pre-line text-slate-300">
                  {round.configData?.evaluationCriteria || "Nội dung tình huống được giao."}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5 lg:col-span-5">
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
                  score={detail?.hrScore ?? 0}
                  label="HR Score"
                  color="emerald"
                  hasData={detail?.hrScore != null && (detail?.hrScore ?? 0) > 0}
                />
              </div>
            </Card>

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

              {emailSubmission && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="w-12 text-[10px] font-bold text-slate-400 uppercase">
                      From:
                    </span>
                    <span className="truncate font-mono text-slate-200">
                      {emailSubmission.senderEmail}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="w-12 text-[10px] font-bold text-slate-400 uppercase">
                      Subject:
                    </span>
                    <span className="truncate font-mono font-bold text-amber-300">
                      {emailSubmission.subject}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {aiFeedback?.extraMetrics && Object.keys(aiFeedback.extraMetrics).length > 0 && (
              <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
                      TIÊU CHÍ CHẤM ĐIỂM CHI TIẾT
                    </h4>
                  </div>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                    {Object.keys(aiFeedback.extraMetrics).length} Tiêu chí
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(aiFeedback.extraMetrics).map(([key, val]) => {
                    if (typeof val === "object" && val !== null) {
                      const score = val.score ?? 0;
                      const maxScore = val.maxScore ?? 0;
                      const comment = val.comment;
                      const pct =
                        maxScore > 0
                          ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)))
                          : 0;

                      let badgeStyle = "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
                      let barStyle = "bg-gradient-to-r from-indigo-500 to-blue-500";

                      if (pct >= 80) {
                        badgeStyle = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
                        barStyle = "bg-gradient-to-r from-emerald-500 to-teal-400";
                      } else if (pct < 50) {
                        badgeStyle = "border-amber-500/30 bg-amber-500/10 text-amber-300";
                        barStyle = "bg-gradient-to-r from-amber-500 to-rose-500";
                      }

                      return (
                        <div
                          key={key}
                          className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-100">{key}</span>
                            <span
                              className={`rounded-md border px-2 py-0.5 font-mono text-xs font-extrabold ${badgeStyle}`}>
                              {score}
                              {maxScore > 0 ? `/${maxScore}` : ""}
                            </span>
                          </div>

                          {maxScore > 0 && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barStyle}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}

                          {comment && (
                            <p className="text-[11px] leading-relaxed text-slate-300">{comment}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                        <span className="text-xs font-bold text-slate-100">{key}</span>
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 🌐 Gmail Popup Active Banner */}
      {popupLaunched && (
        <div className="animate-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 -translate-x-1/2 duration-300">
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-5 py-3.5 shadow-2xl ring-1 shadow-slate-950/60 ring-emerald-500/20 backdrop-blur-xl">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/20" />
              <Globe className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">Gmail đang mở trong cửa sổ riêng</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Hãy gửi email từ Gmail. Hệ thống sẽ tự động nhận diện và cập nhật kết quả.
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                popupRef.current?.close();
                setPopupLaunched(false);
              }}
              className="ml-2 h-7 w-7 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmailId != null && (
        <EmailPreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setPreviewEmailId(null);
          }}
          emailSubmissionId={previewEmailId}
        />
      )}
    </div>
  );
}
