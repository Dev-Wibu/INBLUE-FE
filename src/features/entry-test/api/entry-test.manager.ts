import { fetchClient } from "@/lib/api";

import type {
  CompilerRunResponse,
  EntryTestAttemptResponse,
  EntryTestRunCodeRequest,
  EntryTestStartResponse,
  EntryTestSubmitBody,
  UpsertCareerPreferenceBody,
  UserCareerPreference,
  UserCompetencyResponse,
} from "../types/entry-test.types";

function requireData<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("API returned an empty response");
  return response.data;
}

function normalizePreference(value: unknown): UserCareerPreference {
  const record = (value ?? {}) as Record<string, unknown>;
  const languages =
    record.languagesJson ?? record.languages ?? record.skills ?? record.selectedLanguagesJson;
  const normalizedLanguages =
    typeof languages === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(languages) as unknown;
            return Array.isArray(parsed) ? parsed : [languages];
          } catch {
            return languages ? [languages] : [];
          }
        })()
      : languages;
  return {
    ...(record as unknown as UserCareerPreference),
    languagesJson: Array.isArray(normalizedLanguages)
      ? normalizedLanguages.filter((item): item is string => typeof item === "string")
      : null,
  };
}

export const entryTestManager = {
  async hasPreference() {
    return requireData(await fetchClient.GET("/api/me/career-preference/exists"));
  },
  async getPreference() {
    return normalizePreference(requireData(await fetchClient.GET("/api/me/career-preference")));
  },
  async upsertPreference(body: UpsertCareerPreferenceBody) {
    const requestBody = {
      targetRole: body.targetRole,
      languagesJson: body.languagesJson ?? undefined,
      careerGoal: body.careerGoal ?? undefined,
      targetLevel: body.targetLevel ?? undefined,
    };
    return normalizePreference(
      requireData(await fetchClient.PUT("/api/me/career-preference", { body: requestBody }))
    );
  },
  async skipPreference() {
    return normalizePreference(
      requireData(await fetchClient.POST("/api/me/career-preference/skip"))
    );
  },
  async start() {
    return requireData(await fetchClient.POST("/api/entry-tests/start")) as EntryTestStartResponse;
  },
  async runCode(attemptId: number, body: EntryTestRunCodeRequest) {
    return requireData(
      await fetchClient.POST("/api/entry-tests/{attemptId}/coding/run", {
        body,
        params: { path: { attemptId } },
      })
    ) as CompilerRunResponse;
  },
  async submit(attemptId: number, body: EntryTestSubmitBody) {
    return requireData(
      await fetchClient.POST("/api/entry-tests/{attemptId}/submit", {
        body,
        params: { path: { attemptId } },
      })
    ) as EntryTestAttemptResponse;
  },
  async getResult(attemptId: number) {
    return requireData(
      await fetchClient.GET("/api/entry-tests/attempts/{attemptId}/result", {
        params: { path: { attemptId } },
      })
    ) as EntryTestAttemptResponse;
  },
  async getCompetency() {
    return requireData(await fetchClient.GET("/api/me/competency")) as UserCompetencyResponse;
  },
};
