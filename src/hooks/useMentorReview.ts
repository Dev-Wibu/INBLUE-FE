import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Custom hooks for Mentor Review operations
 * Uses React Query for server state
 */

import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import type {
  CreateMentorReviewRequest,
  MentorReview,
  UpdateMentorReviewRequest,
} from "@/services/mentor-review.manager";
import { mentorReviewManager } from "@/services/mentor-review.manager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Query Keys
export const REVIEW_QUERY_KEYS = {
  all: ["mentor-reviews"] as const,
  byId: (id: number) => ["mentor-reviews", id] as const,
  byMentor: (mentorId: number) => ["mentor-reviews", "mentor", mentorId] as const,
  byUser: (userId: number) => ["mentor-reviews", "user", userId] as const,
  bySession: (sessionId: number) => ["mentor-reviews", "session", sessionId] as const,
};
const getReviewMentorId = (review: MentorReview): number | undefined => {
  if (typeof review.mentor?.id === "number") {
    return review.mentor.id;
  }
  return review.session?.userId2;
};
const getReviewUserId = (review: MentorReview): number | undefined => {
  if (typeof review.user?.id === "number") {
    return review.user.id;
  }
  return review.session?.userId;
};

/**
 * Hook to fetch all mentor reviews
 */
export const useMentorReviews = () => {
  return useQuery({
    queryKey: REVIEW_QUERY_KEYS.all,
    queryFn: async (): Promise<MentorReview[]> => {
      const response = await mentorReviewManager.getAll();
      if (response.success && response.data) {
        // Handle both array and paginated response
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // If paginated response, extract items array
        if ("items" in response.data && Array.isArray(response.data.items)) {
          return response.data.items;
        }
      }
      return [];
    },
  });
};

/**
 * Hook to fetch mentor review by ID
 */
export const useMentorReviewById = (id: number) => {
  return useQuery({
    queryKey: REVIEW_QUERY_KEYS.byId(id),
    queryFn: async () => {
      const response = await mentorReviewManager.getById(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || t("common.noReviewsFound"));
    },
    enabled: !!id,
  });
};

/**
 * Hook to fetch reviews by mentor ID
 */
export const useMentorReviewsByMentor = (mentorId: number) => {
  const { data: allReviews = [], ...rest } = useMentorReviews();
  if (!mentorId) {
    return {
      data: [] as MentorReview[],
      ...rest,
    };
  }

  // Filter reviews by mentor ID
  const mentorReviews = allReviews.filter(
    (review: MentorReview) => getReviewMentorId(review) === mentorId
  );
  return {
    data: mentorReviews,
    ...rest,
  };
};

/**
 * Hook to fetch reviews by user ID
 */
export const useMentorReviewsByUser = (userId: number) => {
  const { data: allReviews = [], ...rest } = useMentorReviews();
  if (!userId) {
    return {
      data: [] as MentorReview[],
      ...rest,
    };
  }

  // Filter reviews by user ID
  const userReviews = allReviews.filter(
    (review: MentorReview) => getReviewUserId(review) === userId
  );
  return {
    data: userReviews,
    ...rest,
  };
};

/**
 * Hook to fetch review by session ID
 */
export const useMentorReviewBySession = (sessionId: number) => {
  const { data: allReviews = [], ...rest } = useMentorReviews();
  if (!sessionId) {
    return {
      data: undefined,
      ...rest,
    };
  }

  // Find review for this session
  const sessionReview = allReviews.find((review: MentorReview) => review.session?.id === sessionId);
  return {
    data: sessionReview,
    ...rest,
  };
};

/**
 * Hook to create a mentor review
 */
export const useCreateMentorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMentorReviewRequest) => {
      const response = await mentorReviewManager.create(data);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToCreateReview"));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: REVIEW_QUERY_KEYS.all,
      });
      toast.success(t("general.reviewSubmittedSuccessfully"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToCreateReview")));
    },
  });
};

/**
 * Hook to update a mentor review
 */
export const useUpdateMentorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMentorReviewRequest }) => {
      const response = await mentorReviewManager.update(id, data);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToUpdateReview"));
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: REVIEW_QUERY_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: REVIEW_QUERY_KEYS.byId(variables.id),
      });
      toast.success(t("general.reviewSuccessfullyUpdated"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToUpdateReview")));
    },
  });
};

/**
 * Hook to delete a mentor review (Admin only)
 */
export const useDeleteMentorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await mentorReviewManager.delete(id);
      if (!response.success) {
        throw new Error(response.error || t("general.reviewCannotBeDeleted"));
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: REVIEW_QUERY_KEYS.all,
      });
      toast.success(t("common.reviewRemoved"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.reviewCannotBeDeleted")));
    },
  });
};

/**
 * Calculate average rating from reviews
 */
export const calculateAverageRating = (reviews: MentorReview[]): number => {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  return total / reviews.length;
};

// Re-export types for convenience
export type { CreateMentorReviewRequest, MentorReview, UpdateMentorReviewRequest };
