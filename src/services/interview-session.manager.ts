import type {
  ApiResponse,
  InterviewConfigOptions,
  InterviewSession,
  InterviewSessionRedis,
  InterviewSetupRequest,
  JobRequirementData,
} from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import { fetchClient } from "@/lib/api";

export class InterviewSessionManager {
  async getConfigOptions(): Promise<ApiResponse<InterviewConfigOptions>> {
    try {
      const response = await fetchClient
        .GET("/api/interview-sessions/config-options", {})
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      // @ts-expect-error: Backend Swagger schema mismatch
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai cau hinh phong van",
      };
    }
  }

  async generateJobRequirement(jobDescription: string): Promise<ApiResponse<JobRequirementData>> {
    try {
      const response = await fetchClient
        .POST("/api/interview-sessions/generate-job-requirement", { body: jobDescription })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tao yeu cau cong viec",
      };
    }
  }

  async createSession(data: InterviewSetupRequest): Promise<ApiResponse<string>> {
    try {
      const response = await fetchClient
        .POST("/api/interview-sessions/create-session", { body: data })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tao phien phong van",
      };
    }
  }

  async getById(sessionId: number | string): Promise<ApiResponse<InterviewSession>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.INTERVIEW_SESSIONS.DETAIL, { sessionId });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      // @ts-expect-error: Backend Swagger schema mismatch
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai phien phong van",
      };
    }
  }

  async getByUserId(userId: number | string): Promise<ApiResponse<InterviewSession[]>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.INTERVIEW_SESSIONS.USER_SESSIONS, { userId });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      // @ts-expect-error: Backend Swagger schema mismatch
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai danh sach phong van",
      };
    }
  }

  async getFromCache(sessionKey: string): Promise<ApiResponse<InterviewSessionRedis>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.INTERVIEW_SESSIONS.CACHE, { sessionKey });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      // @ts-expect-error: Backend Swagger schema mismatch
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai trang thai phong van",
      };
    }
  }
}

export const interviewSessionManager = new InterviewSessionManager();
