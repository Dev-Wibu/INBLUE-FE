import i18n from "@/lib/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchClient: {
    POST: vi.fn(),
    PUT: vi.fn(),
  },
}));

import { fetchClient } from "@/lib/api";
import { mentorReviewManager } from "./mentor-review.manager";

const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;
const mockPut = fetchClient.PUT as ReturnType<typeof vi.fn>;

describe("MentorReviewManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["create", "update"] as const)(
    "returns a friendly message for overlong review notes on %s",
    async (operation) => {
      const databaseError = new Error(
        "could not execute statement [ERROR: value too long for type character varying(255)]"
      );
      if (operation === "create") {
        mockPost.mockRejectedValueOnce(databaseError);
      } else {
        mockPut.mockRejectedValueOnce(databaseError);
      }

      const result =
        operation === "create"
          ? await mentorReviewManager.create({ sessionId: 1, rating: 80 })
          : await mentorReviewManager.update(1, { rating: 80 });

      expect(result).toEqual({
        success: false,
        error: i18n.t("general.mentorReviewNoteTooLong"),
      });
      expect(result.error).not.toContain("character varying");
    }
  );
});
