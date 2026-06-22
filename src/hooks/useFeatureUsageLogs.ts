import type { FeatureName } from "@/interfaces";
import { $api } from "@/lib/api";

export const useFeatureUsageLogsByFeature = (featureName: FeatureName, enabled = true) =>
  (
    $api.useQuery as (
      method: "get",
      path: string,
      params?: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => ReturnType<typeof $api.useQuery>
  )("get", "/api/feature-usage-logs", { params: { query: { featureName } } }, { enabled });
