import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import i18n from "@/lib/i18n";
import type {
  MentorPendingScheduleResponse,
  ScheduleDecisionRequest,
} from "@/services/application-detail.manager";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { components } from "../../schema-from-be";

const t = i18n.t.bind(i18n);

export type ApplicationDetail = components["schemas"]["ApplicationDetail"];
export type MentorResponse = components["schemas"]["MentorResponse"];

export interface HrScoreParams {
  applicationDetailId: number;
  isPass: boolean;
  note: string;
  score: number;
}

// ============================================================
// Query Hooks
// ============================================================

/**
 * Get all application details (all rounds) for a specific application
 * GET /api/application-details/application/{applicationId}
 */
export const useApplicationDetails = (applicationId: number, enabled = true) => {
  return useQuery({
    queryKey: ["applicationDetails", "byApplicationId", applicationId],
    queryFn: async (): Promise<ApplicationDetail[]> => {
      const result = await applicationDetailManager.getByApplicationId(applicationId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: enabled && applicationId > 0,
    staleTime: 30_000,
  });
};

/**
 * Get a single application detail by ID
 * GET /api/application-details/{id}
 */
export const useApplicationDetail = (id: number, enabled = true) => {
  return useQuery({
    queryKey: ["applicationDetails", "byId", id],
    queryFn: async (): Promise<ApplicationDetail | null> => {
      const result = await applicationDetailManager.getById(id);
      if (!result.success) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: enabled && id > 0,
    staleTime: 30_000,
  });
};

/**
 * Get all application details assigned to current reviewer (Staff)
 * GET /api/application-details/reviewer
 */
export const useApplicationDetailsForReviewer = (enabled = true) => {
  return useQuery({
    queryKey: ["applicationDetails", "forReviewer"],
    queryFn: async (): Promise<ApplicationDetail[]> => {
      const result = await applicationDetailManager.getForReviewer();
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled,
    staleTime: 30_000,
  });
};

export const usePendingMentorSchedules = (enabled = true) => {
  return useQuery({
    queryKey: ["mentorPendingSchedules"],
    queryFn: async (): Promise<MentorPendingScheduleResponse[]> => {
      const result = await applicationDetailManager.getPendingMentorSchedules();
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useMentorScheduleDecision = (options?: {
  onSuccess?: (_detail: ApplicationDetail) => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      applicationDetailId: number;
      request: ScheduleDecisionRequest;
    }) => {
      const result = await applicationDetailManager.decideMentorSchedule(
        params.applicationDetailId,
        params.request
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (detail, variables) => {
      queryClient.setQueryData(
        ["applicationDetails", "byId", variables.applicationDetailId],
        detail
      );
      void queryClient.invalidateQueries({ queryKey: ["mentorPendingSchedules"] });
      void queryClient.invalidateQueries({ queryKey: ["mentorSchedule"] });
      void queryClient.invalidateQueries({ queryKey: ["assignedMentors"] });
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "application-details"] });
      options?.onSuccess?.(detail);
    },
    onError: (error: Error) => {
      const message = getNormalizedErrorMessage(error);
      toast.error(message);
      void queryClient.invalidateQueries({ queryKey: ["mentorPendingSchedules"] });
      options?.onError?.(message);
    },
  });
};

export const useCancelMentorSchedule = (options?: {
  onSuccess?: (_detail: ApplicationDetail) => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  const refreshRelatedQueries = async (applicationDetailId: number) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["applicationDetails", "byId", applicationDetailId],
      }),
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", "byApplicationId"] }),
      queryClient.invalidateQueries({ queryKey: ["mentorPendingSchedules"] }),
      queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["assignedMentors", applicationDetailId] }),
    ]);
  };

  return useMutation({
    mutationFn: async (params: { applicationDetailId: number; reason?: string }) => {
      const reason = params.reason?.trim();
      if (reason && reason.length > 1000) {
        throw new Error(t("mentorSchedule.reasonTooLong"));
      }
      const result = await applicationDetailManager.cancelMentorSchedule(
        params.applicationDetailId,
        reason ? { reason } : {}
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: async (detail, variables) => {
      queryClient.setQueryData(
        ["applicationDetails", "byId", variables.applicationDetailId],
        detail
      );
      await refreshRelatedQueries(variables.applicationDetailId);
      toast.success(t("mentorSchedule.cancelSuccess", "Đã hủy lịch phỏng vấn"));
      options?.onSuccess?.(detail);
    },
    onError: async (error: Error, variables) => {
      const message = getNormalizedErrorMessage(error);
      toast.error(message);
      await refreshRelatedQueries(variables.applicationDetailId);
      options?.onError?.(message);
    },
  });
};

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * HR/Admin scores a candidate's application round
 * POST /api/application-details/hr-score
 *
 * Cache strategy on success:
 *   1. Use `setQueryData` to merge the returned detail into the
 *      `applicationDetails.byId` cache — instant local update, no refetch.
 *   2. Also patch the `applicationDetails.byApplicationId` cached array so
 *      list views reflect the new hrScore immediately.
 *   3. Invalidate the listing-level queries (`forReviewer`, `allPendingHR`)
 *      so the Staff grading table drops the just-scored row.
 *   4. We deliberately do NOT call `invalidateQueries({ queryKey: ["applicationDetails"] })`
 *      with a prefix — that would refetch every detail/application in cache
 *      and drown the Network panel in identical GETs, making it impossible
 *      to trace which call returned the freshly-graded detail.
 */
export const useHrScore = (options?: {
  onSuccess?: () => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: HrScoreParams) => {
      const result = await applicationDetailManager.hrScore(params);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: (_data, variables) => {
      toast.success(t("grading.gradeSuccess"));
      // Backend intentionally returns an empty body. Refetch the affected detail
      // and lists instead of attempting to merge a non-existent response entity.
      queryClient.invalidateQueries({
        queryKey: ["applicationDetails", "byId", variables.applicationDetailId],
      });
      queryClient.invalidateQueries({
        queryKey: ["applicationDetails", "byApplicationId"],
        exact: false,
      });
      //    These are coarse-grained lists, not per-detail refetches.
      queryClient.invalidateQueries({
        queryKey: ["applicationDetails", "forReviewer"],
      });
      queryClient.invalidateQueries({
        queryKey: ["get", "/api/applications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["get", "/api/applications/{id}"],
        exact: false,
      });

      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      const _message = getNormalizedErrorMessage(error);
      toast.error(_message);
      options?.onError?.(_message);
    },
  });
};

/**
 * Admin assigns a mentor to a candidate's Mentor Review round
 * PUT /api/application-details/{id}/assign-mentor?mentorId=
 *
 * Cache strategy mirrors `useHrScore`: setQueryData on the affected
 * detail + listing invalidation, instead of a wholesale prefix invalidation
 * that floods the Network panel with identical GETs.
 */
export const useAssignMentor = (options?: {
  onSuccess?: () => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { applicationDetailId: number; mentorId: number }) => {
      const result = await applicationDetailManager.assignMentor(
        params.applicationDetailId,
        params.mentorId
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables) => {
      toast.success(t("grading.assignmentSuccess"));

      const updated = data as unknown as ApplicationDetail | undefined;

      if (updated?.id !== undefined) {
        queryClient.setQueryData<ApplicationDetail>(
          ["applicationDetails", "byId", variables.applicationDetailId],
          updated
        );

        const appId = updated.applicationId;
        if (appId !== undefined) {
          queryClient.setQueryData<ApplicationDetail[]>(
            ["applicationDetails", "byApplicationId", appId],
            (prev) => prev?.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)) ?? prev
          );
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["applicationDetails", "forReviewer"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "application-details"] });

      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      const _message = getNormalizedErrorMessage(error);
      toast.error(_message);
      options?.onError?.(_message);
    },
  });
};

