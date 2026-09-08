import { describe, expect, it, vi } from "vitest";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({ fetchClient: mockApi }));

import { entryTestAdminManager } from "./entry-test-admin.manager";

describe("entryTestAdminManager", () => {
  it("loads real entry test configurations", async () => {
    mockApi.GET.mockResolvedValueOnce({ data: [{ id: 1, name: "Entry" }] });
    await expect(entryTestAdminManager.listEntryTests()).resolves.toEqual([
      { id: 1, name: "Entry" },
    ]);
    expect(mockApi.GET).toHaveBeenCalledWith("/api/admin/entry-tests");
  });

  it("sends scale sets to the backend endpoint", async () => {
    mockApi.POST.mockResolvedValueOnce({ data: [] });
    await entryTestAdminManager.upsertLevelScaleSet("FE", [
      { level: "INTERN", minScore: 0, maxScore: 49.99, isActive: true },
    ]);
    expect(mockApi.POST).toHaveBeenCalledWith("/api/admin/level-scales/set", {
      body: {
        targetRole: "FE",
        scales: [{ level: "INTERN", minScore: 0, maxScore: 49.99, isActive: true }],
      },
    });
  });
});
