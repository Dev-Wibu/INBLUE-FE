import type {
  ApiResponse,
  Round,
  RoundType,
  SetupJdRoundsRequest,
  UpdateJdRoundRequest,
} from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";

export class RoundManager {
  async getAvailableRoundTypes(): Promise<ApiResponse<RoundType[]>> {
    try {
      const response = await fetchClient.GET("/api/rounds", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cannot load available round types",
      };
    }
  }

  async setUpForJd(
    jdId: number | string,
    data: SetupJdRoundsRequest
  ): Promise<ApiResponse<Round[]>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.ROUNDS.SETUP_JD, { jdId });
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .PUT(endpoint, { body: data })
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
        error: error instanceof Error ? error.message : i18n.t("errors.cannotSetUpInterviewRounds"),
      };
    }
  }

  async updateForJd(
    jdId: number | string,
    data: UpdateJdRoundRequest
  ): Promise<ApiResponse<Round[]>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.ROUNDS.UPDATE_JD, { jdId });
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch
        .PUT(endpoint, { body: data })
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
        error:
          error instanceof Error ? error.message : i18n.t("errors.cannotUpdateInterviewRounds"),
      };
    }
  }
}

export const roundManager = new RoundManager();
