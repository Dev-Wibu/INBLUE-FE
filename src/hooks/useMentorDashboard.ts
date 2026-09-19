import { mentorDashboardManager } from "@/services/mentor-dashboard.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

export const MENTOR_DASHBOARD_QUERY_KEYS = {
  all: ["mentor-dashboard"] as const,
  summary: (identity: string) => ["mentor-dashboard", "summary", identity] as const,
};

export function useMentorDashboardSummary() {
  const user = useAuthStore((state) => state.user);
  const identity = String(user?.id ?? user?.email ?? "");

  return useQuery({
    queryKey: MENTOR_DASHBOARD_QUERY_KEYS.summary(identity),
    queryFn: () => mentorDashboardManager.getSummary(),
    enabled: user?.role === "MENTOR" && identity.length > 0,
    staleTime: 0,
    retry: false,
  });
}
