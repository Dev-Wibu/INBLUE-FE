import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { entryTestManager } from "../api/entry-test.manager";
import { entryTestKeys } from "../api/entry-test.query-keys";
import type { UpsertCareerPreferenceBody } from "../types/entry-test.types";

export function useCareerPreferenceExists(enabled = true) {
  return useQuery({
    queryKey: entryTestKeys.preferenceExists(),
    queryFn: () => entryTestManager.hasPreference(),
    enabled,
    retry: (failureCount, error) =>
      ![401, 403].includes((error as { status?: number }).status ?? 0) && failureCount < 2,
  });
}

export function useCareerPreference(enabled = true) {
  return useQuery({
    queryKey: entryTestKeys.preference(),
    queryFn: () => entryTestManager.getPreference(),
    enabled,
    retry: (failureCount, error) =>
      ![401, 403, 404].includes((error as { status?: number }).status ?? 0) && failureCount < 2,
  });
}

export function useUpsertCareerPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertCareerPreferenceBody) => entryTestManager.upsertPreference(body),
    retry: false,
    onSuccess: (preference, variables) => {
      const mergedPreference = {
        ...preference,
        targetRole: preference.targetRole ?? variables.targetRole,
        languagesJson: preference.languagesJson ?? variables.languagesJson,
        careerGoal: preference.careerGoal ?? variables.careerGoal,
        targetLevel: preference.targetLevel ?? variables.targetLevel,
      };
      queryClient.setQueryData(entryTestKeys.preference(), mergedPreference);
      queryClient.setQueryData(entryTestKeys.preferenceExists(), true);
    },
  });
}

export function useSkipCareerPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => entryTestManager.skipPreference(),
    retry: false,
    onSuccess: (preference) => {
      queryClient.setQueryData(entryTestKeys.preference(), preference);
      queryClient.setQueryData(entryTestKeys.preferenceExists(), true);
    },
  });
}
