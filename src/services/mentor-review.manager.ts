import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Mentor Review Manager
 * Handles mentor review CRUD operations
 * Based on schema-from-be.d.ts API specification
 */

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type {
  ApiResponse,
  BaseManager,
  Mentor,
  PaginatedResponse,
  PaginationParams,
  Session,
  User,
} from "@/interfaces";
import { fetchClient } from "@/lib/api";

/**
 * Pull the most specific message off an unknown error object so we can
 * pattern-match BE error responses (FE fetchClient wraps them under
 * `.response.data`).
 */
function responseMessageFromError(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const data = (err as { response?: { data?: unknown } }).response?.data;
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const o = data as { message?: unknown; error?: unknown };
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return undefined;
}

/**
 * MentorReview type based on backend schema
 */
export interface MentorReview {
  id?: number;
  session?: Session;
  mentor?: Mentor;
  user?: User;
  rating?: number;
  situationNote?: string;
  taskNote?: string;
  actionNote?: string;
  resultNote?: string;
  strength?: string;
  weakness?: string;
  improve?: string;
}

/**
 * Create mentor review request based on backend schema
 */
export interface CreateMentorReviewRequest {
  sessionId?: number;
  mentorId?: number;
  userId?: number;
  rating?: number;
  situationNote?: string;
  taskNote?: string;
  actionNote?: string;
  resultNote?: string;
  strength?: string;
  weakness?: string;
  improve?: string;
}

/**
 * Update mentor review request based on backend schema
 */
export interface UpdateMentorReviewRequest {
  id?: number;
  rating?: number;
  situationNote?: string;
  taskNote?: string;
  actionNote?: string;
  resultNote?: string;
  strength?: string;
  weakness?: string;
  improve?: string;
}
export class MentorReviewManager implements BaseManager<MentorReview> {
  /**
   * Get all mentor reviews
   * GET /api/mentor-reviews
   */
  async getAll(
    _params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<MentorReview> | MentorReview[]>> {
    try {
      const response = await fetchClient
        .GET("/api/mentor-reviews", {
          // @ts-expect-error: Backend Swagger schema mismatch
          params: _params,
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
        error: error instanceof Error ? error.message : t("general.unableToLoadMentorEvaluation"),
      };
    }
  }

  /**
   * Get mentor review by ID
   * GET /api/mentor-reviews/{id}
   */
  async getById(id: string | number): Promise<ApiResponse<MentorReview>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR_REVIEWS.DETAIL, {
        id,
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      if (!response.data || typeof response.data !== "object") {
        return {
          success: false,
          error: t("common.noReviewsFound"),
        };
      }
      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
      };
    } catch (error) {
      const responseData = (
        error as {
          response?: {
            data?: {
              message?: string;
              error?: string;
            };
          };
        }
      )?.response?.data;
      const apiMessage = responseData?.message || responseData?.error;
      const errorMessage =
        typeof apiMessage === "string" && apiMessage.trim().length > 0
          ? apiMessage
          : error instanceof Error
            ? error.message
            : t("general.unableToLoadMentorReview");
      return {
        success: false,
        error: /not found|no value present/i.test(errorMessage)
          ? t("common.noReviewsFound")
          : errorMessage,
      };
    }
  }

  /**
   * Create new mentor review
   * POST /api/mentor-reviews (JSON body with CreateMentorReviewRequest)
   *
   * BE v062 quirk: if a MentorReview already exists for the same session
   * BE responds with HTTP 500 and a raw PostgreSQL duplicate-key error
   * (visible in the response body). Until BE fixes the cascade, we
   * detect that signature client-side and surface a friendly message so
   * users don't see the raw SQL.
   */
  async create(
    data: Partial<MentorReview> | CreateMentorReviewRequest
  ): Promise<ApiResponse<MentorReview>> {
    try {
      const response = await fetchClient
        .POST("/api/mentor-reviews", { body: data })
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
      const rawMessage = error instanceof Error ? error.message : "";
      const message = responseMessageFromError(error) ?? "";
      if (/mentorreview_pkey|duplicate key value/i.test(rawMessage + message)) {
        return {
          success: false,
          error: t(
            "general.mentorReviewAlreadyExists",
            "A mentor review for this session already exists. Please use Update instead."
          ),
        };
      }
      return {
        success: false,
        error: rawMessage || t("general.unableToCreateMentorReview"),
      };
    }
  }

  /**
   * Update mentor review
   * PUT /api/mentor-reviews (JSON body with UpdateMentorReviewRequest)
   */
  async update(
    id: string | number,
    data: Partial<MentorReview> | UpdateMentorReviewRequest
  ): Promise<ApiResponse<MentorReview>> {
    try {
      const updateData: UpdateMentorReviewRequest = {
        id: Number(id),
        ...(data as UpdateMentorReviewRequest),
      };
      const response = await fetchClient
        .PUT("/api/mentor-reviews", { body: updateData })
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
        error: error instanceof Error ? error.message : t("general.unableToUpdateMentorRating"),
      };
    }
  }

  /**
   * Delete mentor review (not supported by current API)
   */
  async delete(id: string | number): Promise<ApiResponse<void>> {
    void id;
    return {
      success: false,
      error: t("general.deletingMentorReviewsIsNot"),
    };
  }
}

// Export singleton instance
export const mentorReviewManager = new MentorReviewManager();
