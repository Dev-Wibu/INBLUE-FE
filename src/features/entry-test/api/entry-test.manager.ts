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

export const entryTestManager = {
  async hasPreference() {
    return requireData(await fetchClient.GET("/api/me/career-preference/exists"));
  },
  async getPreference() {
    return requireData(await fetchClient.GET("/api/me/career-preference")) as UserCareerPreference;
  },
  async upsertPreference(body: UpsertCareerPreferenceBody) {
    const requestBody = {
      targetRole: body.targetRole,
      languagesJson: body.languagesJson ?? undefined,
      careerGoal: body.careerGoal ?? undefined,
      targetLevel: body.targetLevel ?? undefined,
    };
    return requireData(
      await fetchClient.PUT("/api/me/career-preference", { body: requestBody })
    ) as UserCareerPreference;
  },
  async skipPreference() {
    return requireData(
      await fetchClient.POST("/api/me/career-preference/skip")
    ) as UserCareerPreference;
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
