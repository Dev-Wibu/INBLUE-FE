import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useEmailSubmission, useEmailSubmissionsForApplication } from "@/hooks/useEmailSubmission";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
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

// Real flow (per CANDIDATE_EMAIL_ROUND_API_GUIDE.md):
//   1. Candidate reads the task + scenario in the app.
//   2. Candidate sends the email from their Gmail/Outlook to the recruiter
//      inbox. The subject MUST contain [INBLUE-APP-{appId}].
//   3. Candidate clicks "I sent the email" → FE POSTs
//      /api/application-details/submit. Backend then polls IMAP and once the
//      real email arrives, it sets the EmailSubmission status to PROCESSED
//      and creates an ApplicationDetail with status = AI_EVALUATED.
//   4. FE polls /api/email-submissions every 10s and stops once we hit a
//      terminal status.
const RECRUITER_EMAIL = "hanptse184261@fpt.edu.vn";
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per backend cron

type Phase =
  | { kind: "DRAFT" }
  | { kind: "WAITING_FOR_FIRST_EMAIL" } // submitted, no email_submission yet
  | { kind: "PENDING" } // email_submission PENDING, IMAP not yet picked up
  | { kind: "EMAIL_RECEIVED" } // PROCESSED, AI score is now available
  | { kind: "REJECTED"; reason: "IGNORED" | "ERROR"; message: string }
  | { kind: "POLL_TIMEOUT" };

