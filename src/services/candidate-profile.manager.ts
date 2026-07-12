import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Candidate Profile Manager
 * Handles candidate profile CRUD operations
 * Based on schema-from-be.d.ts API specification
 */

import type { ApiResponse, BaseManager, PaginatedResponse, PaginationParams } from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type { CandidateProfile } from "@/interfaces";

export class CandidateProfileManager implements BaseManager<CandidateProfile> {
  /**
   * Get all candidate profiles
   * GET /api/candidate-profiles
   */
  async getAll(
    _params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<CandidateProfile> | CandidateProfile[]>> {
    try {
      const response = await fetchClient
        .GET("/api/candidate-profiles", {
          // @ts-expect-error: Backend Swagger schema mismatch
          params: _params,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : t("general.unableToDownloadCandidateProfile"),
      };
    }
  }

  /**
   * Get candidate profile by user ID
   * GET /api/candidate-profiles/{userId}
   */
  async getByUserId(userId: number): Promise<ApiResponse<CandidateProfile>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.CANDIDATE_PROFILES.DETAIL, { userId });
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
        error:
          error instanceof Error ? error.message : t("general.unableToDownloadCandidateProfile1"),
      };
    }
  }

  /**
   * Create candidate profile
   * POST /api/candidate-profiles
   */
  async create(data: Partial<CandidateProfile>): Promise<ApiResponse<CandidateProfile>> {
    try {
      const response = await fetchClient
        .POST("/api/candidate-profiles", { body: data })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToCreateCandidateProfile"),
      };
    }
  }

  /**
   * Update candidate profile
   * PUT /api/candidate-profiles
   */
  async update(
    id: string | number,
    data: Partial<CandidateProfile>
  ): Promise<ApiResponse<CandidateProfile>> {
    try {
      const updateData = { id: Number(id), ...data };
      const response = await fetchClient
        .PUT("/api/candidate-profiles", { body: updateData })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToUpdateCandidateProfile"),
      };
    }
  }

  /**
   * Get candidate profile by ID
   * Uses getByUserId internally
   */
  async getById(id: string | number): Promise<ApiResponse<CandidateProfile>> {
    return this.getByUserId(Number(id));
  }

  /**
   * Delete candidate profile (not supported by current API)
   */
  async delete(id: string | number): Promise<ApiResponse<void>> {
    void id;

    return {
      success: false,
      error: t("general.doesNotSupportDeletingCandidate"),
    };
  }
}

// Export singleton instance
export const candidateProfileManager = new CandidateProfileManager();

// React Query hooks using $api
import { $api, fetchClient } from "@/lib/api";

export const useCandidateProfiles = () => $api.useQuery("get", "/api/candidate-profiles");
export const useCandidateProfile = (userId: number) =>
  $api.useQuery("get", "/api/candidate-profiles/{userId}", { params: { path: { userId } } });
export const useCreateCandidateProfile = () => $api.useMutation("post", "/api/candidate-profiles");
export const useUpdateCandidateProfile = () => $api.useMutation("put", "/api/candidate-profiles");
