import { applicationService } from "@/services/application.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { useCallback, useEffect, useState } from "react";

export function useJdPurchaseStatus(jdId: number | undefined) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [applicationId, setApplicationId] = useState<number | undefined>(undefined);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (!jdId || !isLoggedIn) {
      setHasPurchased(false);
      setHasApplied(false);
      setApplicationId(undefined);
      setIsLoadingStatus(false);
      return;
    }

    setIsLoadingStatus(true);
    try {
      const [purchased, appResult] = await Promise.all([
        jdPurchaseManager.checkPurchased(jdId),
        applicationService.getMyApplications(),
      ]);
      const latestApplication = appResult.success
        ? appResult.data
            ?.filter((application) => application.jdId === jdId && !application.isDeleted)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0]
        : undefined;

      setHasPurchased(purchased);
      setHasApplied(Boolean(latestApplication));
      setApplicationId(latestApplication?.id);
    } catch (err) {
      console.error("[useJdPurchaseStatus] Error checking status:", err);
      setHasPurchased(false);
      setHasApplied(false);
      setApplicationId(undefined);
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
    applicationId,
    isLoadingStatus,
    refetchStatus: checkStatus,
  };
}
