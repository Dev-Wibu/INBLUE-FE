import { useQuery } from "@tanstack/react-query";
import type { components } from "../../schema-from-be";

type CodeReviewProblemSnapshot = components["schemas"]["CodeReviewProblemSnapshot"];
type CodeFile = components["schemas"]["CodeFile"];

export interface NormalizedCodeReviewProblem {
  problemId: number;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  language?: string;
  problemStatement: string;
  files: CodeFile[];
  expectedIssues: Array<{
    filename?: string;
    lineNumber?: number;
    severity?: "CRITICAL" | "WARNING" | "INFO";
    description?: string;
  }>;
}

function normalizeFormattedCode(raw?: string | null): string {
  if (!raw) return "";
  let text = String(raw);
  if (text.includes("\\n") && !text.includes("\n")) {
    text = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "    ")
      .replace(/\\"/g, '"');
  } else {
    text = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }
  return text;
}

function normalizeProblemSnapshot(problem: CodeReviewProblemSnapshot): NormalizedCodeReviewProblem {
  return {
    problemId: problem.problemId ?? 0,
    title: problem.title ?? "Code Review Problem",
    difficulty: (problem.difficulty as "EASY" | "MEDIUM" | "HARD") ?? "MEDIUM",
    language: problem.language,
    problemStatement: normalizeFormattedCode(problem.problemStatement),
    files: (problem.files ?? []).map((f: CodeFile) => ({
      ...f,
      content: normalizeFormattedCode(f.content),
    })),
    expectedIssues: (problem.expectedIssues ?? []).map((issue) => ({
      ...issue,
      severity: issue.severity as "CRITICAL" | "WARNING" | "INFO" | undefined,
    })),
  };
}

/**
 * Fetch code review problems for a specific round from the JD configuration
 * This hook retrieves the round configuration which contains codeReviewProblems
 */
export function useCodeReviewProblems(jdId: number, roundId: number | undefined) {
  return useQuery({
    queryKey: ["job-description", jdId, "code-review-round", roundId],
    queryFn: async (): Promise<NormalizedCodeReviewProblem[]> => {
      const { fetchClient } = await import("@/lib/api");
      const result = await fetchClient.GET("/api/job-descriptions/{id}", {
        params: { path: { id: jdId } },
      });

      if (!result.response?.ok || !result.data) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jd = result.data as any;
      const rounds: Array<{
        id?: number;
        name?: string;
        roundType?: string;
        configData?: {
          codeReviewProblems?: CodeReviewProblemSnapshot[];
        };
      }> = jd?.rounds ?? [];

      const codeReviewRound = rounds.find((r) => r.id === roundId && r.roundType === "CODE_REVIEW");

      if (!codeReviewRound?.configData?.codeReviewProblems) {
        return [];
      }

      return codeReviewRound.configData.codeReviewProblems.map(normalizeProblemSnapshot);
    },
    enabled: jdId > 0 && roundId !== undefined,
  });
}
