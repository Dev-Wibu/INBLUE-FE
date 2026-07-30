import { JobDetailView } from "@/components/shared/JobDetailView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { formatNumber } from "@/lib/formatting";
import { applicationService } from "@/services/application.manager";
import type { JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { Check, Copy, ExternalLink, Info, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface JobDetailContainerProps {
  job: JobDescription;
  onClose: () => void;
  onRefresh: () => void;
}

interface NativePaymentInfo {
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  amount?: string;
  addInfo?: string;
  bankShortName?: string;
  quicklink?: string;
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
  
  const [nativeInfo, setNativeInfo] = useState<NativePaymentInfo | null>(null);
  const [showEmbeddedFallback, setShowEmbeddedFallback] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse embedded URL
  const getEmbeddedUrl = (url: string) => {
    if (url.includes("embedded=true")) return url;
    return url.includes("?") ? `${url}&embedded=true` : `${url}?embedded=true`;
  };

  // Fetch & parse PayOS HTML for native QR details
  useEffect(() => {
    if (!checkoutUrl) {
      setNativeInfo(null);
      setShowEmbeddedFallback(false);
      return;
    }

    const tryFetchNativeInfo = async () => {
      try {
        const res = await fetch(checkoutUrl);
        if (!res.ok) {
          setShowEmbeddedFallback(true);
          return;
        }
        const html = await res.text();

        let info: NativePaymentInfo = {};
        const matchInfo = html.match(/"transactionInfo":(\{.*?\})/);
        if (matchInfo && matchInfo[1]) {
          try {
            info = JSON.parse(matchInfo[1]);
          } catch {
            // ignore
          }
        }

        const matchQuicklink = html.match(/"quicklink":"(.*?)"/);
        if (matchQuicklink && matchQuicklink[1]) {
          info.quicklink = matchQuicklink[1].replace(/\\u0026/g, "&");
        }

        if (info.accountNo || info.quicklink) {
          setNativeInfo(info);
        } else {
          setShowEmbeddedFallback(true);
        }
      } catch {
        setShowEmbeddedFallback(true);
      }
    };

    tryFetchNativeInfo();
  }, [checkoutUrl]);

  // Auto-poll payment status every 3 seconds while payment modal is open
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

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Đã sao chép ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
          setShowEmbeddedFallback(false);
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

      {/* ── Merged Single-Card Payment Modal ────────────────────────────── */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {t("payment.checkoutTitle", "Thanh toán ứng tuyển")}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[140px] font-medium">{job.title}</span>
                    <span>•</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      {formatNumber(job.price || 0)} VND
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setCheckoutUrl(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Merged Single Screen */}
            <div className="relative flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 custom-scrollbar">
              {nativeInfo && !showEmbeddedFallback ? (
                /* Merged 1-Screen Card (QR Code + Account Info Together) */
                <div className="flex flex-col items-center gap-3.5">
                  {/* QR Image */}
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    {nativeInfo.quicklink ? (
                      <img
                        src={nativeInfo.quicklink}
                        alt="VietQR Code"
                        className="h-[210px] w-[210px] rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex h-[210px] w-[210px] items-center justify-center text-xs text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                      </div>
                    )}
                    <p className="mt-1.5 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Quét bằng app Ngân hàng / MoMo / ZaloPay
                    </p>
                  </div>

                  {/* Single Unified Bank Info Box */}
                  <div className="w-full space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    {/* Bank */}
                    {nativeInfo.bankName && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {nativeInfo.bankShortName || nativeInfo.bankName}
                        </span>
                      </div>
                    )}

                    {/* Account Name */}
                    {nativeInfo.accountName && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {nativeInfo.accountName}
                        </span>
                      </div>
                    )}

                    {/* Account No */}
                    {nativeInfo.accountNo && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {nativeInfo.accountNo}
                          </span>
                          <button
                            onClick={() => handleCopy(nativeInfo.accountNo!, "Số tài khoản")}
                            className="flex h-5.5 px-1.5 items-center gap-1 rounded bg-slate-100 text-[11px] font-medium hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950">
                            {copiedField === "Số tài khoản" ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Sao chép
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {formatNumber(Number(nativeInfo.amount || job.price || 0))} VND
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(
                              String(nativeInfo.amount || job.price || 0),
                              "Số tiền"
                            )
                          }
                          className="flex h-5.5 px-1.5 items-center gap-1 rounded bg-slate-100 text-[11px] font-medium hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950">
                          {copiedField === "Số tiền" ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Sao chép
                        </button>
                      </div>
                    </div>

                    {/* Add Info / Content */}
                    {nativeInfo.addInfo && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {nativeInfo.addInfo}
                          </span>
                          <button
                            onClick={() => handleCopy(nativeInfo.addInfo!, "Nội dung chuyển khoản")}
                            className="flex h-5.5 px-1.5 items-center gap-1 rounded bg-indigo-50 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-400">
                            {copiedField === "Nội dung chuyển khoản" ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Sao chép
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning Note */}
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/80 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    <Info className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Nhập chính xác <strong>Số tiền</strong> và <strong>Nội dung chuyển khoản</strong> để hệ thống tự động kích hoạt sau 3s.
                    </span>
                  </div>
                </div>
              ) : (
                /* Embedded Fallback View */
                <div className="relative h-[560px] w-full overflow-hidden rounded-xl bg-white dark:bg-slate-900">
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-slate-900/90">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("payment.loadingGateway", "Đang tải trang thanh toán...")}
                      </p>
                    </div>
                  )}

                  <iframe
                    src={getEmbeddedUrl(checkoutUrl)}
                    title="PayOS Embedded Checkout"
                    className="h-full w-full border-0"
                    onLoad={() => setIframeLoading(false)}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualCheckPayment}
                disabled={isCheckingPayment}
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <RefreshCw className={`h-3.5 w-3.5 ${isCheckingPayment ? "animate-spin" : ""}`} />
                {t("payment.checkStatus", "Kiểm tra kết quả")}
              </Button>

              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                <ExternalLink className="h-3.5 w-3.5" />
                Mở tab mới ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
