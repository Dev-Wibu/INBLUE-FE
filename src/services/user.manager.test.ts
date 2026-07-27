import i18n from "@/lib/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
  },
}));

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import { fetchClient } from "@/lib/api";
import { userManager } from "./user.manager";

const mockGet = fetchClient.GET as ReturnType<typeof vi.fn>;
const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;
const mockPut = fetchClient.PUT as ReturnType<typeof vi.fn>;

describe("UserManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns user profile on success", async () => {
      const profile = { id: 1, name: "Test User", email: "test@test.com" };
      mockGet.mockResolvedValueOnce({ data: profile, error: null });

      const result = await userManager.getProfile(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(profile);
      // Resolves against /api/users/{id} — the actual Spring route
      // (no /api/users/me endpoint exists, see comment in user.manager.ts).
      expect(mockGet).toHaveBeenCalledWith(
        buildEndpoint(API_ENDPOINTS.USERS.DETAIL, { id: 1 }),
        expect.any(Object)
      );
    });

    it("returns error when userId is missing", async () => {
      const result = await userManager.getProfile(undefined as unknown as number);
      expect(result.success).toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Unauthorized"));

      const result = await userManager.getProfile(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("updateProfile", () => {
    it("omits email when unchanged to prevent duplicate-email error", async () => {
      const currentProfile = { id: 1, email: "same@test.com", name: "Old" };
      mockGet.mockResolvedValueOnce({ data: currentProfile });
      mockPost.mockResolvedValueOnce({ data: { id: 1, name: "New" } });

      await userManager.updateProfile(1, { email: "same@test.com", name: "New" });

      const sentBody = mockPost.mock.calls[0]?.[1] as { body: Record<string, unknown> };
      expect(sentBody.body).not.toHaveProperty("email");
      expect(sentBody.body.name).toBe("New");
      expect(sentBody.body.id).toBe(1);
    });

    it("includes email when changed", async () => {
      const currentProfile = { id: 1, email: "old@test.com", name: "Old" };
      mockGet.mockResolvedValueOnce({ data: currentProfile });
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      await userManager.updateProfile(1, { email: "new@test.com" });

      const sentBody = mockPost.mock.calls[0]?.[1] as { body: Record<string, unknown> };
      expect(sentBody.body.email).toBe("new@test.com");
    });

    it("never re-injects password (would wipe mentor/staff passwords)", async () => {
      // Backend treats `password: null` as a wipe. Profile updates must NOT
      // piggyback the password field.
      const currentProfile = { id: 1, email: "test@test.com", password: "hashed-pw" };
      mockGet.mockResolvedValueOnce({ data: currentProfile });
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      await userManager.updateProfile(1, { name: "Updated" });

      const sentBody = mockPost.mock.calls[0]?.[1] as { body: Record<string, unknown> };
      expect(sentBody.body).not.toHaveProperty("password");
    });

    it("preserves existing name on partial update without re-injecting email", async () => {
      const currentProfile = { id: 1, email: "test@test.com", name: "OriginalName" };
      mockGet.mockResolvedValueOnce({ data: currentProfile });
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      await userManager.updateProfile(1, { phone: "0901" });

      const sentBody = mockPost.mock.calls[0]?.[1] as { body: Record<string, unknown> };
      expect(sentBody.body.name).toBe("OriginalName");
      expect(sentBody.body.phone).toBe("0901");
    });

    it("proceeds normally when getProfile fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));
      mockPost.mockResolvedValueOnce({ data: { id: 1 } });

      const result = await userManager.updateProfile(1, { name: "Test" });

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalled();
    });

    it("returns error on POST failure", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1, email: "t@t.com" } });
      mockPost.mockRejectedValueOnce(new Error("Update failed"));

      const result = await userManager.updateProfile(1, { name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("returns error when userId is missing", async () => {
      const result = await userManager.updateProfile(undefined as unknown as number, {
        name: "X",
      });
      expect(result.success).toBe(false);
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("updates password successfully", async () => {
      mockPut.mockResolvedValueOnce({ data: { message: "OK" }, error: null });

      const result = await userManager.updatePassword("old123", "new456");

      expect(result.success).toBe(true);
      expect(mockPut).toHaveBeenCalledWith(
        "/api/users/change-password",
        expect.objectContaining({
          params: { query: { oldPass: "old123", newPass: "new456" } },
        })
      );
    });

    it("returns error on failure", async () => {
      mockPut.mockRejectedValueOnce(new Error("Wrong password"));

      const result = await userManager.updatePassword("old", "new");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Wrong password");
    });
  });

  describe("getSettings", () => {
    it("returns user settings", async () => {
      const settings = { theme: "dark", language: "vi" };
      mockGet.mockResolvedValueOnce({ data: settings, error: null });

      const result = await userManager.getSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await userManager.getSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe("fail");
    });
  });

  describe("updateSettings", () => {
    it("updates user settings", async () => {
      const settings = { theme: "light" };
      mockPost.mockResolvedValueOnce({ data: settings, error: null });

      const result = await userManager.updateSettings(settings);

      expect(result.success).toBe(true);
    });

    it("returns error on failure", async () => {
      mockPost.mockRejectedValueOnce(new Error("fail"));

      const result = await userManager.updateSettings({});

      expect(result.success).toBe(false);
      expect(result.error).toBe("fail");
    });
  });

  describe("subscribePlan", () => {
    it("sends correct params for plan subscription", async () => {
      const user = { id: 1, planId: 2 };
      mockPost.mockResolvedValueOnce({ data: user, error: null });

      const result = await userManager.subscribePlan(1, 2);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(user);
      expect(mockPost).toHaveBeenCalledWith("/api/users/subscribe", {
        params: { userId: 1, planId: 2 },
      });
    });

    it("returns error on failure", async () => {
      mockPost.mockRejectedValueOnce(new Error("fail"));

      const result = await userManager.subscribePlan(1, 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe("fail");
    });
  });

  describe("getActiveSubscription", () => {
    it("returns active subscription on success", async () => {
      const subscription = { planId: 1, planName: "BASIC", remainingSessions: 5 };
      mockGet.mockResolvedValueOnce({ data: subscription });

      const result = await userManager.getActiveSubscription(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(subscription);
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await userManager.getActiveSubscription(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("fail");
    });

    it("returns i18n fallback for non-Error throws", async () => {
      mockGet.mockRejectedValueOnce("string error");

      const result = await userManager.getActiveSubscription(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("general.unableToLoadActiveMembership"));
    });
  });
});
