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

type DynamicApiResponse<T> = { data?: T; error?: unknown };
type DynamicApiClient = {
  GET: <T>(path: string, options?: object) => Promise<DynamicApiResponse<T>>;
  POST: <T>(path: string, options?: object) => Promise<DynamicApiResponse<T>>;
  PUT: <T>(path: string, options?: object) => Promise<DynamicApiResponse<T>>;
};

// Entry Test is not in the generated OpenAPI schema yet. Keep the escape hatch isolated here.
const client = fetchClient as unknown as DynamicApiClient;

function requireData<T>(response: DynamicApiResponse<T>): T {
  if (response.data === undefined) throw new Error("API returned an empty response");
  return response.data;
}

export const entryTestManager = {
  async hasPreference() {
    return requireData(await client.GET<boolean>("/api/me/career-preference/exists"));
  },
  async getPreference() {
    return requireData(await client.GET<UserCareerPreference>("/api/me/career-preference"));
  },
  async upsertPreference(body: UpsertCareerPreferenceBody) {
    return requireData(
      await client.PUT<UserCareerPreference>("/api/me/career-preference", { body })
    );
  },
  async skipPreference() {
    return requireData(await client.POST<UserCareerPreference>("/api/me/career-preference/skip"));
  },
  async start() {
    return requireData(await client.POST<EntryTestStartResponse>("/api/entry-tests/start"));
  },
  async runCode(attemptId: number, body: EntryTestRunCodeRequest) {
    return requireData(
      await client.POST<CompilerRunResponse>(`/api/entry-tests/${attemptId}/coding/run`, {
        body,
      })
    );
  },
  async submit(attemptId: number, body: EntryTestSubmitBody) {
    return requireData(
      await client.POST<EntryTestAttemptResponse>(`/api/entry-tests/${attemptId}/submit`, {
        body,
      })
    );
  },
  async getResult(attemptId: number) {
    return requireData(
      await client.GET<EntryTestAttemptResponse>(`/api/entry-tests/attempts/${attemptId}/result`)
    );
  },
  async getCompetency() {
    return requireData(await client.GET<UserCompetencyResponse>("/api/me/competency"));
  },
};
