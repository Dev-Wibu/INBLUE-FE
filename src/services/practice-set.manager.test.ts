import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/constants/api.config", async () => {
  const actual =
    await vi.importActual<typeof import("@/constants/api.config")>("@/constants/api.config");

  return {
    ...actual,
    MANAGER_MODE: "api",
    createApiInstance: () => mockApi,
  };
});

import { PracticeSetManager } from "@/services/practice-set.manager";

describe("PracticeSetManager createByAI", () => {
  beforeEach(() => {
    mockApi.post.mockReset();
  });

  it("sends PracticeGenerateRequest body without userId", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        id: 1,
      },
    });

    const manager = new PracticeSetManager();
    const requestBody = {
      aiInterviewId: 321,
      dateNumber: 14,
    };

    const result = await manager.createByAI(requestBody);

    expect(result.success).toBe(true);
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith("/api/practice-sets/create-by-ai", requestBody);

    const sentBody = mockApi.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty("userId");
  });
});
