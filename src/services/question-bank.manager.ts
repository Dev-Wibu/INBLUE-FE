import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import type { QuestionCategory } from "./question-category.manager";

export interface QuestionBank {
  id?: number;
  questionCategory?: QuestionCategory;
  questionLevel?: "EASY" | "MEDIUM" | "HARD";
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  isDeleted?: boolean;
}

export interface QuestionGenerateRequest {
  categoryName?: string;
  difficulty?: string;
  topics?: string[];
  additionalPrompt?: string;
}

export interface QuestionGenerateResponse {
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
}

export interface QuestionBankFormData {
  questionCategoryId?: number;
  questionLevel?: "EASY" | "MEDIUM" | "HARD";
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  isDeleted?: boolean;
}

export class QuestionBankManager {
  private baseEndpoint = API_ENDPOINTS.QUESTION_BANKS.BASE;

  async getAll(): Promise<ApiResponse<QuestionBank[]>> {
    try {
      const { data, error } = await fetchClient.GET(this.baseEndpoint);
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionBank[],
      };
    } catch {
      return {
        success: false,
        error: "Failed to fetch question banks",
      };
    }
  }

  async getById(id: number): Promise<ApiResponse<QuestionBank>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION_BANKS.DETAIL, { id });
      // @ts-expect-error dynamic path
      const { data, error } = await fetchClient.GET(endpoint);
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionBank,
      };
    } catch {
      return {
        success: false,
        error: `Failed to fetch question bank ${id}`,
      };
    }
  }

  async create(payload: QuestionBankFormData): Promise<ApiResponse<QuestionBank>> {
    try {
      const body = {
        questionCategoryId: payload.questionCategoryId ?? 0,
        questionLevel: payload.questionLevel ?? "EASY",
        questionText: payload.questionText ?? "",
        options: payload.options ?? [],
        correctAnswer: payload.correctAnswer ?? "",
      };
      const { data, error } = await fetchClient.POST(this.baseEndpoint, {
        body: body as never,
      });
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionBank,
      };
    } catch {
      return {
        success: false,
        error: "Failed to create question bank",
      };
    }
  }

  /**
   * Update full question-bank fields (used by the editor form).
   *
   * NOTE: This sends the full payload (category, level, text, options, ...).
   * It is NOT the right call for activate / inactivate - use toggleStatus()
   * instead, which sends ONLY `{ isDeleted }` per the backend spec.
   */
  async update(id: number, payload: QuestionBankFormData): Promise<ApiResponse<QuestionBank>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION_BANKS.DETAIL, { id });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        questionCategoryId: payload.questionCategoryId ?? 0,
        questionLevel: payload.questionLevel ?? "EASY",
        questionText: payload.questionText ?? "",
        options: payload.options ?? [],
        correctAnswer: payload.correctAnswer ?? "",
      };

      if (payload.isDeleted !== undefined) {
        body.isDeleted = payload.isDeleted;
      }

      // @ts-expect-error dynamic path
      const { data, error } = await fetchClient.PUT(endpoint, {
        body: body as never,
      });
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionBank,
      };
    } catch {
      return {
        success: false,
        error: "Failed to update question bank",
      };
    }
  }

  /**
   * Toggle the isDeleted flag without touching any other field.
   *
   * The backend PUT /api/question-banks/{id} runs field-level validation
   * (questionText @Size(min=1), options required, ...) when the field is
   * present in the body. Sending an empty body, or omitting required
   * fields, returns 400 Bad Request. The backend's documented contract
   * for the activate / inactivate flow is a PUT with ONLY `{ isDeleted }`,
   * so we isolate that call here.
   *
   * Use DELETE instead when the desired new state is isDeleted=true, per
   * the docs.
   */
  async toggleStatus(id: number, isDeleted: boolean): Promise<ApiResponse<QuestionBank>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION_BANKS.DETAIL, { id });
      // @ts-expect-error dynamic path
      const { data, error } = await fetchClient.PUT(endpoint, {
        body: { isDeleted } as never,
      });
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionBank,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Failed to toggle question status",
      };
    }
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.QUESTION_BANKS.DETAIL, { id });
      // @ts-expect-error dynamic path
      const { error } = await fetchClient.DELETE(endpoint);
      if (error) throw new Error(JSON.stringify(error));
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Failed to delete question bank",
      };
    }
  }

  async generateByAI(
    payload: QuestionGenerateRequest
  ): Promise<ApiResponse<QuestionGenerateResponse>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await fetchClient.POST(`${this.baseEndpoint}/generate` as any, {
        body: payload as never,
      });
      if (error) throw new Error(JSON.stringify(error));
      return {
        success: true,
        data: data as QuestionGenerateResponse,
      };
    } catch {
      return {
        success: false,
        error: "Failed to generate question bank by AI",
      };
    }
  }
}

export const questionBankManager = new QuestionBankManager();
