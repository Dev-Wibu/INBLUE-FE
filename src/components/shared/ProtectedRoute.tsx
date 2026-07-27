import { Navigate, Outlet } from "react-router-dom";

import type { UserRole } from "@/interfaces/schema.types";
import { useAuthStore } from "@/stores/authStore";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

/**
 * Protected route that redirects to login if user is not authenticated.
 * No loading spinner - let persisted auth state determine access immediately.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isLoggedIn, user } = useAuthStore();

  // Immediately redirect if not logged in (no blocking spinner)
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/error/403" replace />;
  }

  return <Outlet />;
}
