import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/stores/authStore";

import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";

export function EntryTestOnboardingCoordinator() {
  const userId = Number(useAuthStore((state) => state.user?.id));
  const preferenceExists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const preference = useCareerPreference(preferenceExists.data === true);
  const hasIncompletePreference =
    preferenceExists.data === true &&
    (preference.data?.targetRole === null ||
      (preference.isError && (preference.error as { status?: number })?.status === 404));
  return preferenceExists.data === false || hasIncompletePreference ? (
    <Navigate to="/user/entry-test/onboarding" replace />
  ) : null;
}
