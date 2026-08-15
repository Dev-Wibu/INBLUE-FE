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
  private extractErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;

    const value = error as {
      status?: unknown;
      statusCode?: unknown;
      response?: { status?: unknown; statusCode?: unknown };
    };
    const status =
      value.status ?? value.statusCode ?? value.response?.status ?? value.response?.statusCode;

    return typeof status === "number" ? status : undefined;
  }

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
      const message = this.extractErrorMessage(error);
      return {
        success: false,
        error: message,
        statusCode: this.extractErrorStatus(error),
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

            return { success: true, data: filtered };
          }
        } catch {
          // Intentionally ignored.
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
