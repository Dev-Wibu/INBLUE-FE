import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { $api } from "@/lib/api";
import { formatUtcNaiveDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileQuestion,
  Globe,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAiInterviewDomain,
  getAiInterviewJobTitle,
  getAiInterviewMode,
  hasAiInterviewScore,
} from "./ai-interview-history.utils";

export function AIInterviewResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      CREATED: t("common.created", "Mới tạo"),
      IN_PROGRESS: t("common.ongoing", "Đang diễn ra"),
      COMPLETED: t("general.completed", "Hoàn thành"),
      CANCELLED: t("common.canceled", "Đã hủy"),
    }),
    [t]
  );
  const resultLabels = useMemo<Record<string, string>>(
    () => ({
      STRONG_HIRE: t("common.excellent", "Xuất sắc"),
      HIRE: t("common.obtain", "Đạt"),
      CONSIDER: t("common.needToConsider", "Cân nhắc"),
      REJECT: t("common.failed", "Chưa đạt"),
    }),
    [t]
  );
  const modeLabels = useMemo<Record<string, string>>(
    () => ({
      STANDARD_MOCK: t("common.trialInterview", "Phỏng vấn thử"),
      THEORY_CHECK: t("common.testTheTheory", "Kiểm tra lý thuyết"),
      PROJECT_DEFENSE: t("common.projectProtection", "Bảo vệ dự án"),
    }),
    [t]
  );
  const difficultyLabels = useMemo<Record<string, string>>(
    () => ({
      FRESHER_BASIC: t("userAiinterview.basic", "Cơ bản"),
      FRESHER_ADVANCED: t("userAiinterview.advanced", "Nâng cao"),
    }),
    [t]
  );
  const languageLabels = useMemo<Record<string, string>>(
    () => ({
      VI: t("common.vietnamese", "Tiếng Việt"),
      EN: t("common.english", "Tiếng Anh"),
    }),
    [t]
  );

  const {
    data: session,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = $api.useQuery(
    "get",
    "/api/interview-sessions/{sessionId}",
    { params: { path: { sessionId } } },
    { enabled: Number.isInteger(sessionId) && sessionId > 0 }
  );

  if (isLoading) return <DetailSkeleton />;

  if (isError || !session) {
    return (
      <div className="w-full px-5 py-6 md:px-8">
        <div className="mx-auto flex min-h-80 max-w-3xl flex-col items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <AlertCircle className="h-9 w-9 text-rose-500" />
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {t("userAiinterview.unableToDownloadInterviewResults", "Không thể tải kết quả")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("userAiinterview.theInterviewSessionDoesNot", "Phiên phỏng vấn không tồn tại")}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/user?tab=aiInterview")}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToTheList", "Quay lại danh sách")}
          </Button>
        </div>
      </div>
    );
  }

  const mode = getAiInterviewMode(session);
  const domain = getAiInterviewDomain(session);
  const jobTitle = getAiInterviewJobTitle(session);
  const config = session.sessionConfig;
  const history = session.resultDetail?.history ?? [];
  const hasScore = hasAiInterviewScore(session);
  const shouldRefresh = session.status === "IN_PROGRESS" || !session.resultDetail;

  return (
    <div className="w-full px-5 py-6 pb-16 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/user?tab=aiInterview")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.backToTheList", "Quay lại danh sách")}
            </button>
            {shouldRefresh && session.status !== "CANCELLED" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRefetching}
                onClick={() => void refetch()}
                className="h-8 gap-2 rounded-lg text-xs font-bold">
                <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
                {t("common.reload", "Tải lại")}
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-5 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Bot className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t("userAiinterview.aiInterviewResults", "Kết quả phỏng vấn AI")} #{session.id}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                    {jobTitle ?? t("common.aiInterview", "Phỏng vấn AI")}
                  </h1>
                  <StatusBadge status={session.status} label={statusLabels[session.status ?? ""]} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                    {mode ? (modeLabels[mode] ?? mode) : t("common.aiInterview", "Phỏng vấn AI")}
                  </span>
                  {domain && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>{domain}</span>
                    </>
                  )}
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatUtcNaiveDateTime(session.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {session.status === "COMPLETED" && (
              <div className="flex shrink-0 items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("userAiinterview.overallScore", "Điểm tổng")}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {hasScore ? session.overallScore!.toFixed(1) : "—"}
                    <span className="ml-1 text-xs font-semibold text-slate-400">/100</span>
                  </p>
                </div>
                {session.result && (
                  <>
                    <span className="h-9 w-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {t("common.result", "Kết quả")}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                        {resultLabels[session.result] ?? session.result}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {session.status === "IN_PROGRESS" && (
          <Notice tone="amber" icon={Clock}>
            {t(
              "userAiinterview.gradingDescription",
              "Phiên phỏng vấn đang tiếp tục hoặc hệ thống đang xử lý kết quả."
            )}
          </Notice>
        )}
        {session.status === "CANCELLED" && (
          <Notice tone="rose" icon={AlertCircle}>
            {t("userAiinterview.thisSessionHasBeenCanceled", "Phiên phỏng vấn đã bị hủy.")}
          </Notice>
        )}
        {session.status === "COMPLETED" && !session.resultDetail && (
          <Notice tone="amber" icon={Clock}>
            {t(
              "userAiinterview.gradingInProgress",
              "Kết quả chi tiết chưa sẵn sàng. Vui lòng tải lại sau."
            )}
          </Notice>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {session.resultDetail?.aiOverviewFeedback && (
              <Section title={t("userAiinterview.generalComments", "Nhận xét tổng quan")}>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {session.resultDetail.aiOverviewFeedback}
                </p>
              </Section>
            )}

            {session.resultDetail?.improvementPlan && (
              <Section title={t("userAiinterview.improvementPlan", "Kế hoạch cải thiện")}>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {session.resultDetail.improvementPlan}
                </p>
              </Section>
            )}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("userAiinterview.transcriptTitle", "Câu hỏi và câu trả lời")}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {history.length} {t("userAiinterview.questionCountLabel", "câu hỏi")}
                  </p>
                </div>
                <FileQuestion className="h-5 w-5 text-indigo-500" />
              </div>

              {history.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((qa, index) => (
                    <TranscriptItem
                      key={`${qa.questionOrder ?? index}-${index}`}
                      qa={qa}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("userAiinterview.thereAreNoDetailedResults", "Chưa có kết quả chi tiết")}
                  </p>
                  <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t(
                      "userAiinterview.thisInterviewSessionHasNot",
                      "Phiên phỏng vấn chưa hoàn thành hoặc chưa được đánh giá."
                    )}
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <Section title={t("common.sessionInformation", "Thông tin phiên")}>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <InfoRow label={t("userAiinterview.regime", "Chế độ")}>
                  {mode ? (modeLabels[mode] ?? mode) : "—"}
                </InfoRow>
                <InfoRow label={t("userAiinterview.field", "Lĩnh vực")}>{domain ?? "—"}</InfoRow>
                <InfoRow label={t("userAiinterview.difficultyLevel", "Độ khó")}>
                  {config?.difficulty
                    ? (difficultyLabels[config.difficulty] ?? config.difficulty)
                    : "—"}
                </InfoRow>
                <InfoRow label={t("common.language", "Ngôn ngữ")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    {config?.language ? (languageLabels[config.language] ?? config.language) : "—"}
                  </span>
                </InfoRow>
                <InfoRow label={t("common.duration", "Thời lượng cấu hình")}>
                  {config?.duration_minutes
                    ? `${config.duration_minutes} ${t("common.minute", "phút")}`
                    : "—"}
                </InfoRow>
                <InfoRow label={t("userAiinterview.createAt", "Thời gian tạo")}>
                  {formatUtcNaiveDateTime(session.createdAt)}
                </InfoRow>
                <InfoRow label={t("general.completed", "Hoàn thành")}>
                  {session.completedAt ? formatUtcNaiveDateTime(session.completedAt) : "—"}
                </InfoRow>
                {session.applicationDetailId != null && (
                  <InfoRow label={t("common.application", "Đơn ứng tuyển")}>
                    #{session.applicationDetailId}
                  </InfoRow>
                )}
              </dl>
            </Section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full px-5 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-44 rounded-[20px]" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-xs font-semibold text-slate-800 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

function TranscriptItem({
  qa,
  index,
}: {
  qa: {
    questionType?: string | null;
    questionOrder?: number | null;
    questionText?: string | null;
    answerText?: string | null;
    feedback?: string | null;
    score?: number | null;
    suggestion?: string | null;
    behavioralWarnings?: string[] | null;
  };
  index: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const score = typeof qa.score === "number" && Number.isFinite(qa.score) ? qa.score : null;
  return (
    <article>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t("common.question", "Câu")}{" "}
              {qa.questionOrder != null ? qa.questionOrder + 1 : index + 1}
            </span>
            {qa.questionType && (
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[10px]">
                {qa.questionType === "FOLLOW_UP"
                  ? t("userAiinterview.nextSentence", "Câu hỏi tiếp theo")
                  : t("userAiinterview.mainSentence", "Câu hỏi chính")}
              </Badge>
            )}
          </div>
          <h3 className="text-sm leading-6 font-bold text-slate-900 dark:text-white">
            {qa.questionText ?? t("userAiinterview.questionHasNoContent", "Không có nội dung")}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
            {score != null ? `${score.toFixed(1)}/10` : "—"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/30">
          <div className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t("userAiinterview.yourAnswer", "Câu trả lời")}
            </p>
            <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {qa.answerText || "—"}
            </p>
          </div>

          {(qa.feedback || qa.suggestion) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {qa.feedback && (
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {t("common.comment", "Nhận xét")}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {qa.feedback}
                  </p>
                </div>
              )}
              {qa.suggestion && (
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                    <Lightbulb className="h-3 w-3" />
                    {t("userAiinterview.suggestionsForImprovement", "Gợi ý cải thiện")}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {qa.suggestion}
                  </p>
                </div>
              )}
            </div>
          )}

          {qa.behavioralWarnings && qa.behavioralWarnings.length > 0 && (
            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{qa.behavioralWarnings.join(" · ")}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const styles: Record<string, string> = {
    CREATED: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    IN_PROGRESS: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    CANCELLED: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
        styles[status ?? ""] ?? "border-slate-200 bg-slate-100 text-slate-600"
      )}>
      {label ?? status ?? "—"}
    </Badge>
  );
}

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "amber" | "rose";
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
      )}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-6">{children}</p>
    </div>
  );
}
