import {
  type AdminApplicationDetailResponse,
  type ApplicationDetailStatus,
  adminApplicationManager,
} from "@/services/admin-application.manager";
import { useQuery } from "@tanstack/react-query";

/**
 * Get admin-side application-details list for the Mentor Review Assignment page.
 * GET /api/admin/application-details?status=AWAITING_MENTOR
 *
 * Backend returns the full list (sorted by updatedAt DESC). FE filters further
 * by search/UI. Avoids the previous N+1 problem where the page issued 1 request
 * per application to GET /api/application-details/application/{appId}.
 */
export const useAdminApplicationDetails = (status?: ApplicationDetailStatus) => {
  return useQuery({
    queryKey: ["admin", "application-details", status ?? "all"],
    queryFn: async (): Promise<AdminApplicationDetailResponse[]> => {
      const result = await adminApplicationManager.getApplicationDetails(status);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    staleTime: 30_000,
  });
};
