import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
  },
}));

import { fetchClient } from "@/lib/api";
import { applicationDetailManager } from "./application-detail.manager";

const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;
const mockGet = fetchClient.GET as ReturnType<typeof vi.fn>;

describe("ApplicationDetailManager backend contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the direct ApplicationDetail from code review evaluation", async () => {
    const detail = {
      id: 485,
      applicationId: 189,
      roundId: 970,
      status: "AI_EVALUATED",
      structuredAiFeedback: { overallScore: 45 },
    };
    mockPost.mockResolvedValueOnce({ data: detail });

    const result = await applicationDetailManager.submitCodeReview({
      applicationId: 189,
      roundId: 970,
      submissions: [
        { filename: "example.java", lineNumber: 1, severity: "WARNING", description: "Issue" },
      ],
    });

    expect(result).toEqual({ success: true, data: detail });
    expect(mockPost).toHaveBeenCalledWith(
      "/api/application-details/code-review/evaluate",
      expect.objectContaining({
        body: {
          applicationId: 189,
          roundId: 970,
          submissions: [
            {
              filename: "example.java",
              lineNumber: 1,
              severity: "WARNING",
              description: "Issue",
            },
          ],
        },
      })
    );
  });

  it("accepts the intentionally empty HR score response", async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });

    const result = await applicationDetailManager.hrScore({
      applicationDetailId: 485,
      isPass: true,
      note: "Ready",
      score: 80,
    });

    expect(result).toEqual({ success: true });
  });

  it("keeps the bare application detail list and its backend order", async () => {
    const details = [
      { id: 9, roundId: 970 },
      { id: 3, roundId: 960 },
    ];
    mockGet.mockResolvedValueOnce({ data: details });

    const result = await applicationDetailManager.getByApplicationId(189);

    expect(result.data).toEqual(details);
  });

  it("serializes compile requests as JSON instead of object coercion", async () => {
    mockPost.mockResolvedValueOnce({ data: { status: "COMPLETED" }, response: { status: 200 } });

    await applicationDetailManager.submit({
      applicationId: 189,
      compileRequest: [
        { problemId: 7, language: "JAVA", sourceCode: ["class Main {}"], isTest: false },
      ],
    });

    const request = mockPost.mock.calls[0][1] as { body: FormData };
    expect(request.body.get("applicationId")).toBe("189");
    expect(request.body.get("compileRequest")).toBe(
      JSON.stringify([
        { problemId: 7, language: "JAVA", sourceCode: ["class Main {}"], isTest: false },
      ])
    );
    expect(String(request.body.get("compileRequest"))).not.toContain("[object Object]");
  });

  it("loads the current mentor pending schedule queue without a mentor id", async () => {
    const schedules = [{ applicationDetailId: 123, proposedDurationMinutes: 45 }];
    mockGet.mockResolvedValueOnce({ data: schedules });

    const result = await applicationDetailManager.getPendingMentorSchedules();

    expect(result).toEqual({ success: true, data: schedules });
    expect(mockGet).toHaveBeenCalledWith("/api/application-details/mentor/pending-schedules");
  });

  it("sends an explicit schedule decision body", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 123, status: "AWAITING_MENTOR" } });

    await applicationDetailManager.decideMentorSchedule(123, {
      approved: false,
      reason: "Khung giờ này bị trùng lịch",
    });

    expect(mockPost).toHaveBeenCalledWith("/api/application-details/{id}/schedule-decision", {
      params: { path: { id: 123 } },
      body: { approved: false, reason: "Khung giờ này bị trùng lịch" },
    });
  });

  it("cancels a mentor schedule with an optional reason", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 123, status: "PENDING", sessionId: null } });

    await applicationDetailManager.cancelMentorSchedule(123, {
      reason: "Tôi cần đổi lịch",
    });

    expect(mockPost).toHaveBeenCalledWith("/api/application-details/{id}/cancel-schedule", {
      params: { path: { id: 123 } },
      body: { reason: "Tôi cần đổi lịch" },
    });
  });
});
