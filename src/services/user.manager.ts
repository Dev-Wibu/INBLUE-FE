import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * User Manager
 * Handles user profile operations
 *
 * NOTE on the "me" endpoint:
 * The current backend does NOT expose `/api/users/me`. The Spring controller
 * only declares `GET /api/users/{id}` with `id: int`, so a literal "me"
 * path-segment was being parsed into an Integer converter and threw a 500
 * ("Failed to convert value of type 'java.lang.String' to required type
 * 'int'"). Anywhere the FE needs the current user's record, we resolve the
 * `userId` from the auth store and hit `/api/users/{userId}` instead.
 */

import type { ApiResponse, User, UserSubscriptionResponse } from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import { fetchClient } from "@/lib/api";

type UserProfile = Record<string, unknown>;
type UserSettings = Record<string, unknown>;

export class UserManager {
  /**
   * Get user profile by id.
   *
   * Pass the currently logged-in user's id (resolved from `useAuthStore`).
   * Avoids the broken `/api/users/me` path that caused 500s.
   */
  async getProfile(userId: number | string): Promise<ApiResponse<UserProfile>> {
    if (userId === undefined || userId === null || userId === "") {
      return {
        success: false,
        error: t("general.unableToLoadProfile"),
      };
    }
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.USERS.DETAIL, {
        id: Number(userId),
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToLoadProfile"),
      };
    }
  }

  /**
   * Update user profile.
   *
   * Internally:
   *   1. GET /api/users/{userId} — to read existing fields and preserve them
   *      (e.g. omit unchanged email to avoid duplicate-email validation).
   *   2. POST /api/users (multipart/form-data) — same update endpoint that
   *      Admin Staff uses; never piggybacks the password field for a profile
   *      change (see commit fixing the password wipe bug).
   */
  async updateProfile(
    userId: number | string,
    data: Partial<UserProfile>
  ): Promise<ApiResponse<UserProfile>> {
    if (userId === undefined || userId === null || userId === "") {
      return {
        success: false,
        error: t("general.unableToUpdateProfile"),
      };
    }
    try {
      const currentProfile = await this.getProfile(userId);
      const payload: Record<string, unknown> = { id: Number(userId), ...data };

      if (currentProfile.success && currentProfile.data) {
        // Prevent "Email đã tồn tại" error by omitting email if it hasn't changed
        if (data.email && currentProfile.data.email === data.email) {
          delete payload.email;
        }

        // Preserve existing name so a partial update doesn't blank it out.
        if (payload.name === undefined && currentProfile.data.name) {
          payload.name = currentProfile.data.name;
        }
      }
      // NEVER spread the existing password back into the update payload.
      // Backend treats a null password as "wipe" and was silently locking
      // out mentor/staff accounts (see fix commit).

      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .POST(API_ENDPOINTS.USERS.CREATE ?? "/api/users", { body: payload })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToUpdateProfile"),
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetchClient
        .PUT(
          // @ts-expect-error: Backend Swagger schema mismatch
          "/api/users/change-password",
          {
            params: {
              query: {
                oldPass: currentPassword,
                newPass: newPassword,
              },
            },
          }
        )
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToUpdatePassword"),
      };
    }
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<ApiResponse<UserSettings>> {
    try {
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .GET("/api/users/settings", {})
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToLoadSettings"),
      };
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    try {
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .POST("/api/users/settings", { body: settings })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToUpdateSettings"),
      };
    }
  }

  /**
   * Subscribe a user to a membership plan.
   * POST /api/users/subscribe?userId=&planId=
   */
  async subscribePlan(
    userId: number | string,
    planId: number | string
  ): Promise<ApiResponse<User>> {
    try {
      const response = await fetchClient
        .POST(
          // @ts-expect-error: Backend Swagger schema mismatch
          "/api/users/subscribe",
          {
            params: {
              userId: Number(userId),
              planId: Number(planId),
            },
          }
        )
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));

      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToRegisterForMembership"),
      };
    }
  }

  /**
   * Get active subscription and remaining quotas of a user.
   * GET /api/users/{userId}/subscription
   */
  async getActiveSubscription(
    userId: number | string
  ): Promise<ApiResponse<UserSubscriptionResponse>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.USER.ACTIVE_SUBSCRIPTION, {
        userId: Number(userId),
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToLoadActiveMembership"),
      };
    }
  }
}

// Export singleton instance
export const userManager = new UserManager();
