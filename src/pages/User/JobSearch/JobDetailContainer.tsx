import { JobDetailView } from "@/components/shared/JobDetailView";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import {
  buildJdPurchaseReturnPath,
  clearPendingJdPurchase,
  rememberPendingJdPurchase,
} from "@/lib/jd-payment";
import { applicationService } from "@/services/application.manager";
import type { JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface JobDetailContainerProps {
  job: JobDescription;
  onClose?: () => void;
  onRefresh?: () => void;
  hideBackButton?: boolean;
}

export function JobDetailContainer({
  job,
  onClose,
  onRefresh,
  hideBackButton = false,
}: JobDetailContainerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const jdIdNum = Number(job.id);
  const { hasPurchased, hasApplied, isLoadingStatus, refetchStatus } = useJdPurchaseStatus(jdIdNum);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyAfterPurchased = async () => {
    setIsApplying(true);
    try {
      const result = await applicationService.apply(jdIdNum);
      if (result.success) {
        toast.success(t("enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck"));
        await refetchStatus();
        onRefresh?.();
        const createdAppId = result.data?.id;
        navigate(
          createdAppId
            ? `/user?tab=applicationHistory&appId=${createdAppId}`
            : "/user?tab=applicationHistory"
        );
        return;
      }

      if (result.statusCode === 402) {
        await refetchStatus();
        toast.error(t("payment.paymentRequiredToApply"), { duration: 5000 });
        return;
      }

      toast.error(
        result.error ||
          t("enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain"),
        { duration: 5000 }
      );
    } catch {
      toast.error(t("common.anErrorOccurredPleaseTryAgain"));
    } finally {
      setIsApplying(false);
    }
  };

  const handleApply = async () => {
    if (!isLoggedIn) {
      toast.error(t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply"));
      navigate(`/login?redirect=${encodeURIComponent(buildJdPurchaseReturnPath(jdIdNum))}`);
      return;
    }
    if (job.status?.toUpperCase() !== "OPEN") {
      toast.warning(t("enterpriseJobdescriptiondetailpage.thisPositionIsCurrentlyNo"));
      return;
    }

    if (hasPurchased) {
      await handleApplyAfterPurchased();
      return;
    }

    setIsApplying(true);
    try {
      rememberPendingJdPurchase(jdIdNum);
      const { checkoutUrl } = await jdPurchaseManager.createPayment(jdIdNum);
      window.location.assign(checkoutUrl);
    } catch {
      clearPendingJdPurchase();
      toast.error(t("payment.failedToCreatePayment"));
      setIsApplying(false);
    }
  };

  return (
    <div
      className={
        hideBackButton
          ? "relative flex-1"
          : "custom-scrollbar relative flex-1 overflow-y-auto px-5 py-6 md:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50 [&::-webkit-scrollbar-track]:bg-transparent"
      }>
      <JobDetailView
        job={job}
        hasPurchased={hasPurchased}
        hasApplied={hasApplied}
        onApplyAction={handleApply}
        isLoadingAction={isApplying}
        isLoadingStatus={isLoadingStatus}
        onBack={hideBackButton ? undefined : onClose}
      />
    </div>
  );
}
