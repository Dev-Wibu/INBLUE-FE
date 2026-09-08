import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { PUT: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ fetchClient: mockApi }));

import {
  isValidRecommendationThreshold,
  jobRecommendationAdminManager,
  parseRecommendationThreshold,
} from "./job-recommendation-admin.manager";

describe("jobRecommendationAdminManager", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([0, 20, 70.25, 100])("accepts threshold %s", (thresholdPercent) => {
    expect(isValidRecommendationThreshold(thresholdPercent)).toBe(true);
  });

  it.each([Number.NaN, -1, 100.01, 70.123])("rejects threshold %s", (thresholdPercent) => {
    expect(isValidRecommendationThreshold(thresholdPercent)).toBe(false);
  });

  it.each(["", " ", "NaN", "-1", "100.01", "70.123"])("rejects threshold input %j", (input) => {
    expect(parseRecommendationThreshold(input)).toBeNull();
  });

  it("sends the threshold request body", async () => {
    mockApi.PUT.mockResolvedValueOnce({ data: { thresholdPercent: 70.25 } });
    await expect(jobRecommendationAdminManager.updateThreshold(70.25)).resolves.toEqual({
      success: true,
      data: { thresholdPercent: 70.25 },
    });
    expect(mockApi.PUT).toHaveBeenCalledWith("/api/admin/job-recommendation-threshold", {
      body: { thresholdPercent: 70.25 },
    });
  });

  it("does not call the backend for invalid values", async () => {
    const result = await jobRecommendationAdminManager.updateThreshold(70.123);
    expect(result.success).toBe(false);
    expect(mockApi.PUT).not.toHaveBeenCalled();
  });
});
