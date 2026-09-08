import type { ApiResponse, JobRecommendationThresholdResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";

export function isValidRecommendationThreshold(value: number): boolean {
  return (
    Number.isFinite(value) && value >= 0 && value <= 100 && Math.round(value * 100) === value * 100
  );
}

export function parseRecommendationThreshold(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return isValidRecommendationThreshold(parsed) ? parsed : null;
}

export class JobRecommendationAdminManager {
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
