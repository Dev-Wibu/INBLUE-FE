import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { formatDateTime } from "@/lib/formatting";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bold,
  Bot,
  CheckCircle2,
  Copy,
  Globe,
  Italic,
  Link2,
  List,
  Mail,
  Maximize2,
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
  /** When true, useEmailSubmission hook is disabled — staff reads data from detail */
  isStaffView?: boolean;
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
          bg: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20",
        }
      : {
          ring: "text-indigo-400",
          text: "text-indigo-400",
          bg: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-950/20",
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
            className="text-slate-200 dark:text-slate-800"
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
            className={`inline-flex items-baseline gap-0.5 font-black tracking-tight ${hasData ? styles.text : "text-slate-500"}`}>
            <span className="text-xl">{hasData ? displayScore : "--"}</span>
            {hasData && <span className="text-[9px] text-slate-500 dark:text-slate-400">/100</span>}
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
  isStaffView,
  onSuccess,
}: EmailSimulatorModuleProps) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detailRoundConfig = (detail as any)?.roundConfig;

  const [sampleBody, setSampleBody] = useState(() =>
    t("userApplication.emailSimulator.defaultSampleBody")
  );
  const [userWaiting, setUserWaiting] = useState(false);
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

  // Safely parse submissionData if string
  const parsedSubmissionData = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (detail as any)?.submissionData;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return { textContent: raw };
      }
    }
    return raw || {};
  }, [detail]);

  // 1. Lấy emailSubmissionId trực tiếp từ application detail object (GET /api/application-details/application/{applicationId})
  const emailSubmissionId: number | null =
    (detail as { emailSubmissionId?: number | null } | undefined)?.emailSubmissionId ??
    (parsedSubmissionData as { emailSubmissionId?: number | null } | undefined)
      ?.emailSubmissionId ??
    null;

  // 2. Nếu emailSubmissionId khác null/undefined, gọi GET /api/email-submissions/{id} để lấy kết quả chi tiết
  //    Staff view (read-only workspace) is allowed to call this API so the staff can see the
  //    candidate's submitted email body — this is the only extra API call permitted for
  //    the Email round on the staff detail page.
  const { data: emailSubmission } = useEmailSubmission(
    emailSubmissionId ?? 0,
    emailSubmissionId != null && emailSubmissionId > 0
  );

  // Auto-fetch email submission for preview modal when opened
  useEmailSubmission(previewEmailId ?? 0, previewOpen && previewEmailId != null);

  // 3. Tính toán Phase thuần túy (Derived State) dựa trên emailSubmissionId, emailSubmission và detail status
  const phase = useMemo<Phase>(() => {
    const detailStatus = detail?.status as string | undefined;

    // Nếu detail đã có kết quả hoặc đang được Staff rà soát/chấm điểm
    if (
      detail &&
      (detailStatus === "AI_EVALUATED" ||
        detailStatus === "COMPLETED" ||
        detailStatus === "SUBMITTED" ||
        detailStatus === "GRADING" ||
        detailStatus === "PASSED" ||
        detailStatus === "FAILED" ||
        detail?.hrScore !== undefined ||
        emailSubmissionId != null)
    ) {
      if (emailSubmission?.status === "IGNORED") {
        return {
          kind: "REJECTED",
          reason: "IGNORED",
          message:
            emailSubmission.errorMessage ||
            t("userApplication.emailSimulator.emailMissingSubjectCode"),
        };
      }
      if (emailSubmission?.status === "ERROR") {
        return {
          kind: "REJECTED",
          reason: "ERROR",
          message:
            emailSubmission.errorMessage || t("userApplication.emailSimulator.errorGradingEmail"),
        };
      }
      return { kind: "EMAIL_RECEIVED" };
    }

    // Nếu emailSubmissionId là null (hệ thống chưa ghi nhận/chưa quét được email)
    if (emailSubmissionId == null) {
      if (userWaiting) return { kind: "WAITING_FOR_FIRST_EMAIL" };
      return { kind: "DRAFT" };
    }

    // Khi emailSubmissionId khác null
    if (!emailSubmission) {
      return { kind: "PENDING" };
    }

    if (emailSubmission.status === "PENDING") {
      return { kind: "PENDING" };
    } else if (emailSubmission.status === "PROCESSED") {
      return { kind: "EMAIL_RECEIVED" };
    } else if (emailSubmission.status === "IGNORED") {
      return {
        kind: "REJECTED",
        reason: "IGNORED",
        message:
          emailSubmission.errorMessage ||
          t("userApplication.emailSimulator.emailMissingSubjectCode"),
      };
    } else if (emailSubmission.status === "ERROR") {
      return {
        kind: "REJECTED",
        reason: "ERROR",
        message:
          emailSubmission.errorMessage || t("userApplication.emailSimulator.errorGradingEmail"),
      };
    }

    return { kind: "DRAFT" };
  }, [detail, emailSubmissionId, emailSubmission, t, userWaiting]);

  // 4. Tự động poll refetch detail từ parent mỗi 5s nếu candidate đã bấm gửi (WAITING_FOR_FIRST_EMAIL) hoặc đang PENDING
  useEffect(() => {
    if (phase.kind !== "WAITING_FOR_FIRST_EMAIL" && phase.kind !== "PENDING") return;
    const interval = setInterval(() => {
      onSuccess?.();
    }, 5000);
    return () => clearInterval(interval);
  }, [phase.kind, onSuccess]);

  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const aiScoreVal = detail?.aiScore ?? finalScore ?? 0;

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
    // Guard: staff view is read-only on this page, no candidate actions allowed.
    if (isStaffView) return;
    // Không có submit endpoint — vòng này hoàn toàn dựa vào cronjob server quét email.
    // Chỉ chuyển phase sang WAITING để app bắt đầu poll trạng thái.
    toast.success(t("userApplication.emailSimulator.confirmEmailSent"));
    setUserWaiting(true);
    onSuccess?.();
  };

  const openGmailPopup = () => {
    // Guard: staff view is read-only on this page, no candidate actions allowed.
    if (isStaffView) return;
    // Chuyển phase sang WAITING để hệ thống bắt đầu poll kết quả từ application detail
    setUserWaiting(true);
    onSuccess?.();

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {phase.kind === "EMAIL_RECEIVED" || isCompleted
                  ? t("userApplication.emailSimulator.reportTitle")
                  : t("userApplication.emailSimulator.roundHeader")}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">
                {t("userApplication.emailSimulator.roundLabel")}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {phase.kind === "EMAIL_RECEIVED" || isCompleted
                ? t("userApplication.emailSimulator.emailCollectedMessage")
                : phase.kind === "PENDING" || phase.kind === "WAITING_FOR_FIRST_EMAIL"
                  ? t("userApplication.emailSimulator.backgroundScanningMessage")
                  : t("userApplication.emailSimulator.draftInstructions")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm shadow-rose-100 dark:text-rose-300 dark:shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>
                {detail.finalResult === "PASSED"
                  ? t("userApplication.emailSimulator.resultPassed")
                  : t("userApplication.emailSimulator.resultFailed")}
              </span>
            </span>
          ) : phase.kind === "PENDING" || phase.kind === "WAITING_FOR_FIRST_EMAIL" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold text-amber-700 shadow-sm shadow-amber-100 dark:text-amber-300 dark:shadow-amber-950/40">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{t("userApplication.emailSimulator.serverScanningBackground")}</span>
            </span>
          ) : phase.kind === "EMAIL_RECEIVED" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40">
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>{t("userApplication.emailSimulator.awaitingHrGrading")}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{t("userApplication.emailSimulator.readyToSendMail")}</span>
            </span>
          )}
        </div>
      </div>

      {phase.kind === "DRAFT" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <Card className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="space-y-2 border-b border-slate-200 pb-3.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                    TICKET #INC-{applicationId || 892}
                  </span>
                  <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-400 uppercase">
                    {t("userApplication.emailSimulator.highPriority")}
                  </span>
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 uppercase">
                    {t("userApplication.emailSimulator.clientEscalation")}
                  </span>
                </div>
                <h3 className="mt-1 text-sm leading-snug font-bold text-slate-900 dark:text-slate-100">
                  {detailRoundConfig?.instruction ||
                    round.configData?.instruction ||
                    t("userApplication.emailSimulator.emailInstructionDefault")}
                </h3>
              </div>

              <div className="space-y-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-inner dark:border-slate-800/80 dark:bg-slate-950/80">
                <div className="flex items-center gap-2 border-b border-indigo-200 pb-2 dark:border-indigo-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-extrabold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                    {t("userApplication.emailSimulator.scenarioContext")}
                  </span>
                </div>
                <div className="text-xs leading-relaxed font-normal whitespace-pre-line text-slate-700 dark:text-slate-200">
                  {detailRoundConfig?.evaluationCriteria ||
                    round.configData?.evaluationCriteria ||
                    t("userApplication.emailSimulator.emailCriteriaDefault")}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <Card className="relative space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-600">|</span>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                      {t("userApplication.emailSimulator.emailDraftingFramework")}
                    </h4>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                  ● {t("userApplication.emailSimulator.interactiveEditor")}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-14 font-mono text-[11px] font-bold text-slate-400 uppercase">
                      {t("userApplication.emailSimulator.sendTo")}
                    </span>
                    <code className="truncate font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                      {RECRUITER_EMAIL}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        RECRUITER_EMAIL,
                        t("userApplication.emailSimulator.recipient"),
                        "recipient"
                      )
                    }
                    className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-indigo-700 transition-all hover:bg-indigo-50 hover:text-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/60 dark:hover:text-white">
                    {copiedRecipient ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400">
                          {t("userApplication.emailSimulator.copied")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{t("userApplication.emailSimulator.copyText")}</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 shadow-inner dark:border-amber-500/40 dark:bg-amber-950/30">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-14 font-mono text-[11px] font-bold text-amber-400 uppercase">
                      {t("userApplication.emailSimulator.subjectLabel")}
                    </span>
                    <code className="truncate font-mono text-xs font-black text-amber-700 dark:text-amber-300">
                      {subjectToken}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        subjectToken,
                        t("userApplication.emailSimulator.subjectLabel"),
                        "subject"
                      )
                    }
                    className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-amber-700 transition-all hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50">
                    {copiedSubject ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold text-emerald-400">
                          {t("userApplication.emailSimulator.copied")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{t("userApplication.emailSimulator.copyCode")}</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-t-xl border-x border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Sans Serif
                    </span>
                    <span className="text-slate-600">|</span>
                    <Bold className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
                    <Italic className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
                    <List className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
                    <Link2 className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
                    <Paperclip className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {t("userApplication.emailSimulator.liveDraft")}
                  </span>
                </div>

                <Textarea
                  rows={13}
                  value={sampleBody}
                  onChange={(e) => setSampleBody(e.target.value)}
                  disabled={isCompleted || !isCurrent || isStaffView}
                  className="resize-y rounded-t-none rounded-b-xl border-x border-b border-slate-200 bg-white font-sans text-xs leading-relaxed text-slate-700 shadow-inner focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800/80">
                <Button
                  onClick={openGmailPopup}
                  disabled={isCompleted || !isCurrent || isStaffView}
                  className="h-9 gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-xs font-bold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-blue-500">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{t("userApplication.emailSimulator.openGmail")}</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* 👉 RIGHT SIDEBAR (25% - lg:col-span-3): Unified Assessment Guide & Profile */}
          <div className="space-y-4 lg:col-span-3">
            {/* Card 1: Executive Profile Card */}
            <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800/80">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t("userApplication.emailSimulator.candidatePosition")}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50 shadow-inner dark:border-indigo-500/20 dark:bg-slate-950">
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
                  <p className="truncate text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {jdInfo?.companyName ?? t("common.company")}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                    {jdInfo?.title ?? t("common.jobPosition")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 2: Unified Rules & Stepper Guide */}
            <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800/80 dark:bg-slate-900/90">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                    {t("userApplication.emailSimulator.imapLive")}
                  </h4>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {t("userApplication.emailSimulator.imapLive")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/70">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    {t("userApplication.emailSimulator.timeLimit")}
                  </span>
                  <span className="mt-1 block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {t("userApplication.emailSimulator.unlimitedTime")}
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-500/20 dark:bg-amber-950/20">
                  <span className="block text-[10px] font-bold text-amber-600 uppercase dark:text-amber-400">
                    {t("userApplication.emailSimulator.submissionLimit")}
                  </span>
                  <span className="mt-1 block text-xs font-extrabold text-amber-700 dark:text-amber-300">
                    {t("userApplication.emailSimulator.oneSubmissionOnly")}
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-3.5 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Send className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="tracking-wider uppercase">
                    {t("userApplication.emailSimulator.submitInstructions")}
                  </span>
                </div>

                <div className="relative space-y-3.5 pl-5 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-white dark:ring-slate-900">
                      1
                    </span>
                    <p className="text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                      {t("userApplication.emailSimulator.submitStep1")}
                    </p>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-white dark:ring-slate-900">
                      2
                    </span>
                    <div className="space-y-1 text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                      <p>
                        {t("userApplication.emailSimulator.submitStep2", {
                          email: RECRUITER_EMAIL,
                          subjectCode: subjectToken,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute top-0.5 -left-5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 font-mono text-[9px] font-bold text-white ring-4 ring-white dark:ring-slate-900">
                      3
                    </span>
                    <p className="text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                      {t("userApplication.emailSimulator.submitStep3")}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {(phase.kind === "WAITING_FOR_FIRST_EMAIL" || phase.kind === "PENDING") && (
        <Card className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
          <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/20 opacity-75" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-inner">
                <RefreshCw className="h-7 w-7 animate-spin" />
              </div>
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-extrabold text-amber-700 dark:text-amber-300">
                {t("userApplication.emailSimulator.backgroundSchedulerRunning")}
              </h3>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {t("userApplication.emailSimulator.backgroundSchedulerHint", {
                  subjectCode: subjectToken,
                })}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />{" "}
                {t("userApplication.emailSimulator.step1Confirmed")}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="flex animate-pulse items-center gap-1 text-amber-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />{" "}
                {t("userApplication.emailSimulator.step2ServerScanning")}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-500">
                {t("userApplication.emailSimulator.step3AiGrading")}
              </span>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "POLL_TIMEOUT" && (
        <Card className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-700 uppercase dark:text-amber-300">
                {t("userApplication.emailSimulator.timeoutTitle")}
              </h4>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {t("userApplication.emailSimulator.timeoutHint", {
                  email: RECRUITER_EMAIL,
                  subjectCode: subjectToken,
                })}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="h-9 gap-2 bg-amber-600 text-xs font-bold text-white hover:bg-amber-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("userApplication.emailSimulator.retryButton")}</span>
          </Button>
        </Card>
      )}

      {phase.kind === "REJECTED" && (
        <Card className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-700 uppercase dark:text-rose-300">
                {phase.reason === "IGNORED"
                  ? t("userApplication.emailSimulator.invalidEmailTitle")
                  : t("userApplication.emailSimulator.errorParsingEmailTitle")}
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {phase.message}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="h-9 gap-2 bg-rose-600 text-xs font-bold text-white hover:bg-rose-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("userApplication.emailSimulator.resendEmailButton")}</span>
          </Button>
        </Card>
      )}

      {phase.kind === "EMAIL_RECEIVED" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  <h3 className="text-xs font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                    {t("userApplication.emailSimulator.aiAnalysisReport")}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
                  <span>{t("userApplication.emailSimulator.emailEvaluated")}</span>
                </span>
              </div>

              <p className="text-sm leading-relaxed font-normal text-slate-700 dark:text-slate-200">
                {aiFeedback?.generalComment ||
                  t("userApplication.emailSimulator.emailCollectedSuccess")}
              </p>
            </Card>

            {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
              <Card className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                    {t("userApplication.emailSimulator.emailStrengths")}
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
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
              <Card className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                    {t("userApplication.emailSimulator.emailWeaknesses")}
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {aiFeedback.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  <h4 className="text-xs font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                    {t("userApplication.emailSimulator.hrDirectComment")}
                  </h4>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {t("userApplication.emailSimulator.hrEvaluation")}
                </span>
              </div>

              {detail?.hrNote ? (
                <div className="rounded-xl border-l-2 border-indigo-500 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 italic dark:bg-slate-950/60 dark:text-slate-200">
                  "{detail.hrNote}"
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate-400 italic">
                  {t("userApplication.emailSimulator.noHrNotePending")}
                </p>
              )}
            </Card>

            <Card className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800/80 dark:bg-slate-900/90">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                  {t("userApplication.emailSimulator.assignmentAndSituation")}
                </h4>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs leading-relaxed font-bold text-slate-900 dark:text-slate-100">
                  {detailRoundConfig?.instruction ||
                    round.configData?.instruction ||
                    t(
                      "userApplication.emailSimulator.emailInstructionDefault",
                      "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng."
                    )}
                </p>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs leading-relaxed font-medium whitespace-pre-line text-slate-900 shadow-inner dark:border-indigo-500/30 dark:bg-slate-950/90 dark:text-slate-100">
                  {detailRoundConfig?.evaluationCriteria ||
                    round.configData?.evaluationCriteria ||
                    t(
                      "userApplication.emailSimulator.emailCriteriaDefault",
                      "Nội dung tình huống được giao."
                    )}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t("userApplication.emailSimulator.matchScore")}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {t("userApplication.emailSimulator.aiVsHr", "AI vs HR")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ModernGaugeClock
                  score={aiScoreVal}
                  label={t("userApplication.emailSimulator.aiScore", "AI Score")}
                  color="indigo"
                  hasData={true}
                />
                <ModernGaugeClock
                  score={detail?.hrScore ?? 0}
                  label={t("userApplication.emailSimulator.hrScore", "HR Score")}
                  color="emerald"
                  hasData={detail?.hrScore != null && (detail?.hrScore ?? 0) > 0}
                />
              </div>
            </Card>

            {/* 📬 CANDIDATE SUBMITTED EMAIL CARD (Email App Client Style) */}
            <Card className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-md transition-all dark:border-indigo-900/50 dark:bg-slate-900">
              {/* Card Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold tracking-wider text-slate-900 uppercase dark:text-slate-100">
                      {t("userApplication.emailSimulator.candidateEmailWork")}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t("userApplication.emailSimulator.imapCollectedEmail")}
                    </p>
                  </div>
                </div>
                {emailSubmissionId != null && emailSubmissionId > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewEmailId(emailSubmissionId);
                      setPreviewOpen(true);
                    }}
                    className="h-7 gap-1.5 border-indigo-300 bg-indigo-50 px-2.5 text-[11px] font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60">
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>{t("userApplication.emailSimulator.viewPopupDetail")}</span>
                  </Button>
                )}
              </div>

              {/* Email Content Body */}
              <div className="space-y-3 p-4">
                {/* Meta Box */}
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800/60">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-14 font-mono text-[10px] font-bold text-slate-400 uppercase">
                        {t("userApplication.emailSimulator.fromLabel")}
                      </span>
                      <span className="truncate font-mono font-bold text-indigo-600 dark:text-indigo-300">
                        {emailSubmission?.senderEmail ||
                          parsedSubmissionData?.senderEmail ||
                          t("common.candidate")}
                      </span>
                    </div>
                    {(emailSubmission?.receivedAt || emailSubmission?.createdAt) && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {formatDateTime(emailSubmission.receivedAt || emailSubmission.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-14 font-mono text-[10px] font-bold text-slate-400 uppercase">
                      {t("userApplication.emailSimulator.subjectLabel")}
                    </span>
                    <span className="truncate font-mono font-extrabold text-amber-600 dark:text-amber-400">
                      {emailSubmission?.subject ||
                        parsedSubmissionData?.subject ||
                        `[INBLUE-APP-${applicationId}]`}
                    </span>
                  </div>
                </div>

                {/* Email Reader Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    <span>{t("userApplication.emailSimulator.emailContentLabel")}</span>
                    <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-500 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />{" "}
                      {t("userApplication.emailSimulator.imapCapturedBody")}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                    <pre className="max-h-60 overflow-y-auto font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                      {emailSubmission?.bodyText ||
                        parsedSubmissionData?.textContent ||
                        parsedSubmissionData?.body ||
                        t("userApplication.emailSimulator.emailSystemRecorded")}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {aiFeedback?.extraMetrics && Object.keys(aiFeedback.extraMetrics).length > 0 && (
              <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-md backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                      {t("userApplication.emailSimulator.gradingCriteriaDetailed")}
                    </h4>
                  </div>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                    {t("userApplication.emailSimulator.criteriaCount", {
                      count: Object.keys(aiFeedback.extraMetrics).length,
                    })}
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

                      let badgeStyle =
                        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300";
                      let barStyle = "bg-gradient-to-r from-indigo-500 to-blue-500";

                      if (pct >= 80) {
                        badgeStyle =
                          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
                        barStyle = "bg-gradient-to-r from-emerald-500 to-teal-400";
                      } else if (pct < 50) {
                        badgeStyle =
                          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
                        barStyle = "bg-gradient-to-r from-amber-500 to-rose-500";
                      }

                      return (
                        <div
                          key={key}
                          className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-inner dark:border-slate-800/80 dark:bg-slate-950/70">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {key}
                            </span>
                            <span
                              className={`rounded-md border px-2 py-0.5 font-mono text-xs font-extrabold ${badgeStyle}`}>
                              {score}
                              {maxScore > 0 ? `/${maxScore}` : ""}
                            </span>
                          </div>

                          {maxScore > 0 && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barStyle}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}

                          {comment && (
                            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                              {comment}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-950/70">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {key}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
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
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-white px-5 py-3.5 shadow-2xl ring-1 shadow-slate-950/60 ring-emerald-500/20 backdrop-blur-xl">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/20" />
              <Globe className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {t("userApplication.emailSimulator.popupOpenGmail")}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {t("userApplication.emailSimulator.popupHint")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                popupRef.current?.close();
                setPopupLaunched(false);
              }}
              className="ml-2 h-7 w-7 shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
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
