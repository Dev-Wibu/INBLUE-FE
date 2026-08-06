import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NormalizedCodeReviewProblem } from "@/hooks/useCodeReviewProblems";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Code2,
  FileCode2,
  Info,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { components } from "../../../schema-from-be";

type CodeReviewSubmission = components["schemas"]["CodeReviewSubmission"];
type AiFeedback = components["schemas"]["AiFeedback"];

type Severity = "CRITICAL" | "WARNING" | "INFO";

interface CodeReviewGraderProps {
  detail: components["schemas"]["ApplicationDetail"];
  problems: NormalizedCodeReviewProblem[];
  isLoading?: boolean;
}

const SEVERITY_CONFIG: Record<
  Severity,
  {
    label: string;
    bar: string;
    bg: string;
    border: string;
    text: string;
    icon: typeof AlertTriangle;
    dot: string;
  }
> = {
  CRITICAL: {
    label: "CRITICAL",
    bar: "bg-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/80",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertTriangle,
    dot: "bg-rose-500",
  },
  WARNING: {
    label: "WARNING",
    bar: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/80",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    dot: "bg-amber-500",
  },
  INFO: {
    label: "INFO",
    bar: "bg-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800/80",
    text: "text-sky-700 dark:text-sky-400",
    icon: Info,
    dot: "bg-sky-500",
  },
};

