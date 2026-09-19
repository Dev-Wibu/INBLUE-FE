import type { components } from "../../schema-from-be";

type Summary = components["schemas"]["MentorDashboardSummaryResponse"];
type ReviewedApplication = components["schemas"]["ReviewedApplicationItem"];
type Feedback = components["schemas"]["FeedbackItem"];

export interface MentorDashboardStatusItem {
  status: string;
  value: number;
}

export interface MentorDashboardScoreItem {
  key: string;
  candidateName?: string;
  score: number;
  sessionId?: number;
}

export interface MentorDashboardViewModel {
  totalSessions: number | null;
  completedSessions: number | null;
  averageCandidateScore: number | null;
  averageMentorRating: number | null;
  statusItems: MentorDashboardStatusItem[];
  statusTotal: number;
  scoreItems: MentorDashboardScoreItem[];
  scoreDistribution: Array<{
    range: "excellent" | "strong" | "meets" | "developing";
    value: number;
  }>;
  reviewedApplications: ReviewedApplication[];
  feedbacks: Feedback[];
}

const asCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const asId = (value: unknown): number | undefined => {
  const id = asCount(value);
  return id !== null && id > 0 ? id : undefined;
};

const isScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

const isRating = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5;

const average = (values: number[]): number | null =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function adaptMentorDashboardSummary(summary: Summary): MentorDashboardViewModel {
  const reviewedApplications = Array.isArray(summary.reviewedApplications)
    ? summary.reviewedApplications
    : [];
  const reviewedCandidates = Array.isArray(summary.reviewedCandidates)
    ? summary.reviewedCandidates
    : [];
  const feedbacks = Array.isArray(summary.feedbacks) ? summary.feedbacks : [];

  const applicationScores = reviewedApplications.flatMap<MentorDashboardScoreItem>(
    (item, index) => {
      const score = item.mentorReview?.rating;
      if (!isScore(score)) return [];
      return [
        {
          key: `application-${item.applicationDetailId ?? item.applicationId ?? item.sessionId ?? index}`,
          candidateName: item.candidateName,
          score,
          sessionId: asId(item.sessionId),
        },
      ];
    }
  );

  const candidateScores = reviewedCandidates.flatMap<MentorDashboardScoreItem>((item, index) => {
    const score = item.review?.rating;
    if (!isScore(score)) return [];
    return [
      {
        key: `candidate-${item.candidate?.id ?? item.sessionId ?? index}`,
        candidateName: item.candidate?.name,
        score,
        sessionId: asId(item.sessionId),
      },
    ];
  });

  const scoreItems = applicationScores.length > 0 ? applicationScores : candidateScores;
  const reviewedTotal = asCount(
    applicationScores.length > 0
      ? summary.totalReviewedApplications
      : summary.totalReviewedCandidates
  );
  const hasCompleteScoreList = reviewedTotal !== null && reviewedTotal === scoreItems.length;
  const scores = scoreItems.map((item) => item.score);

  const feedbackTotal = asCount(summary.totalFeedbacks);
  const ratings = feedbacks.map((item) => item.rating).filter(isRating);
  const hasCompleteFeedbackList = feedbackTotal !== null && feedbackTotal === feedbacks.length;

  const statusItems = Object.entries(summary.sessionCountByStatus ?? {})
    .map(([status, rawValue]) => ({
      status: status.trim().toUpperCase() || "OTHER",
      value: asCount(rawValue),
    }))
    .filter((item): item is MentorDashboardStatusItem => item.value !== null && item.value > 0);

  return {
    totalSessions: asCount(summary.totalSessions),
    completedSessions:
      statusItems.find((item) => item.status === "COMPLETED")?.value ??
      (asCount(summary.totalSessions) === 0 ? 0 : null),
    averageCandidateScore: hasCompleteScoreList ? average(scores) : null,
    averageMentorRating: hasCompleteFeedbackList ? average(ratings) : null,
    statusItems,
    statusTotal: statusItems.reduce((sum, item) => sum + item.value, 0),
    scoreItems: scoreItems.slice(0, 10),
    scoreDistribution: [
      { range: "excellent", value: scores.filter((score) => score >= 90).length },
      { range: "strong", value: scores.filter((score) => score >= 75 && score < 90).length },
      { range: "meets", value: scores.filter((score) => score >= 60 && score < 75).length },
      { range: "developing", value: scores.filter((score) => score < 60).length },
    ],
    reviewedApplications,
    feedbacks,
  };
}
