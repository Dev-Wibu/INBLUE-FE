import { applicationService } from "@/services/application.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { useCallback, useEffect, useState } from "react";

export function useJdPurchaseStatus(jdId: number | undefined) {
  const { isLoggedIn } = useAuthStore();
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (!jdId || !isLoggedIn) {
      setHasPurchased(false);
      setHasApplied(false);
      setIsLoadingStatus(false);
      return;
    }

    setIsLoadingStatus(true);
    try {
      // 1. Check if user already has an Application for this JD
      const appResult = await applicationService.getMyApplications();
      if (appResult.success && appResult.data) {
        const existingApp = appResult.data.find((app) => app.jdId === jdId && !app.isDeleted);
        if (
          existingApp &&
          (existingApp.status === "IN_PROGRESS" || existingApp.status === "PASSED")
        ) {
          setHasApplied(true);
          setHasPurchased(true);
          setIsLoadingStatus(false);
          return;
        }
      }

      // 2. Check if user has purchased the JD package but not yet applied
      const purchased = await jdPurchaseManager.checkPurchased(jdId);
      setHasPurchased(purchased);
      setHasApplied(false);
    } catch (err) {
      console.error("[useJdPurchaseStatus] Error checking status:", err);
      setHasPurchased(false);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [jdId, isLoggedIn]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  return {
    hasPurchased,
    hasApplied,
    isLoadingStatus,
    refetchStatus: checkStatus,
  };
}
