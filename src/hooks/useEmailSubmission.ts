import { fetchClient } from "@/lib/api";
import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import { useQuery } from "@tanstack/react-query";
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

/**
 * Fetch all email submissions (admin) and filter by applicationId client-side.
 * The backend does not expose a query-param filter for this endpoint.
 *
 * GET /api/email-submissions
 */
export const useEmailSubmissionsForApplication = (applicationId: number | null, enabled = true) => {
  return useQuery({
    queryKey: ["emailSubmissions", "byApplication", applicationId],
    queryFn: async (): Promise<EmailSubmission[]> => {
      if (applicationId == null) return [];
      const result = await fetchClient.GET("/api/email-submissions", {});
      if (!result.response?.ok) {
        const traceId = (result.response?.headers?.get("traceId") as string) || "unknown";
        throw new Error(
          getNormalizedErrorMessage(new Error(`HTTP ${result.response?.status}`), traceId)
        );
      }
      // List endpoint ⇒ { traceId, data: EmailSubmission[] }
      const data = ((result.data as { data?: EmailSubmission[] })?.data ?? []) as EmailSubmission[];
      return data
        .filter((e) => e.applicationId === applicationId)
        .sort(
          (a, b) =>
            new Date(b.receivedAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.receivedAt ?? a.createdAt ?? 0).getTime()
        );
    },
    enabled: enabled && applicationId != null,
    staleTime: 5_000,
    refetchInterval: (query) => {
      // Auto-poll every 10s only when the dialog is open AND at least one
      // submission is still in PENDING. Stop polling once we hit a terminal
      // status (PROCESSED / ERROR / IGNORED) so we don't burn API quota.
      const data = query.state.data as EmailSubmission[] | undefined;
      if (!data || data.length === 0) return 10_000;
      const hasPending = data.some((e) => e.status === "PENDING");
      return hasPending ? 10_000 : false;
    },
  });
};
