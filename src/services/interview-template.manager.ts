import type {
  ApiResponse,
  DetailResponse,
  SummaryResponse,
  UpsertTemplateRequest,
} from "@/interfaces";

import { fetchClient } from "@/lib/api";

export class InterviewTemplateManager {
  async getAllTemplates(): Promise<ApiResponse<SummaryResponse[]>> {
    try {
      const response = await fetchClient.GET("/api/templates", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return { success: true, data: response.data ?? [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot load interview templates",
      };
    }
  }

  async getTemplateById(id: number | string): Promise<ApiResponse<DetailResponse>> {
    try {
      const response = await fetchClient
        .GET("/api/templates/{id}", {
          params: {
            path: { id: Number(id) },
          },
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      if (!response.data) throw new Error("Template not found");
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot load template details",
      };
    }
  }

  async createTemplate(data: UpsertTemplateRequest): Promise<ApiResponse<number>> {
    try {
      const response = await fetchClient
        .POST("/api/templates", {
          body: data,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      if (typeof response.data !== "number") {
        throw new Error("Invalid response from server");
      }
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot create interview template",
      };
    }
  }

  async updateTemplate(
    id: number | string,
    data: UpsertTemplateRequest
  ): Promise<ApiResponse<void>> {
    try {
      await fetchClient.PUT("/api/templates/{id}", {
        params: {
          path: { id: Number(id) },
        },
        body: data,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot update interview template",
      };
    }
  }

  async deleteTemplate(id: number | string): Promise<ApiResponse<void>> {
    try {
      await fetchClient.DELETE("/api/templates/{id}", {
        params: {
          path: { id: Number(id) },
        },
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot delete interview template",
      };
    }
  }
}

export const interviewTemplateManager = new InterviewTemplateManager();
