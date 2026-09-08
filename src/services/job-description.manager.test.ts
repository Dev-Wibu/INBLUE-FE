import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ fetchClient: mockApi }));

import { jobDescriptionManager } from "./job-description.manager";

describe("jobDescriptionManager recommendations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns recommendations in backend order", async () => {
    const jobs = [{ id: 3 }, { id: 9 }];
    mockApi.GET.mockResolvedValueOnce({ data: jobs });
    await expect(jobDescriptionManager.getRecommendations()).resolves.toEqual({
      success: true,
      data: jobs,
    });
    expect(mockApi.GET).toHaveBeenCalledWith("/api/job-descriptions/recommendations");
  });

  it("treats an empty response as a successful empty list", async () => {
    mockApi.GET.mockResolvedValueOnce({ data: undefined });
    await expect(jobDescriptionManager.getRecommendations()).resolves.toEqual({
      success: true,
      data: [],
    });
  });

  it("normalizes request errors", async () => {
    mockApi.GET.mockRejectedValueOnce(new Error("offline"));
    await expect(jobDescriptionManager.getRecommendations()).resolves.toEqual({
      success: false,
      error: "offline",
    });
  });
});
