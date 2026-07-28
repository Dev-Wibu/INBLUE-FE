import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Custom hooks for Mentor operations
 * Uses React Query for server state
 */

import type { Mentor } from "@/interfaces";
import { mentorManager } from "@/services/mentor.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

// Query Keys
export const MENTOR_QUERY_KEYS = {
  all: ["mentors"] as const,
  byId: (id: number) => ["mentors", id] as const,
  byEmail: (email: string) => ["mentors", "by-email", email] as const,
};

/**
 * Hook to fetch all mentors
 */
export const useMentors = () => {
  return useQuery({
    queryKey: MENTOR_QUERY_KEYS.all,
    queryFn: async (): Promise<Mentor[]> => {
      const response = await mentorManager.getAll();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if ("data" in response.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
      return [];
    },
  });
};

/**
 * Hook to fetch mentor by ID
 */
export const useMentorById = (id: number) => {
  return useQuery({
    queryKey: MENTOR_QUERY_KEYS.byId(id),
    queryFn: async () => {
      const response = await mentorManager.getById(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || t("common.noMentorFound"));
    },
    enabled: !!id,
  });
};

/**
 * Resolve the mentor record for the currently logged-in user by email.
 *
 * The User and Mentor tables have independent primary keys — User.id (from
 * JWT sub) is NOT the same as Mentor.id. Mentor sessions reference the
 * Mentor table's PK in `mentorId` / `userId`, so a mentor logged in with
 * User.id=53 will only see their assigned sessions once we map their email
 * to Mentor.id and filter on that value too.
 */
export const useCurrentMentorProfile = () => {
  const email = useAuthStore((state) => state.user?.email ?? "");
  return useQuery({
    queryKey: MENTOR_QUERY_KEYS.byEmail(email),
    queryFn: async (): Promise<Mentor | null> => {
      if (!email) return null;
      return await mentorManager.findByEmail(email);
    },
    enabled: !!email,
    staleTime: 5 * 60_000,
  });
};
