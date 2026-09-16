import { fetchClient } from "@/lib/api";
import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import {
  emailSubmissionManager,
  type EmailSubmissionRecord,
} from "@/services/email-submission.manager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../schema-from-be";

export type EmailSubmission = components["schemas"]["EmailSubmission"];

/**
 * Fetch a single email submission detail by ID
 * GET /api/email-submissions/{id}
 */
export const useEmailSubmission = (id: number, enabled = true) => {
  return useQuery({
    queryKey: ["emailSubmission", id],
    queryFn: async (): Promise<EmailSubmission> => {
      const result = await fetchClient.GET("/api/email-submissions/{id}", {
        params: { path: { id } },
      });

      if (!result.response?.ok) {
        const traceId = (result.response?.headers?.get("traceId") as string) || "unknown";
        throw new Error(
          getNormalizedErrorMessage(new Error(`HTTP ${result.response?.status}`), traceId)
        );
      }

      return result.data as EmailSubmission;
    },
    enabled: enabled && id > 0,
    staleTime: 30_000,
  });
};

export const useEmailSubmissions = (enabled = true) =>
  useQuery({
    queryKey: ["emailSubmissions"],
    queryFn: (): Promise<EmailSubmissionRecord[]> => emailSubmissionManager.list(),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

export const useFetchEmailMailbox = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emailSubmissionManager.fetchMailbox(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["emailSubmissions"] });
    },
  });
};

export const useProcessPendingEmails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emailSubmissionManager.processPending(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["emailSubmissions"] });
      void queryClient.invalidateQueries({ queryKey: ["applicationDetails"] });
      void queryClient.invalidateQueries({ queryKey: ["get", "/api/applications"] });
    },
  });
};
