/**
 * Custom hook for fetching mentor schedule from GET /api/mentors/schedule
 * Returns mentor's personal schedule including sessions, kiosk bookings, and application rounds
 */

import { $api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { components } from "../../schema-from-be";

type MentorScheduleEventDto = components["schemas"]["UserScheduleEventDto"];

interface UseMentorScheduleOptions {
  startDate?: string;
  endDate?: string;
}

export const useMentorSchedule = (options?: UseMentorScheduleOptions) => {
  // Subscribe to auth state to trigger refetch on user switch
  const userId = useAuthStore((state) => state.user?.id);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return $api.useQuery("get", "/api/mentors/schedule", {
    params: {
      query: {
        startDate: options?.startDate,
        endDate: options?.endDate,
      },
    },
    // Only run query when user is logged in
    enabled: isLoggedIn && !!userId,
    // Use userId in query key so different users have separate cache entries
    queryKey: ["mentorSchedule", userId, options?.startDate, options?.endDate],
    // Always refetch when component mounts or window regains focus
    // This ensures correct data when user switches accounts
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export type { MentorScheduleEventDto };
