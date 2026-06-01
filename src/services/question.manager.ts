import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Question Manager
 * Handles question bank operations
 */

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type { ApiResponse, BaseManager, PaginatedResponse, PaginationParams } from "@/interfaces";
import { fetchClient } from "@/lib/api";

export interface PracticeQuestion {
  questionId?: number;
  title?: string;
  content?: string;
  level?: "EASY" | "MEDIUM" | "HARD";
  lesson?: {
    id?: number;
    lessonName?: string;
    description?: string;
    urlTutorial?: string;
  };
  answer?: string;
  hint?: string;
}
export class QuestionManager implements BaseManager<PracticeQuestion> {
  /**
   * Get all question sets
   */
  async getAll(
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<PracticeQuestion> | PracticeQuestion[]>> {
    try {
      const response = await fetchClient
        .GET("/api/practice-questions", {
          // @ts-expect-error: Backend Swagger schema mismatch
          params,
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
        error: error instanceof Error ? error.message : t("general.unableToLoadQuestion"),
      };
    }
  }

  /**
   * Get question set by ID (with full details including questions)
   */
  async getById(id: string | number): Promise<ApiResponse<PracticeQuestion>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION.DETAIL, {
        id,
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
        error: error instanceof Error ? error.message : t("general.unableToLoadQuestion"),
      };
    }
  }

  /**
   * Create new question
   * POST /api/practice-questions (JSON body)
   * Backend requires full PracticeQuestion schema including questionId: 0 for creation
   */
  async create(data: Partial<PracticeQuestion>): Promise<ApiResponse<PracticeQuestion>> {
    try {
      // Backend requires questionId: 0 for creation to avoid null int parse error
      const questionPayload = {
        questionId: 0,
        ...data,
      };
      const response = await fetchClient
        .POST("/api/practice-questions", { body: questionPayload })
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
        error: error instanceof Error ? error.message : t("common.cannotCreateQuestion"),
      };
    }
  }

  /**
   * Update question
   * POST /api/practice-questions (JSON body)
   * Backend requires full PracticeQuestion schema including questionId
   */
  async update(
    id: string | number,
    data: Partial<PracticeQuestion>
  ): Promise<ApiResponse<PracticeQuestion>> {
    try {
      // Backend requires questionId in body for update
      const questionPayload = {
        questionId: Number(id),
        ...data,
      };
      // Use POST for updates (backend treats questionId > 0 as update)
      const response = await fetchClient
        .POST("/api/practice-questions", { body: questionPayload })
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
        error: error instanceof Error ? error.message : t("common.unableToUpdateQuestion"),
      };
    }
  }

  /**
   * Delete question
   * DELETE /api/practice-questions/{id}
   */
  async delete(id: string | number): Promise<ApiResponse<void>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION.DELETE, {
        id,
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      await fetchClient.DELETE(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.questionCannotBeDeleted"),
      };
    }
  }

  /**
   * Search question sets by text
   */
  async search(
    searchText: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<PracticeQuestion> | PracticeQuestion[]>> {
    try {
      const response = await fetchClient
        .GET("/api/practice-questions", {
          params: {
            ...params,
            // @ts-expect-error: Backend Swagger schema mismatch
            search: searchText,
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
        error: error instanceof Error ? error.message : t("general.cannotSearchForQuestion"),
      };
    }
  }
  /**
   * Get random questions by level
   * GET /api/practice-questions/random-by-level?level={level}&count={count}
   */
  async getRandomByLevel(level: string, count: number): Promise<ApiResponse<PracticeQuestion[]>> {
    try {
      const response = await fetchClient
        .GET("/api/practice-questions/random-by-level", {
          params: {
            // @ts-expect-error: Backend Swagger schema mismatch
            level,
            count,
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
        error: error instanceof Error ? error.message : t("common.unableToLoadRandomQuestions"),
      };
    }
  }

  /**
   * Get questions by category and level
   * GET /api/practice-questions/by-category-level?categoryId={categoryId}&level={level}
   */
  async getByCategoryAndLevel(
    categoryId: number,
    level: string
  ): Promise<ApiResponse<PracticeQuestion[]>> {
    try {
      const response = await fetchClient
        .GET("/api/practice-questions/by-category-level", {
          params: {
            // @ts-expect-error: Backend Swagger schema mismatch
            categoryId,
            level,
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
        error: error instanceof Error ? error.message : t("general.questionsByCategoryAndLevel"),
      };
    }
  }

  /**
   * Bulk create questions
   * POST /api/practice-questions/save-all
   * Body: PracticeQuestion[]
   */
  async saveAll(questions: PracticeQuestion[]): Promise<ApiResponse<PracticeQuestion[]>> {
    try {
      const response = await fetchClient
        .POST("/api/practice-questions/save-all", { body: questions })
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
        error: error instanceof Error ? error.message : t("general.questionCannotBeSaved"),
      };
    }
  }
}

// Export singleton instance
export const questionManager = new QuestionManager();