function CodeFileViewer({ file }: { file: { filename?: string; content?: string } }) {
  const lines = (file.content ?? "").split("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {/* File Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <FileCode2 className="h-4 w-4 text-indigo-500" />
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {file.filename ?? "file"}
        </span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {lines.length} lines
        </Badge>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto bg-[#1e1e1e]">
        <pre className="p-4 text-xs leading-relaxed">
          <code className="font-mono text-slate-300">
            {lines.map((line, i) => (
              <div key={i} className="flex hover:bg-slate-800/50">
                <span className="mr-4 min-w-[3ch] text-right text-slate-600 select-none">
                  {i + 1}
                </span>
                <span className="whitespace-pre">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function IssueCard({
  submission,
  isExpected = false,
}: {
  submission: { filename?: string; lineNumber?: number; severity?: string; description?: string };
  isExpected?: boolean;
}) {
  const severity = (submission.severity ?? "WARNING") as Severity;
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.WARNING;
  const Icon = config.icon;

  return (
    <div
      className={cn("rounded-lg border p-3", config.border, config.bg, isExpected && "opacity-80")}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.text)} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                config.bg,
                config.text,
                config.border
              )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              {config.label}
            </span>
            {submission.filename && (
              <span className="font-mono text-[10px] text-slate-500">
                {submission.filename}
                {submission.lineNumber != null && `:${submission.lineNumber}`}
              </span>
            )}
            {isExpected && <span className="text-[10px] text-slate-400">(Expected)</span>}
          </div>
          {submission.description && (
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {submission.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AIFeedbackView({ feedback, score }: { feedback?: AiFeedback; score?: number }) {
  const { t } = useTranslation();
  const strengths = feedback?.strengths ?? [];
  const weaknesses = feedback?.weaknesses ?? [];
  const generalComment = feedback?.generalComment;

  if (!feedback && score === undefined) return null;

  return (
    <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800/50 dark:bg-purple-950/30">
      <div className="flex items-center gap-2">
        <Bug className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300">
          {t("grading.aiFeedback", "AI Feedback")}
        </h4>
        {score !== undefined && score !== null && (
          <Badge className="ml-auto bg-purple-600 text-white">{score}/100</Badge>
        )}
      </div>

      {generalComment && (
        <div className="rounded-lg bg-white/50 p-3 dark:bg-slate-900/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">{generalComment}</p>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="space-y-2">
          <h5 className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("common.strengths", "Strengths")}
          </h5>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div className="space-y-2">
          <h5 className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5" />
            {t("common.pointsForImprovement", "Points for Improvement")}
          </h5>
          <ul className="space-y-1.5">
            {weaknesses.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="mt-0.5 text-red-500">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CodeReviewGrader({ detail, problems, isLoading }: CodeReviewGraderProps) {
  const { t } = useTranslation();
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [showExpectedIssues, setShowExpectedIssues] = useState(false);

  const submissions = detail.submissionData?.codeReviewSubmissions ?? [];
  const aiScore = detail.aiScore;
  const aiFeedback = detail.aiFeedback;

  const activeProblem = problems[activeProblemIdx];

  // Group submissions by problem (based on filename matching)
  const submissionsByFile = useMemo(() => {
    const map = new Map<string, CodeReviewSubmission[]>();
    submissions.forEach((sub) => {
      const filename = sub.filename ?? "";
      if (!map.has(filename)) {
        map.set(filename, []);
      }
      map.get(filename)!.push(sub);
    });
    return map;
  }, [submissions]);

  // Count submissions
  const submissionCount = submissions.length;
  const criticalCount = submissions.filter((s) => s.severity === "CRITICAL").length;
  const warningCount = submissions.filter((s) => s.severity === "WARNING").length;
  const infoCount = submissions.filter((s) => s.severity === "INFO").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-slate-800/80 dark:bg-slate-900/80">
        <Bug className="mx-auto mb-2 h-8 w-8 text-amber-400" />
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          {t("userApplicationhistory.codeReviewEmptyState", "No Code Review problem available.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
          <Code2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("codeReviewRound", "Code Review Round")}
          </h3>
          <p className="text-xs text-slate-500">
            {t("userApplicationhistory.round", "Round")} #{detail.roundId}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{submissionCount}</p>
            <p className="text-[10px] tracking-wide text-slate-500 uppercase">
              {t("codeReviewIssues", "Issues")}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {criticalCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {warningCount}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-400">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                {infoCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Problem Tabs */}
      {problems.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {problems.map((problem, idx) => (
            <Button
              key={problem.problemId}
              variant={activeProblemIdx === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveProblemIdx(idx)}
              className={cn(
                "gap-2",
                activeProblemIdx === idx && "bg-indigo-600 hover:bg-indigo-700"
              )}>
              #{idx + 1} {problem.title}
              {problem.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px]",
                    problem.difficulty === "EASY" && "border-emerald-300 text-emerald-600",
                    problem.difficulty === "MEDIUM" && "border-amber-300 text-amber-600",
                    problem.difficulty === "HARD" && "border-rose-300 text-rose-600"
                  )}>
                  {problem.difficulty}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {activeProblem && (
        <>
          {/* Problem Statement */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              <MessageSquare className="h-4 w-4" />
              {t("codeReviewContext", "Problem Statement")}
            </h4>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {activeProblem.problemStatement ||
                  t(
                    "codeReviewDefaultStatement",
                    "Read the code below, find hidden bugs and describe them in detail."
                  )}
              </p>
            </div>
          </div>

          {/* Code Files */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
              <Code2 className="h-4 w-4" />
              {t("submission.content", "Submission Content")} ({activeProblem.files.length} files)
            </h4>
            {activeProblem.files.map((file, idx) => {
              const fileSubmissions = submissionsByFile.get(file.filename ?? "") ?? [];
              const hasSubmissions = fileSubmissions.length > 0;

              return (
                <div key={file.filename ?? idx} className="space-y-2">
                  <CodeFileViewer file={file} />

                  {/* Highlight submitted issues on this file */}
                  {hasSubmissions && (
                    <div className="space-y-2 pl-4">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Candidate's Issues ({fileSubmissions.length})
                      </p>
                      {fileSubmissions.map((sub, subIdx) => (
                        <IssueCard key={subIdx} submission={sub} />
                      ))}
                    </div>
                  )}

                  {/* Show expected issues for this file */}
                  {showExpectedIssues && (
                    <div className="space-y-2 pl-4">
                      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Expected Issues
                      </p>
                      {activeProblem.expectedIssues
                        .filter((issue) => issue.filename === file.filename)
                        .map((issue, expIdx) => (
                          <IssueCard key={expIdx} submission={issue} isExpected />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Toggle Expected Issues */}
          {activeProblem.expectedIssues.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExpectedIssues(!showExpectedIssues)}
              className="gap-2">
              <Bug className="h-4 w-4" />
              {showExpectedIssues ? "Hide" : "Show"} Expected Issues (
              {activeProblem.expectedIssues.length})
            </Button>
          )}
        </>
      )}

      {/* AI Feedback */}
      <AIFeedbackView feedback={aiFeedback} score={aiScore} />
    </div>
  );
}
