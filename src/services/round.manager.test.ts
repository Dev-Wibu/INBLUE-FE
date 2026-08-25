import i18n from "@/lib/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
  },
}));

import { fetchClient } from "@/lib/api";
import { roundManager } from "./round.manager";

const mockPut = fetchClient.PUT as ReturnType<typeof vi.fn>;
const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;

describe("RoundManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePlanForJd", () => {
    it("generates a draft plan for a job description", async () => {
      const draft = {
        rounds: [{ name: "CV Screening", roundOrder: 1, roundType: "CV_SCREENING" }],
        globalNotes: "Review before saving",
      };
      mockPost.mockResolvedValueOnce({ data: draft, error: null });

      const result = await roundManager.generatePlanForJd(101);

      expect(mockPost).toHaveBeenCalledWith("/api/rounds/jd/{jdId}/generate-round-plan", {
        params: { path: { jdId: 101 } },
      });
      expect(result).toEqual({ success: true, data: draft });
    });

    it("rejects an empty AI draft", async () => {
      mockPost.mockResolvedValueOnce({ data: { rounds: [] }, error: null });

      const result = await roundManager.generatePlanForJd(101);

      expect(result.success).toBe(false);
    });

    it("returns the normalized request error", async () => {
      mockPost.mockRejectedValueOnce(new Error("AnythingLLM unavailable"));

      const result = await roundManager.generatePlanForJd(101);

      expect(result).toEqual({ success: false, error: "AnythingLLM unavailable" });
    });
  });

  describe("setUpForJd", () => {
    it("sets up rounds for a job description", async () => {
      const rounds = [{ id: 1, name: "Round 1" }];
      mockPut.mockResolvedValueOnce({ data: rounds, error: null });

      const result = await roundManager.setUpForJd(1, {
        rounds: [
          {
            name: "Round 1",
            roundOrder: 1,
            roundType: "CV_SCREENING",
            passThreshold: 50,
            configData: {},
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(rounds);
    });

    it("sends evaluationPlan in the setup payload", async () => {
      mockPut.mockResolvedValueOnce({ data: [], error: null });
      const evaluationPlan = {
        metrics: [
          {
            code: "TECH_DEPTH",
            name: "Technical depth",
            description: "Technical knowledge",
            weight: 100,
            maxScore: 100,
            required: true,
            minimumScore: 60,
          },
        ],
        scoringInstruction: "Score on 0-100",
        passRule: "Meet the round threshold",
      };

      await roundManager.setUpForJd(101, {
        rounds: [
          {
            name: "Technical interview",
            roundOrder: 1,
            roundType: "AI_INTERVIEW",
            passThreshold: 70,
            configData: { evaluationPlan },
          },
        ],
      });

      expect(mockPut).toHaveBeenCalledWith(
        "/api/rounds/jd/101",
        expect.objectContaining({
          body: expect.objectContaining({
            rounds: [expect.objectContaining({ configData: { evaluationPlan } })],
          }),
        })
      );
    });

    it("returns error on failure", async () => {
      mockPut.mockRejectedValueOnce(new Error("Network error"));

      const result = await roundManager.setUpForJd(1, { rounds: [] });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("returns i18n fallback for non-Error throws", async () => {
      mockPut.mockRejectedValueOnce("string error");

      const result = await roundManager.setUpForJd(1, { rounds: [] });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("errors.cannotSetUpInterviewRounds"));
    });
  });

  describe("updateForJd", () => {
    it("updates rounds for a job description", async () => {
      const rounds = [{ id: 1, name: "Updated Round" }];
      mockPut.mockResolvedValueOnce({ data: rounds, error: null });

      const result = await roundManager.updateForJd(1, {
        rounds: [
          {
            name: "Updated Round",
            roundOrder: 1,
            roundType: "CV_SCREENING",
            passThreshold: 50,
            configData: {},
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(rounds);
    });

    it("sends evaluationPlan in the update payload", async () => {
      mockPut.mockResolvedValueOnce({ data: [], error: null });
      const evaluationPlan = {
        metrics: [
          {
            code: "COMMUNICATION",
            name: "Communication",
            description: "Clear communication",
            weight: 100,
            maxScore: 100,
            required: false,
            minimumScore: 0,
          },
        ],
        scoringInstruction: "Score on 0-100",
        passRule: "Meet the round threshold",
      };

      await roundManager.updateForJd(101, {
        rounds: [
          {
            id: 55,
            name: "Mentor interview",
            roundOrder: 1,
            roundType: "MENTROR_REVIEW",
            passThreshold: 70,
            configData: { evaluationPlan },
          },
        ],
      });

      expect(mockPut).toHaveBeenCalledWith(
        "/api/rounds/jd/101/update",
        expect.objectContaining({
          body: expect.objectContaining({
            rounds: [expect.objectContaining({ configData: { evaluationPlan } })],
          }),
        })
      );
    });

    it("returns error on failure", async () => {
      mockPut.mockRejectedValueOnce(new Error("Update failed"));

      const result = await roundManager.updateForJd(1, { rounds: [] });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("returns i18n fallback for non-Error throws", async () => {
      mockPut.mockRejectedValueOnce("string error");

      const result = await roundManager.updateForJd(1, { rounds: [] });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("errors.cannotUpdateInterviewRounds"));
    });
  });
});
