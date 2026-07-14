import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Mentor Feedback Manager
 * Handles mentor feedback CRUD operations
 * Based on schema-from-be.d.ts API specification
 */

import type { ApiResponse, BaseManager, PaginatedResponse, PaginationParams } from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type { Mentor, Session, User } from "@/interfaces";
import { fetchClient } from "@/lib/api";

/**
 * MentorFeedback type based on backend schema
 */
export interface MentorFeedback {
  id?: number;
  session?: Session;
  mentor?: Mentor;
  user?: User;
  rating?: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create mentor feedback request based on backend schema
 */
export interface CreateMentorFeedbackRequest {
  sessionId?: number;
  mentorId?: number;
  userId?: number;
  rating?: number;
  comment?: string;
}

/**
 * Update mentor feedback request based on backend schema
 */
export interface UpdateMentorFeedbackRequest {
  id?: number;
  rating?: number;
  comment?: string;
}

export class MentorFeedbackManager implements BaseManager<MentorFeedback> {
  /**
   * Get all mentor feedbacks
   * GET /api/mentor-feedbacks
   */
  async getAll(
    _params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<MentorFeedback> | MentorFeedback[]>> {
    try {
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .GET("/api/mentor-feedbacks", { params: _params })
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
        error: error instanceof Error ? error.message : t("general.unableToLoadMentorFeedback"),
      };
    }
  }

  /**
   * Get mentor feedback by session ID
   * GET /api/mentor-feedbacks/{id}
   */
  async getById(id: string | number): Promise<ApiResponse<MentorFeedback>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR_FEEDBACKS.DETAIL, { id });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));

      if (!response.data || typeof response.data !== "object") {
        return {
          success: false,
          error: t("general.noResponsesFound"),
        };
      }

      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
      };
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; error?: string } } })
        ?.response?.data;
      const apiMessage = responseData?.message || responseData?.error;
      const errorMessage =
        typeof apiMessage === "string" && apiMessage.trim().length > 0
          ? apiMessage
          : error instanceof Error
            ? error.message
            : t("general.unableToLoadMentorFeedback1");

      return {
        success: false,
        error: /not found|no value present/i.test(errorMessage)
          ? t("general.noResponsesFound")
          : errorMessage,
      };
    }
  }

  /**
   * Get all feedbacks for a specific mentor
   * GET /api/mentor-feedbacks/mentor/{mentorId}
   */
  async getByMentorId(mentorId: string | number): Promise<ApiResponse<MentorFeedback[]>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR_FEEDBACKS.BY_MENTOR, { mentorId });
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
        error:
          error instanceof Error ? error.message : t("general.unableToDownloadFeedbackAccording"),
      };
    }
  }

  /**
   * Create new mentor feedback
   * POST /api/mentor-feedbacks (JSON body with CreateMentorFeedbackRequest)
   */
  async create(
    data: Partial<MentorFeedback> | CreateMentorFeedbackRequest
  ): Promise<ApiResponse<MentorFeedback>> {
    try {
      const response = await fetchClient
        .POST("/api/mentor-feedbacks", { body: data })
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
        error: error instanceof Error ? error.message : t("general.unableToCreateMentorResponse"),
      };
    }
  }

  /**
   * Update mentor feedback
   * PUT /api/mentor-feedbacks (JSON body with UpdateMentorFeedbackRequest)
   */
  async update(
    id: string | number,
    data: Partial<MentorFeedback> | UpdateMentorFeedbackRequest
  ): Promise<ApiResponse<MentorFeedback>> {
    try {
      const updateData: UpdateMentorFeedbackRequest = {
        id: Number(id),
        ...(data as UpdateMentorFeedbackRequest),
      };
      const response = await fetchClient
        .PUT("/api/mentor-feedbacks", { body: updateData })
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
        error: error instanceof Error ? error.message : t("general.unableToUpdateMentorResponse"),
      };
    }
  }

  /**
   * Delete mentor feedback (not supported by current API)
   */
  async delete(id: string | number): Promise<ApiResponse<void>> {
    void id;

    return {
      success: false,
      error: t("general.deleteMentorFeedbackIsNot"),
    };
  }
}

// Export singleton instance
export const mentorFeedbackManager = new MentorFeedbackManager();
