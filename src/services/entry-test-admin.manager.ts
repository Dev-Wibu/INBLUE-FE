import { fetchClient } from "@/lib/api";

import type { EntryTestSectionConfig } from "@/features/entry-test/types/entry-test.types";

export type AdminEntryTest = {
  id?: number;
  name?: string;
  totalScore?: number;
  timeLimitMinutes?: number;
  sectionConfigs?: EntryTestSectionConfig[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminLevelScale = {
  id?: number;
  targetRole?: "BE" | "FE" | "QA_QC" | "BA" | "DEVOPS" | "DATA";
  level?: "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE";
  minScore?: number;
  maxScore?: number;
  minCodingScore?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminEntryTestPayload = Omit<AdminEntryTest, "id" | "createdAt" | "updatedAt">;
export type AdminLevelScalePayload = Omit<AdminLevelScale, "id" | "createdAt" | "updatedAt">;

// Entry Test admin endpoints are generated from the live backend schema.
// Keep the small cast boundary here because the generated DTOs are optional.
const api = fetchClient as unknown as {
  GET: (path: string, options?: object) => Promise<{ data?: unknown }>;
  POST: (path: string, options?: object) => Promise<{ data?: unknown }>;
  PUT: (path: string, options?: object) => Promise<{ data?: unknown }>;
  DELETE: (path: string, options?: object) => Promise<{ data?: unknown }>;
};

const dataOf = <T>(response: { data?: unknown }) => response.data as T;

export const entryTestAdminManager = {
  async listEntryTests() {
    return dataOf<AdminEntryTest[]>(await api.GET("/api/admin/entry-tests"));
  },
  async createEntryTest(body: AdminEntryTestPayload) {
    return dataOf<AdminEntryTest>(await api.POST("/api/admin/entry-tests", { body }));
  },
  async updateEntryTest(id: number, body: Partial<AdminEntryTestPayload>) {
    return dataOf<AdminEntryTest>(
      await api.PUT("/api/admin/entry-tests/{id}", { params: { path: { id } }, body })
    );
  },
  async deactivateEntryTest(id: number) {
    return dataOf<AdminEntryTest>(
      await api.DELETE("/api/admin/entry-tests/{id}", { params: { path: { id } } })
    );
  },
  async listLevelScales() {
    return dataOf<AdminLevelScale[]>(await api.GET("/api/admin/level-scales"));
  },
  async createLevelScale(body: AdminLevelScalePayload) {
    return dataOf<AdminLevelScale>(await api.POST("/api/admin/level-scales", { body }));
  },
  async upsertLevelScaleSet(
    targetRole: AdminLevelScale["targetRole"],
    scales: AdminLevelScalePayload[]
  ) {
    return dataOf<AdminLevelScale[]>(
      await api.POST("/api/admin/level-scales/set", { body: { targetRole, scales } })
    );
  },
  async updateLevelScale(id: number, body: Partial<AdminLevelScalePayload>) {
    return dataOf<AdminLevelScale>(
      await api.PUT("/api/admin/level-scales/{id}", { params: { path: { id } }, body })
    );
  },
  async deactivateLevelScale(id: number) {
    return dataOf<AdminLevelScale>(
      await api.DELETE("/api/admin/level-scales/{id}", { params: { path: { id } } })
    );
  },
};
