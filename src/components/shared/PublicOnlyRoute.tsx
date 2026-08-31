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
    // USER enters the protected dashboard so onboarding can decide whether to
    // open the career-orientation wizard. Public home remains available via
    // its explicit navigation link, not as the post-auth destination.
    const redirectPath = user?.role === "USER" ? "/user" : getDashboardPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
