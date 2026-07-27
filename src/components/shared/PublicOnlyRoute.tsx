import { Navigate, Outlet } from "react-router-dom";

import { getDashboardPath, useAuthStore } from "@/stores/authStore";

/**
 * Route for public pages (login, signup, etc.)
 * Redirects logged-in users to their dashboard immediately without blocking.
 */
export function PublicOnlyRoute() {
  const { isLoggedIn, user } = useAuthStore();

  // Immediately redirect if logged in (no blocking spinner)
  if (isLoggedIn) {
    // USER role stays on landing page; ADMIN/MENTOR/STAFF go to their dashboard
    const redirectPath = user?.role === "USER" ? "/" : getDashboardPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
