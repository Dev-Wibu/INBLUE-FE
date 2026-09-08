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

describe("jobDescriptionManager skill tag mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes skillTags when creating a JD", async () => {
    mockApi.POST.mockResolvedValueOnce({ data: { id: 120, skillTags: ["React"] } });

    await jobDescriptionManager.create({ title: "Frontend", skillTags: ["React"] });

    expect(mockApi.POST).toHaveBeenCalledWith("/api/job-descriptions", {
      body: { title: "Frontend", skillTags: ["React"] },
    });
  });

  it("includes skillTags when updating a JD", async () => {
    mockApi.PUT.mockResolvedValueOnce({ data: { id: 120, skillTags: ["React", "TypeScript"] } });

    await jobDescriptionManager.update({
      id: 120,
      title: "Frontend",
      skillTags: ["React", "TypeScript"],
    });

    expect(mockApi.PUT).toHaveBeenCalledWith("/api/job-descriptions", {
      body: { id: 120, title: "Frontend", skillTags: ["React", "TypeScript"] },
    });
  });
});
