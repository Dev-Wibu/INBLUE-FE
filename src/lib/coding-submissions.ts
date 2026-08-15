interface CodingItemWithProblemId {
  problemId?: number | null;
}

function getProblemId(item: object): number | null | undefined {
  return (item as CodingItemWithProblemId).problemId;
}

export interface CodingProblemSubmissionPair<TProblem extends object, TSubmission extends object> {
  problem?: TProblem;
  submission?: TSubmission;
  submissionIndex?: number;
}

export function findCodingSubmissionForProblem<TSubmission extends object>(
  submissions: readonly TSubmission[],
  problemId: number | null | undefined,
  problemIndex: number
): TSubmission | undefined {
  if (problemId !== null && problemId !== undefined) {
    const exactMatch = submissions.find((submission) => getProblemId(submission) === problemId);
    if (exactMatch) return exactMatch;
  }

  const indexedSubmission = submissions[problemIndex];
  const indexedProblemId = indexedSubmission ? getProblemId(indexedSubmission) : undefined;
  const submissionsHaveProblemIds = submissions.some(
    (submission) => getProblemId(submission) !== null && getProblemId(submission) !== undefined
  );

  if (
    !submissionsHaveProblemIds ||
    problemId === null ||
    problemId === undefined ||
    indexedProblemId === null ||
    indexedProblemId === undefined
  ) {
    return indexedSubmission;
  }

  return undefined;
}

export function pairCodingProblemsWithSubmissions<
  TProblem extends object,
  TSubmission extends object,
>(
  problems: readonly TProblem[],
  submissions: readonly TSubmission[]
): Array<CodingProblemSubmissionPair<TProblem, TSubmission>> {
  const usedSubmissionIndexes = new Set<number>();
  const assignedSubmissionIndexes = problems.map((problem) => {
    const problemId = getProblemId(problem);
    if (problemId === null || problemId === undefined) return undefined;

    const matchIndex = submissions.findIndex(
      (submission, submissionIndex) =>
        !usedSubmissionIndexes.has(submissionIndex) && getProblemId(submission) === problemId
    );

    if (matchIndex < 0) return undefined;
    usedSubmissionIndexes.add(matchIndex);
    return matchIndex;
  });

  for (const [problemIndex, problem] of problems.entries()) {
    if (assignedSubmissionIndexes[problemIndex] !== undefined) continue;

    const indexedSubmission = submissions[problemIndex];
    if (!indexedSubmission || usedSubmissionIndexes.has(problemIndex)) continue;

    const problemId = getProblemId(problem);
    const submissionProblemId = getProblemId(indexedSubmission);
    const canUseIndexFallback =
      problemId === null ||
      problemId === undefined ||
      submissionProblemId === null ||
      submissionProblemId === undefined;

    if (canUseIndexFallback) {
      assignedSubmissionIndexes[problemIndex] = problemIndex;
      usedSubmissionIndexes.add(problemIndex);
    }
  }

  const pairs: Array<CodingProblemSubmissionPair<TProblem, TSubmission>> = problems.map(
    (problem, problemIndex) => {
      const submissionIndex = assignedSubmissionIndexes[problemIndex];
      return {
        problem,
        submission: submissionIndex === undefined ? undefined : submissions[submissionIndex],
        submissionIndex,
      };
    }
  );

  for (const [submissionIndex, submission] of submissions.entries()) {
    if (!usedSubmissionIndexes.has(submissionIndex)) {
      pairs.push({ submission, submissionIndex });
    }
  }

  return pairs;
}
