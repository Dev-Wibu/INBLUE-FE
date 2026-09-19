import { describe, expect, it } from "vitest";
import { adaptMentorDashboardSummary } from "./mentor-dashboard";

describe("adaptMentorDashboardSummary", () => {
  it("preserves zero values and unknown session statuses", () => {
    const result = adaptMentorDashboardSummary({
      totalSessions: 0,
      sessionCountByStatus: { FUTURE_STATUS: 2, COMPLETED: 0 },
      totalReviewedApplications: 0,
      reviewedApplications: [],
      totalFeedbacks: 0,
      feedbacks: [],
    });

    expect(result.totalSessions).toBe(0);
    expect(result.completedSessions).toBe(0);
    expect(result.statusItems).toEqual([{ status: "FUTURE_STATUS", value: 2 }]);
    expect(result.averageCandidateScore).toBeNull();
    expect(result.averageMentorRating).toBeNull();
  });

  it("calculates metrics only from complete, valid collections", () => {
    const result = adaptMentorDashboardSummary({
      totalSessions: 4,
      sessionCountByStatus: { COMPLETED: 3, ONGOING: 1 },
      totalReviewedApplications: 3,
      reviewedApplications: [
        { sessionId: 1, candidateName: "A", mentorReview: { rating: 90 } },
        { sessionId: 2, candidateName: "B", mentorReview: { rating: 75 } },
        { sessionId: 3, candidateName: "C", mentorReview: { rating: 50 } },
      ],
      totalFeedbacks: 2,
      feedbacks: [
        { sessionId: 1, rating: 5 },
        { sessionId: 2, rating: 4 },
      ],
    });

    expect(result.averageCandidateScore).toBeCloseTo(71.67, 2);
    expect(result.averageMentorRating).toBe(4.5);
    expect(result.scoreDistribution.map((item) => item.value)).toEqual([1, 1, 0, 1]);
  });

  it("does not derive averages from partial or invalid collections", () => {
    const result = adaptMentorDashboardSummary({
      totalReviewedApplications: 2,
      reviewedApplications: [
        { candidateName: "A", mentorReview: { rating: 101 } },
        { candidateName: "B", mentorReview: { rating: 80 } },
      ],
      totalFeedbacks: 2,
      feedbacks: [{ rating: 5 }],
    });

    expect(result.averageCandidateScore).toBeNull();
    expect(result.averageMentorRating).toBeNull();
    expect(result.scoreItems).toHaveLength(1);
  });
});
