import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/stores/authStore";

import { useCareerPreferenceExists } from "../hooks/useCareerPreference";

export function EntryTestOnboardingCoordinator() {
  const userId = Number(useAuthStore((state) => state.user?.id));
  const preferenceExists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  return preferenceExists.data === false ? (
    <Navigate to="/user/entry-test/onboarding" replace />
  ) : null;
}
