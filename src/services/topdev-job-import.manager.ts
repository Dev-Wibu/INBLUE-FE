import type { components, operations } from "../../schema-from-be";

import { fetchClient } from "@/lib/api";

export type TopDevJobCategory = components["schemas"]["TopDevJobCategoryResponse"];
export type TopDevJobPreview = components["schemas"]["TopDevJobPreviewResponse"];
export type TopDevJobImportRequest = components["schemas"]["TopDevJobImportRequest"];
export type TopDevJobImportResponse = components["schemas"]["TopDevJobImportResponse"];
export type TopDevSearchParams = NonNullable<operations["searchTopDevJobs"]["parameters"]["query"]>;

export class TopDevJobImportManager {
  async getCategories(): Promise<TopDevJobCategory[]> {
    const { data } = await fetchClient.GET("/api/admin/job-import/topdev/categories");
    return data ?? [];
  }

  async search(params: TopDevSearchParams): Promise<TopDevJobPreview[]> {
    const { data } = await fetchClient.GET("/api/admin/job-import/topdev/search", {
      params: { query: params },
    });
    return data ?? [];
  }

  async importJob(payload: TopDevJobImportRequest): Promise<TopDevJobImportResponse> {
    const { data } = await fetchClient.POST("/api/admin/job-import/topdev/import", {
      body: payload,
    });
    return data ?? {};
  }
}

export const topDevJobImportManager = new TopDevJobImportManager();
