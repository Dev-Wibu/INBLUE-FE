/**
 * Custom hook for fetching user schedule from GET /api/users/schedule
 * Returns unified schedule events including sessions, kiosk bookings, and AI interviews
 */

import { $api } from "@/lib/api";
import type { components } from "../../schema-from-be";

type UserScheduleEventDto = components["schemas"]["UserScheduleEventDto"];

interface UseUserScheduleOptions {
  startDate?: string;
  endDate?: string;
}

export const useUserSchedule = (options?: UseUserScheduleOptions) => {
  return $api.useQuery("get", "/api/users/schedule", {
    params: {
      query: {
        startDate: options?.startDate,
        endDate: options?.endDate,
      },
    },
  });
};

export type { UserScheduleEventDto };
