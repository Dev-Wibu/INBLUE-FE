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

import { QuizSetManager } from "@/services/quiz-set.manager";

describe("QuizSetManager createFullAi", () => {
  beforeEach(() => {
    mockApi.post.mockReset();
  });

  it("sends only practiceSetId query param", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        quizId: 99,
      },
    });

    const manager = new QuizSetManager();
    const result = await manager.createFullAi(10);

    expect(result.success).toBe(true);
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/quiz-sets/create-full-ai",
      null,
      expect.objectContaining({
        params: {
          practiceSetId: 10,
        },
        timeout: 120000,
      })
    );

    const requestConfig = mockApi.post.mock.calls[0]?.[2] as { params?: Record<string, unknown> };
    expect(requestConfig?.params).not.toHaveProperty("userId");
  });
});
