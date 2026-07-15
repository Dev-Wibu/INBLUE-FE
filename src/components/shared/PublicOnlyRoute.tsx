import { Navigate, Outlet } from "react-router-dom";

import { SpinnerBlock } from "@/components/ui/spinner";
import { getDashboardPath, useAuthStore } from "@/stores/authStore";

export function PublicOnlyRoute() {
  const { isLoggedIn, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <SpinnerBlock fullScreen size="xl" />;
  }

  if (isLoggedIn) {
    // USER role stays on landing page; ADMIN/MENTOR/STAFF go to their dashboard
    const redirectPath = user?.role === "USER" ? "/" : getDashboardPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
