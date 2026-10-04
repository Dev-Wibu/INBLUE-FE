import { API_ENDPOINTS } from "@/constants/api.config";
import type { ApiResponse, JobRecommendationThresholdResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";

export function isValidRecommendationThreshold(value: number): boolean {
  return (
    Number.isFinite(value) && value >= 0 && value <= 100 && Math.round(value * 100) === value * 100
  );
}

export function parseRecommendationThreshold(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return isValidRecommendationThreshold(parsed) ? parsed : null;
}

export interface JobDescriptionConfigResponse {
  id?: number;
  matchThresholdPercent?: number;
  updatedAt?: string;
}

export class JobRecommendationAdminManager {
  async getConfig(): Promise<ApiResponse<JobDescriptionConfigResponse>> {
    try {
      // Endpoint is not in schema-from-be.d.ts yet, so the typed client cannot infer it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (fetchClient as any).GET(API_ENDPOINTS.JOB_DESCRIPTIONS.CONFIG, {});
      return { success: true, data: data as JobDescriptionConfigResponse };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : i18n.t("jobRecommendationThreshold.loadFailed"),
      };
    }
  }

  async updateThreshold(
    thresholdPercent: number
  ): Promise<ApiResponse<JobRecommendationThresholdResponse>> {
    if (!isValidRecommendationThreshold(thresholdPercent)) {
      return {
        success: false,
        error: i18n.t("jobRecommendationThreshold.validation"),
      };
    }

    try {
      const { data } = await fetchClient.PUT("/api/admin/job-recommendation-threshold", {
        body: { thresholdPercent },
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : i18n.t("common.updateFailed"),
      };
    }
  }
}

export const jobRecommendationAdminManager = new JobRecommendationAdminManager();
