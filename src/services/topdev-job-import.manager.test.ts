import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchClient } from "@/lib/api";

import { TopDevJobImportManager } from "./topdev-job-import.manager";

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

describe("TopDevJobImportManager", () => {
  const manager = new TopDevJobImportManager();

  beforeEach(() => vi.clearAllMocks());

  it("sends paging and filters when searching", async () => {
    vi.mocked(fetchClient.GET).mockResolvedValue({ data: [], response: {} as Response } as never);

    await manager.search({
      keyword: "java",
      level: "JUNIOR",
      jobCategoriesIds: [2, 7],
      page: 2,
      limit: 5,
    });

    expect(fetchClient.GET).toHaveBeenCalledWith("/api/admin/job-import/topdev/search", {
      params: {
        query: {
          keyword: "java",
          level: "JUNIOR",
          jobCategoriesIds: [2, 7],
          page: 2,
          limit: 5,
        },
      },
    });
  });

  it("posts only the import contract fields supplied by the page", async () => {
    vi.mocked(fetchClient.POST).mockResolvedValue({
      data: { jobDescriptionId: 202, jobDescriptionStatus: "DRAFT" },
      response: {} as Response,
    } as never);
    const payload = {
      title: "Junior Java Developer",
      companyName: "Example Company",
      source: "TOPDEV",
      sourceJobId: "12345",
      requestedLevel: "JUNIOR" as const,
    };

    const result = await manager.importJob(payload);

    expect(fetchClient.POST).toHaveBeenCalledWith("/api/admin/job-import/topdev/import", {
      body: payload,
    });
    expect(result.jobDescriptionStatus).toBe("DRAFT");
  });
});
