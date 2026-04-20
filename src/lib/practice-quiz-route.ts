export interface PracticeQuizPathParams {
  sessionId: number | string;
  practiceSetId: number | string;
  quizId: number | string;
}

function toPathSegment(value: number | string): string {
  return encodeURIComponent(String(value));
}

export function buildPracticeSessionPath(sessionId: number | string): string {
  return `/user/practice/session/${toPathSegment(sessionId)}`;
}

export function buildPracticeQuizPath({
  sessionId,
  practiceSetId,
  quizId,
}: PracticeQuizPathParams): string {
  return `${buildPracticeSessionPath(sessionId)}/${toPathSegment(practiceSetId)}/quiz/${toPathSegment(quizId)}`;
}

export function buildPracticeQuizResultPath(params: PracticeQuizPathParams): string {
  return `${buildPracticeQuizPath(params)}/result`;
}

export function toPositiveIntegerParam(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
