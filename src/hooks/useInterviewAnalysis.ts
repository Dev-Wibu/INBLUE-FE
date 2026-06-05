import { useMutation } from "@tanstack/react-query";

import i18n from "@/lib/i18n";
import { interviewAnalysisManager } from "@/services/interview-analysis.manager";

export const useAnalyzeFaceBehavior = () =>
  useMutation({
    mutationFn: async (image: File) => {
      const response = await interviewAnalysisManager.analyzeFaceBehavior(image);
      if (!response.success) {
        throw new Error(response.error || i18n.t("errors.cannotAnalyzeFaceBehavior"));
      }
      return response.data;
    },
  });