// ============================================================
// Option 2: Multi-mentor assignment hooks
// ============================================================

/**
 * Admin assigns multiple mentors to a candidate's Mentor Review round (Option 2)
 * PUT /api/application-details/{id}/assign-mentors
 */
export const useAssignMentors = (options?: {
  onSuccess?: () => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { applicationDetailId: number; mentorIds: number[] }) => {
      const result = await applicationDetailManager.assignMentors(
        params.applicationDetailId,
        params.mentorIds
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables) => {
      toast.success(t("grading.assignmentSuccess"));

      const updated = data as unknown as ApplicationDetail | undefined;

      if (updated?.id !== undefined) {
        queryClient.setQueryData<ApplicationDetail>(
          ["applicationDetails", "byId", variables.applicationDetailId],
          updated
        );

        const appId = updated.applicationId;
        if (appId !== undefined) {
          queryClient.setQueryData<ApplicationDetail[]>(
            ["applicationDetails", "byApplicationId", appId],
            (prev) => prev?.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)) ?? prev
          );
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "application-details"] });

      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      const _message = getNormalizedErrorMessage(error);
      toast.error(_message);
      options?.onError?.(_message);
    },
  });
};

/**
 * Get the list of assigned mentors for a candidate's Mentor Review round (Option 2)
 * GET /api/application-details/{id}/assigned-mentors
 */
export const useAssignedMentors = (applicationDetailId: number, enabled = true) => {
  return useQuery({
    queryKey: ["assignedMentors", applicationDetailId],
    queryFn: async () => {
      const result = await applicationDetailManager.getAssignedMentors(applicationDetailId);
      if (!result.success) throw new Error(result.error);
      return (result.data ?? []) as MentorResponse[];
    },
    enabled: enabled && applicationDetailId > 0,
    staleTime: 30_000,
  });
};

/**
 * Candidate selects one mentor from the assigned mentors list (Option 2)
 * PUT /api/application-details/{id}/select-mentor?mentorId=
 */
export const useSelectMentor = (options?: {
  onSuccess?: () => void;
  onError?: (_message: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { applicationDetailId: number; mentorId: number }) => {
      const result = await applicationDetailManager.selectMentor(
        params.applicationDetailId,
        params.mentorId
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, variables) => {
      toast.success(t("userMentorReview.mentorSelectedSuccessfully"));

      const updated = data as unknown as ApplicationDetail | undefined;

      if (updated?.id !== undefined) {
        queryClient.setQueryData<ApplicationDetail>(
          ["applicationDetails", "byId", variables.applicationDetailId],
          updated
        );

        const appId = updated.applicationId;
        if (appId !== undefined) {
          queryClient.setQueryData<ApplicationDetail[]>(
            ["applicationDetails", "byApplicationId", appId],
            (prev) => prev?.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)) ?? prev
          );
        }
      }

      // Invalidate assigned mentors cache
      queryClient.invalidateQueries({
        queryKey: ["assignedMentors", variables.applicationDetailId],
      });

      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      const _message = getNormalizedErrorMessage(error);
      toast.error(_message);
      options?.onError?.(_message);
    },
  });
};
