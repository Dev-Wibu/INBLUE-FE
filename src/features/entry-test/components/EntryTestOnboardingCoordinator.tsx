import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/stores/authStore";

import { useCareerPreferenceExists } from "../hooks/useCareerPreference";
import type { UserCareerPreference } from "../types/entry-test.types";
import { CareerPreferenceWizard } from "./CareerPreferenceWizard";

export function EntryTestOnboardingCoordinator() {
  const navigate = useNavigate();
  const userId = Number(useAuthStore((state) => state.user?.id));
  const [dismissed, setDismissed] = useState(false);
  const preferenceExists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const shouldOpen = preferenceExists.data === false && !dismissed;

  const handleSaved = (preference: UserCareerPreference) => {
    setDismissed(true);
    if (preference.targetRole) {
      navigate("/user/entry-test", { state: { openStartDialog: true } });
    }
  };

  return (
    <CareerPreferenceWizard
      open={shouldOpen}
      onOpenChange={(open) => {
        if (!open) setDismissed(true);
      }}
      onSaved={handleSaved}
    />
  );
}
