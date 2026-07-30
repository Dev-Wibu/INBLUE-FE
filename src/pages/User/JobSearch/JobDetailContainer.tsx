import { JobDetailView } from "@/components/shared/JobDetailView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { formatNumber } from "@/lib/formatting";
import { applicationService } from "@/services/application.manager";
import type { JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface JobDetailContainerProps {
  job: JobDescription;
  onClose: () => void;
  onRefresh: () => void;
}

export function JobDetailContainer({ job, onClose, onRefresh }: JobDetailContainerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const jdIdNum = Number(job.id);

  const { hasPurchased, refetchStatus } = useJdPurchaseStatus(jdIdNum);
  const [isApplying, setIsApplying] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Auto-poll payment status every 3 seconds while payment webview is open
  useEffect(() => {
    if (!checkoutUrl || hasPurchased) return;

    const interval = setInterval(async () => {
      const { data } = await refetchStatus();
      if (data?.hasPurchased) {
        toast.success(t("payment.paymentSuccess", "Thanh toán thành công!"));
        setCheckoutUrl(null);
        handleApplyAfterPurchased();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [checkoutUrl, hasPurchased]);

  const handleApplyAfterPurchased = async () => {
    setIsApplying(true);
    try {
      const result = await applicationService.apply(jdIdNum);
      if (result.success) {
        toast.success(t("enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck"));
        await refetchStatus();
        onRefresh();
        const createdAppId = result.data?.id;
        if (createdAppId) {
          navigate(`/user?tab=applicationHistory&appId=${createdAppId}`);
        } else {
          navigate(`/user?tab=applicationHistory`);
        }
      } else {
        const errorMsg =
          result.error ||
          t("enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain");
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch {
      toast.error(t("common.anErrorOccurredPleaseTryAgain", "Có lỗi xảy ra, vui lòng thử lại."));
    } finally {
      setIsApplying(false);
    }
  };

  const handleManualCheckPayment = async () => {
    setIsCheckingPayment(true);
    try {
      const { data } = await refetchStatus();
      if (data?.hasPurchased) {
        toast.success(t("payment.paymentSuccess", "Thanh toán thành công!"));
        setCheckoutUrl(null);
        await handleApplyAfterPurchased();
      } else {
        toast.info(t("payment.waitingPayment", "Chưa ghi nhận thanh toán. Vui lòng thử lại sau vài giây."));
      }
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleApply = async () => {
    if (!isLoggedIn) {
      toast.error(t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply"));
      navigate(`/login?redirect=/enterprise/job/${job.id}`);
      return;
    }
    if (job?.status !== "OPEN") {
      toast.warning(t("enterpriseJobdescriptiondetailpage.thisPositionIsCurrentlyNo"));
      return;
    }

    setIsApplying(true);
    try {
      if (!hasPurchased && job.price && job.price > 0) {
        localStorage.setItem("pending_jd_purchase_id", String(jdIdNum));
        const url = await jdPurchaseManager.createPayment(jdIdNum);
        if (url) {
          setCheckoutUrl(url);
          setIframeLoading(true);
        } else {
          toast.error(t("payment.failedToCreatePayment", "Không thể tạo liên kết thanh toán."));
        }
        return;
      }

      await handleApplyAfterPurchased();
    } catch {
      toast.error(t("common.anErrorOccurredPleaseTryAgain", "Có lỗi xảy ra, vui lòng thử lại."));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="relative custom-scrollbar flex-1 overflow-y-auto px-5 py-6 md:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50 [&::-webkit-scrollbar-track]:bg-transparent">
      <JobDetailView
        job={job}
        hasPurchased={hasPurchased}
        onApplyAction={handleApply}
        isLoadingAction={isApplying}
        onBack={onClose}
      />

      {/* ── Payment Webview Modal ────────────────────────────────────── */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex h-[85vh] max-h-[780px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("payment.checkoutTitle", "Thanh toán ứng tuyển")}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="max-w-[200px] truncate font-medium text-slate-700 dark:text-slate-300">
                      {job.title}
                    </span>
                    <span>•</span>
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-400">
                      {formatNumber(job.price || 0)} VND
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action items in header */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheckPayment}
                  disabled={isCheckingPayment}
                  className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  <RefreshCw className={`h-3.5 w-3.5 ${isCheckingPayment ? "animate-spin" : ""}`} />
                  {t("payment.checkStatus", "Kiểm tra kết quả")}
                </Button>

                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-indigo-600 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-slate-750">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("payment.openInNewTab", "Mở tab mới")}
                </a>

                <button
                  onClick={() => setCheckoutUrl(null)}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Webview */}
            <div className="relative flex-1 bg-slate-100 dark:bg-slate-950">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-slate-900/90">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("payment.loadingGateway", "Đang tải trang thanh toán...")}
                  </p>
                </div>
              )}

              <iframe
                src={checkoutUrl}
                title="Payment Checkout"
                className="h-full w-full border-0"
                onLoad={() => setIframeLoading(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
