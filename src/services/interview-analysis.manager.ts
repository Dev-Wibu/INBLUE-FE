import type { ApiResponse, FaceAnalysisResponse } from "@/interfaces";

import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";

export class InterviewAnalysisManager {
  async analyzeFaceBehavior(image: File): Promise<ApiResponse<FaceAnalysisResponse>> {
    try {
      const formData = new FormData();
      formData.append("image", image);

      const response = await fetchClient
        .POST("/api/interview-analysis/face-behavior", {
          ...{
            headers: { "Content-Type": undefined },
          },
          // @ts-expect-error: Backend Swagger schema mismatch
          body: formData,
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
        error: error instanceof Error ? error.message : i18n.t("errors.cannotAnalyzeFaceBehavior"),
      };
    }
  }
}

export const interviewAnalysisManager = new InterviewAnalysisManager();
