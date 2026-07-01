import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);

export interface Application {
  id?: number;
  userId?: number;
  jdId?: number;
  currentRoundOrder?: number;
  status?: "IN_PROGRESS" | "PASSED" | "FAILED" | "SOFT_FAILED";
  overallScore?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
class ApplicationService {
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "response" in error) {
      return (
        // @ts-expect-error: Backend Swagger schema mismatch
        error.response?.data?.message ||
        // @ts-expect-error: Backend Swagger schema mismatch
        error.message ||
        t("common.anErrorHasOccurred")
      );
    }
    if (error instanceof Error) {
      return error.message;
    }
    return t("general.anUnknownErrorHasOccurred");
  }

  /**
   * Apply for a job
   * POST /api/applications?jdId={jdId}
   */
  async apply(jdId: number): Promise<ApiResponse<Application>> {
    try {
      const response = await fetchClient
        .POST("/api/applications", {
          params: {
            // @ts-expect-error: Backend Swagger schema mismatch
            path: {
              jdId: jdId,
            },
            query: {
              jdId: jdId,
            },
          },
        })
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
      console.error("[ApplicationService] Apply error:", error);
      const message = this.extractErrorMessage(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get all applications
   * GET /api/applications
   */
  async getAll(): Promise<ApiResponse<Application[]>> {
    try {
      const response = await fetchClient.GET("/api/applications", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("[ApplicationService] GetAll error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get application by ID
   * GET /api/applications/{id}
   */
  async getById(id: number): Promise<ApiResponse<Application>> {
    try {
      const response = await fetchClient
        .GET("/api/applications/{id}", {
          params: {
            path: {
              id: id,
            },
          },
        })
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
      console.error("[ApplicationService] GetById error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get all applications for current user
   * GET /api/applications/me
   * Falls back to GET /api/applications + client-side filter by userId on 403
   */
  async getMyApplications(): Promise<ApiResponse<Application[]>> {
    try {
      const response = await fetchClient.GET("/api/applications/me", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.warn("[ApplicationService] getMyApplications /me failed, trying fallback:", error);
      const errorStatus =
        (error as { status?: number }).status ??
        (error as { response?: { status?: number } }).response?.status;
      if (errorStatus === 403) {
        try {
          const all = await fetchClient.GET("/api/applications", {}).then((res) => res.data);
          if (all && Array.isArray(all)) {
            // userId on Application matches the backend user.id (number)
            // AuthStore user.id is number from schema-from-be User type
            const { useAuthStore } = await import("@/stores/authStore");
            const currentUserId = useAuthStore.getState().user?.id;
            const filtered = (all as Application[]).filter((a) => a.userId === currentUserId);
            console.log(
              "[ApplicationService] getMyApplications fallback: fetched",
              all.length,
              "apps, filtered to",
              filtered.length,
              "for userId",
              currentUserId
            );
            return { success: true, data: filtered };
          }
        } catch (fallbackError) {
          console.error(
            "[ApplicationService] getMyApplications fallback also failed:",
            fallbackError
          );
        }
      }
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }
}
export const applicationService = new ApplicationService();
