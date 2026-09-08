import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores/authStore";

import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";

export function MandatoryEntryTestGuard() {
  const location = useLocation();
  const { isLoggedIn, user } = useAuthStore();
  const isUser = isLoggedIn && user?.role === "USER";
  const onboardingPath = "/user/entry-test/onboarding";
  const isOnboarding = location.pathname === onboardingPath;
  const exists = useCareerPreferenceExists(isUser && !isOnboarding);
  const preference = useCareerPreference(isUser && !isOnboarding && exists.data === true);

  if (!isUser || isOnboarding || exists.isLoading || preference.isLoading) return null;
  const incomplete =
    exists.data === false ||
    (exists.data === true &&
      (!preference.data?.targetRole ||
        (preference.isError && (preference.error as { status?: number })?.status === 404)));
  return incomplete ? (
    <Navigate to={onboardingPath} replace state={{ from: location.pathname }} />
  ) : null;
}
