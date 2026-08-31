import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { entryTestManager } from "../api/entry-test.manager";
import { entryTestKeys } from "../api/entry-test.query-keys";
import type { EntryTestRunCodeRequest, EntryTestSubmitBody } from "../types/entry-test.types";

export function useStartEntryTest() {
  return useMutation({
    mutationFn: () => entryTestManager.start(),
    retry: false,
  });
}

export function useEntryTestResult(attemptId: number | null, enabled = true) {
  return useQuery({
    queryKey: entryTestKeys.attempt(attemptId ?? 0),
    queryFn: () => entryTestManager.getResult(attemptId as number),
    enabled: enabled && attemptId !== null,
    retry: (failureCount, error) =>
      ![401, 403, 404].includes((error as { status?: number }).status ?? 0) && failureCount < 2,
  });
}

export function useRunEntryTestCode(attemptId: number) {
  return useMutation({
    mutationFn: (body: EntryTestRunCodeRequest) => entryTestManager.runCode(attemptId, body),
    retry: false,
  });
}

export function useSubmitEntryTest(attemptId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EntryTestSubmitBody) => entryTestManager.submit(attemptId, body),
    retry: false,
    onSuccess: async (attempt) => {
      queryClient.setQueryData(entryTestKeys.attempt(attemptId), attempt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: entryTestKeys.competency() }),
        queryClient.invalidateQueries({ queryKey: entryTestKeys.preference() }),
      ]);
    },
  });
}

export function useCompetency(enabled = true) {
  return useQuery({
    queryKey: entryTestKeys.competency(),
    queryFn: () => entryTestManager.getCompetency(),
    enabled,
    retry: (failureCount, error) =>
      ![401, 403, 404].includes((error as { status?: number }).status ?? 0) && failureCount < 2,
  });
}