export function EmailSimulatorModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: EmailSimulatorModuleProps) {
  const { t } = useTranslation();

  // Local-only "draft" of the email body. The actual submission is via Gmail,
  // so this is just a textarea helper for the candidate to compose offline.
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

  // Polling: list email submissions for this application. The hook auto-stops
  // polling once every submission reaches a terminal status.
  const { data: emails = [], dataUpdatedAt } = useEmailSubmissionsForApplication(
    applicationId,
    isCurrent || isCompleted
  );

  const latest = emails[0] as EmailSubmission | undefined;

  // Drill-down hook for the preview dialog (opens only when the candidate
  // clicks "View full email"). The fetched record is consumed by the dialog
  // via its own prop; we keep the hook here so the dialog mounts/unmounts.
  useEmailSubmission(previewEmailId ?? 0, previewOpen && previewEmailId != null);

  // EmailSubmission id from either:
  //   • `latest.id` when the candidate has access to /api/email-submissions
  //   • `detail.submissionData.emailSubmissionId` as a fallback (always present
  //     once detail is created; doesn't depend on email-submissions access).
  const emailSubmissionId: number | null =
    latest?.id ??
    (detail?.submissionData as { emailSubmissionId?: number | null } | undefined)
      ?.emailSubmissionId ??
    null;

  // Decide phase. We have TWO signals:
  //   • `detail` (ApplicationDetail) — preferred, comes from the parent's
  //     `details` array which is keyed by round.id. Its `status` tells us
  //     whether AI grading has finished (AI_EVALUATED / COMPLETED).
  //   • `latest` (EmailSubmission) — only available for admins/staff; we use
  //     it as a fallback to detect IGNORED/ERROR while the detail is still
  //     SUBMITTED.
  // Why both: at one moment `detail` may say AI_EVALUATED but the candidate's
  // EmailSubmission row is still PENDING because the BE hasn't updated it
  // yet. We must NOT regress the UI back to DRAFT in that race window.
  useEffect(() => {
    const detailStatus = detail?.status as string | undefined;

    // 1) Detail already has a graded outcome → show results immediately.
    if (detail && (detailStatus === "AI_EVALUATED" || detailStatus === "COMPLETED")) {
      // Surface sub-status from EmailSubmission if present (e.g. IGNORED).
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

    // 2) No graded detail yet — fall back to EmailSubmission state.
    if (!latest) {
      // No submission row yet. If the candidate just submitted, we should
      // already be in WAITING_FOR_FIRST_EMAIL; otherwise stay in DRAFT.
      if (phase.kind === "WAITING_FOR_FIRST_EMAIL") return;
      if (phase.kind !== "DRAFT") setPhase({ kind: "DRAFT" });
      return;
    }
    if (latest.status === "PENDING") {
      if (phase.kind !== "PENDING") setPhase({ kind: "PENDING" });
    } else if (latest.status === "PROCESSED") {
      // Email is in but detail not yet graded — show waiting.
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

  // Poll timeout watchdog: 5 minutes after the candidate clicks submit and
  // we still have no terminal status, surface a clear message.
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

  // Render the value of an extraMetrics cell — handles string/number/boolean
  // AND the richer `{ score, comment, maxScore }` shape used for graded
  // criteria (see EmailMetricsConstant).
  const renderMetricValue = (
    v: string | number | boolean | { score?: number; comment?: string; maxScore?: number }
  ): React.ReactNode => {
    if (typeof v === "object" && v !== null) {
      const score = v.score ?? 0;
      const max = v.maxScore ?? 0;
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {score}
            {max > 0 && <span className="ml-1 text-sm font-normal text-slate-400">/{max}</span>}
          </span>
          {v.comment && (
            <span className="max-w-[280px] text-right text-xs leading-snug text-slate-500 italic dark:text-slate-400">
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
      // textContent is the "what we're submitting" payload. Backend ignores
      // the body for the EMAIL round — it actually reads from IMAP — but we
      // still send a structured JSON so the FE-only draft is preserved for
      // debugging in DB.
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
        toast.success(t("userApplicationhistory.emailSubmitted", "Đã gửi yêu cầu chấm"));
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

  // ──────────────────────────── helpers ────────────────────────────
  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success(t("common.copied", "Đã sao chép") + ` ${label}`);
    });
  };

  return (
    <div className="space-y-5">
      {/* =============================================================== */}
      {/*  TASK + SCENARIO                                                 */}
      {/* =============================================================== */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90">
          <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {t("userApplicationhistory.emailTaskTitle", "Đề bài (Task)")}
          </h4>
          <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
            {round.configData?.instruction ||
              t(
                "userApplicationhistory.emailInstructionDefault",
                "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng theo đúng chuẩn mực giao tiếp công sở."
              )}
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-4 shadow-2xs dark:border-indigo-800/40 dark:bg-indigo-950/30">
          <h4 className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
            {t("userApplicationhistory.emailScenarioTitle", "Tình huống")}
          </h4>
          <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
            {round.configData?.evaluationCriteria ||
              t(
                "userApplicationhistory.emailInstructionDefault",
                "Email từ cấp trên / khách hàng — đóng vai ứng viên phản hồi chuyên nghiệp, đề xuất giải pháp."
              )}
          </p>
        </div>
      </div>

      {/* "Cách gửi" + "Nội dung mẫu" chỉ hiển thị khi candidate chưa làm gì.
          Khi đã nộp/chờ/có kết quả thì ẩn đi cho gọn. */}
      {phase.kind === "DRAFT" && (
        <>
          {/* =============================================================== */}
          {/*  HOW TO SEND — 5 steps + copyable To / Subject token             */}
          {/* =============================================================== */}
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <Send className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                {t("userApplicationhistory.emailHowToTitle", "Cách gửi email")}
              </h4>
            </div>
            <ol className="space-y-3 px-5 py-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  1
                </span>
                {t("userApplicationhistory.emailHowToStep1", "Mở Gmail/Outlook và soạn email mới")}
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  2
                </span>
                <span>{t("userApplicationhistory.emailHowToStep2", "Gửi tới địa chỉ:")}</span>
                <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {RECRUITER_EMAIL}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(RECRUITER_EMAIL, "địa chỉ")}
                  className="h-6 gap-1 px-2 text-[10px] font-semibold text-slate-500 hover:text-indigo-600">
                  <Copy className="h-3 w-3" />
                  {t("userApplicationhistory.emailCopyAddress", "Sao chép địa chỉ")}
                </Button>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  3
                </span>
                <span>{t("userApplicationhistory.emailHowToStep3", "Subject phải có mã:")}</span>
                <code className="rounded-md bg-amber-50 px-2 py-0.5 font-mono font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  {subjectToken}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(subjectToken, "mã subject")}
                  className="h-6 gap-1 px-2 text-[10px] font-semibold text-slate-500 hover:text-indigo-600">
                  <Copy className="h-3 w-3" />
                  {t("userApplicationhistory.emailCopyToken", "Sao chép mã subject")}
                </Button>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  4
                </span>
                {t(
                  "userApplicationhistory.emailHowToStep4",
                  "Nội dung: viết theo tình huống ở trên"
                )}
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  5
                </span>
                {t(
                  "userApplicationhistory.emailHowToStep5",
                  'Quay lại đây, bấm "Tôi đã gửi email"'
                )}
              </li>
            </ol>
          </Card>

          {/* =============================================================== */}
          {/*  SAMPLE BODY (tham khảo) + open Gmail button                     */}
          {/* =============================================================== */}
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                {t("userApplicationhistory.emailSampleBodyTitle", "Nội dung mẫu (tham khảo)")}
              </h4>
              <a
                href={mailtoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-indigo-700">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("userApplicationhistory.emailOpenGmail", "Mở Gmail với nội dung mẫu")}
              </a>
            </div>
            <div className="p-5">
              <p className="mb-2 text-[11px] text-slate-500 italic dark:text-slate-400">
                {t(
                  "userApplicationhistory.emailSampleBodyHint",
                  "Bạn có thể dùng nội dung dưới đây làm tham khảo. Email thật vẫn phải gửi từ Gmail/Outlook."
                )}
              </p>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    To
                  </span>
                  <code className="font-mono text-slate-700 dark:text-slate-300">
                    {RECRUITER_EMAIL}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Subject
                  </span>
                  <code className="font-mono font-bold text-amber-800 dark:text-amber-300">
                    {subjectToken}
                  </code>
                </div>
                <Textarea
                  rows={8}
                  value={sampleBody}
                  onChange={(e) => setSampleBody(e.target.value)}
                  disabled={isCompleted || !isCurrent}
                  className="resize-y border-slate-200 bg-white text-xs leading-relaxed focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>
          </Card>
        </>
      )}

      {/* =============================================================== */}
      {/*  SUBMIT + POST-SUBMIT STATE                                      */}
      {/* =============================================================== */}
      {!isCompleted && isCurrent && phase.kind === "DRAFT" && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs hover:bg-indigo-700">
            {submitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>{t("common.sending", "Đang gửi...")}</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>
                  {t("userApplicationhistory.emailAiResubmit", "Tôi đã gửi email, nộp bài chấm")}
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* After submit: WAITING_FOR_FIRST_EMAIL | PENDING | EMAIL_RECEIVED | REJECTED | POLL_TIMEOUT */}
      {(phase.kind === "WAITING_FOR_FIRST_EMAIL" || phase.kind === "PENDING") && (
        <Card className="border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="flex items-start gap-3 p-5">
            <Spinner size="md" tone="primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {t(
                  "userApplicationhistory.emailWaitingForImap",
                  "Đang chờ hệ thống nhận email từ hộp thư đến"
                )}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-indigo-800/80 dark:text-indigo-300/80">
                {t(
                  "userApplicationhistory.emailWaitingForImapHint",
                  "Quy trình quét IMAP chạy mỗi 1–5 phút. Nếu quá lâu, hãy kiểm tra bạn đã gửi đúng địa chỉ + subject chứa mã [INBLUE-APP-{{appId}}] chưa.",
                  { appId: applicationId }
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "POLL_TIMEOUT" && (
        <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t("userApplicationhistory.emailImapTimedOut", "Quá thời gian chờ poll (5 phút)")}
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-8 gap-1.5 border-amber-300 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-300">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("userApplicationhistory.emailAiResend", "Tôi muốn gửi lại email")}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "REJECTED" && (
        <Card className="border-rose-300 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                {phase.reason === "IGNORED"
                  ? t(
                      "userApplicationhistory.emailStatusIgnored",
                      "Email không hợp lệ (thiếu mã [INBLUE-APP-…])"
                    )
                  : t("userApplicationhistory.emailStatusError", "Có lỗi. Vui lòng liên hệ admin")}
              </p>
              {phase.message && (
                <p className="mt-1 text-[11px] leading-relaxed text-rose-800/80 dark:text-rose-300/80">
                  {phase.message}
                </p>
              )}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-8 gap-1.5 border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-300">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("userApplicationhistory.emailAiResend", "Tôi muốn gửi lại email")}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* =============================================================== */}
      {/*  AI GRADING RESULT (after PROCESSED)                             */}
      {/* =============================================================== */}
      {phase.kind === "EMAIL_RECEIVED" && (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                {t("userApplicationhistory.emailStatusProcessed", "Đã chấm xong — chờ Staff duyệt")}
              </h4>
            </div>
            {finalScore != null && (
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {t("userApplicationhistory.emailAiScore", "Điểm AI")}: {finalScore}/100
              </span>
            )}
          </div>

          <div className="space-y-4 p-5">
            {/* "Email you sent" — read-only Gmail-style preview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("userApplicationhistory.emailAlreadySent", "Email bạn đã gửi")}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t(
                      "userApplicationhistory.emailAlreadySentHint",
                      "Hệ thống đã nhận được email dưới đây. Bạn có thể mở rộng để xem lại nội dung trước khi AI chấm."
                    )}
                  </p>
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
                  className="h-8 gap-1.5 border-slate-200 bg-white text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400">
                  <Mail className="h-3.5 w-3.5" />
                  {t("userApplicationhistory.emailViewFull", "Xem đầy đủ email")}
                </Button>
              </div>
              {latest && (latest.senderEmail || latest.subject) && (
                <div className="mt-3 grid gap-1.5 text-xs">
                  {latest.senderEmail && (
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        From
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {latest.senderEmail}
                      </span>
                    </div>
                  )}
                  {latest.subject && (
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Subject
                      </span>
                      <span className="truncate font-semibold text-slate-900 dark:text-white">
                        {latest.subject}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {!latest && emailSubmissionId != null && (
                <p className="mt-3 text-[11px] text-slate-500 italic dark:text-slate-400">
                  {t(
                    "userApplicationhistory.emailPreviewAvailable",
                    'Bấm "Xem đầy đủ email" để xem nội dung email bạn đã gửi.'
                  )}
                </p>
              )}
            </div>

            {/* AI feedback */}
            {aiFeedback && (
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                  {t("userApplicationhistory.emailAiFeedbackTitle", "Nhận xét từ AI")}
                </h5>
                {aiFeedback.generalComment && (
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {aiFeedback.generalComment}
                  </p>
                )}
                {(aiFeedback.strengths?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                      {t("userApplicationhistory.emailAiStrengths", "Điểm mạnh")}
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700 dark:text-slate-300">
                      {aiFeedback.strengths!.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(aiFeedback.weaknesses?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold tracking-wider text-rose-600 uppercase dark:text-rose-400">
                      {t("userApplicationhistory.emailAiWeaknesses", "Điểm yếu")}
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700 dark:text-slate-300">
                      {aiFeedback.weaknesses!.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiFeedback.extraMetrics && Object.keys(aiFeedback.extraMetrics).length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      {t("userApplicationhistory.emailAiExtraMetrics", "Tiêu chí chấm điểm")}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(aiFeedback.extraMetrics).map(([k, v]) => (
                            <tr
                              key={k}
                              className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                              <td className="bg-slate-50/50 px-4 py-3 font-medium text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                                {k}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                                {renderMetricValue(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Staff grading (HR final score + note + final result) */}
      {(detail as { hrScore?: number | null } | undefined)?.hrScore !== undefined ||
      (detail as { hrNote?: string | null } | undefined)?.hrNote ? (
        <Card className="space-y-4 border border-indigo-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/40 p-6 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-sky-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {t("userApplicationhistory.emailStaffGradingTitle")}
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              {detail?.finalScore !== undefined && detail.finalScore !== null && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-extrabold text-emerald-700 tabular-nums dark:bg-emerald-950/60 dark:text-emerald-300">
                  ✓ {detail.finalScore}/100
                </span>
              )}
              {(detail as { finalResult?: string | null }).finalResult && (
                <span
                  className={`rounded-full px-3 py-1 font-extrabold tracking-wider uppercase ${
                    (detail as { finalResult?: string }).finalResult === "PASSED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}>
                  {(detail as { finalResult?: string }).finalResult}
                </span>
              )}
            </div>
          </div>

          {(detail as { hrScore?: number | null }).hrScore !== undefined &&
            (detail as { hrScore?: number | null }).hrScore !== null && (
              <div className="rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-900/40 dark:bg-slate-900/40">
                <h4 className="mb-1 text-[10px] font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  {t("userApplicationhistory.emailStaffScore")}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-indigo-700 tabular-nums dark:text-indigo-300">
                    {(detail as { hrScore?: number }).hrScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/100</span>
                </div>
              </div>
            )}

          {(detail as { hrNote?: string | null }).hrNote && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
              <h4 className="mb-1 text-[11px] font-extrabold tracking-wider text-sky-700 uppercase dark:text-sky-300">
                {t("userApplicationhistory.emailStaffNote")}
              </h4>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {(detail as { hrNote?: string }).hrNote}
              </p>
            </div>
          )}
        </Card>
      ) : null}

      {/* Candidate already completed this round (read-only view) */}
      {isCompleted && phase.kind !== "EMAIL_RECEIVED" && (
        <Card className="border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 p-4 text-xs text-slate-500 dark:text-slate-400">
            <Inbox className="h-4 w-4" />
            <span>
              {t(
                "userApplicationhistory.emailStatusNotFound",
                "Hệ thống chưa nhận được email. Vòng này chưa hoàn tất."
              )}
            </span>
          </div>
        </Card>
      )}

      {/* Dialog showing the candidate's email in Gmail-style */}
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
