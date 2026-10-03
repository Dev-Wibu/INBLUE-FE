import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/stores/authStore";

import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";

export function EntryTestOnboardingCoordinator() {
  const userId = Number(useAuthStore((state) => state.user?.id));
  const preferenceExists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const preference = useCareerPreference(preferenceExists.data === true);
  const hasMissingPreference =
    preferenceExists.data === true &&
    preference.isError &&
    (preference.error as { status?: number })?.status === 404;
  return preferenceExists.data === false || hasMissingPreference ? (
    <Navigate to="/user/entry-test/onboarding" replace />
  ) : null;
}
