import { JobDetailView } from "@/components/shared/JobDetailView";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { formatNumber } from "@/lib/formatting";
import { applicationService } from "@/services/application.manager";
import type { JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { Check, Clock, Copy, ExternalLink, Info, Loader2, ShieldCheck, X } from "lucide-react";
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

function extractNativeInfoFromRawData(rawData: unknown): NativePaymentInfo | null {
  if (!rawData) return null;

  let record: Record<string, unknown> | null = null;
  if (typeof rawData === "string") {
    try {
      record = JSON.parse(rawData);
    } catch {
      // ignore
    }
  } else if (typeof rawData === "object" && rawData !== null) {
    record = rawData as Record<string, unknown>;
  }

  if (record && record.data && typeof record.data === "object") {
    record = record.data as Record<string, unknown>;
  }

  if (record) {
    const accountNo = (record.accountNumber || record.accountNo || record.account_no) as string | undefined;
    const accountName = (record.accountName || record.account_name) as string | undefined;
    const amt = (record.amount) as string | number | undefined;
    const addInfo = (record.description || record.addInfo || record.paymentPurpose) as string | undefined;
    const bin = (record.bin || "970418") as string;
    const bankShortName = (record.bankShortName || record.bankName || "BIDV") as string;
    const quicklink = (record.quicklink || record.qrCodeUrl) as string | undefined;

    if (accountNo || quicklink || addInfo) {
      const generatedQuicklink =
        quicklink ||
        `https://img.vietqr.io/image/${bin}-${accountNo || "V3CAS6721131488"}-vietqr_pro.jpg?addInfo=${encodeURIComponent(
          String(addInfo || "")
        )}&amount=${amt || 2000}`;

      return {
        accountNo: String(accountNo || "V3CAS6721131488"),
        accountName: String(accountName || "NGUYEN PHAM THU HA"),
        amount: String(amt || "2000"),
        addInfo: String(addInfo || ""),
        bankShortName: String(bankShortName || "BIDV"),
        quicklink: generatedQuicklink,
      };
    }
  }

  return null;
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
  
  const [nativeInfo, setNativeInfo] = useState<NativePaymentInfo | null>(null);
  const [showEmbeddedFallback, setShowEmbeddedFallback] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes = 900s

  // 15-minute Countdown Timer
  useEffect(() => {
    if (!checkoutUrl) return;
    setTimeLeft(900);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning("Phiên thanh toán đã hết hạn.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutUrl]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Parse embedded URL
  const getEmbeddedUrl = (url: string) => {
    if (url.includes("embedded=true")) return url;
    return url.includes("?") ? `${url}&embedded=true` : `${url}?embedded=true`;
  };

  // Fetch & parse PayOS HTML for REAL addInfo & quicklink
  useEffect(() => {
    if (!checkoutUrl) {
      setNativeInfo(null);
      setShowEmbeddedFallback(false);
      return;
    }

    const tryFetchNativeInfo = async () => {
      const paymentId = checkoutUrl.split("/web/")[1]?.replace(/\//g, "").split("?")[0];
      const targets = [
        paymentId ? `/payos-proxy/web/${paymentId}` : null,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(checkoutUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(checkoutUrl)}`,
      ].filter(Boolean) as string[];

      for (const target of targets) {
        try {
          const res = await fetch(target);
          if (!res.ok) continue;
          const html = await res.text();

          let extracted: NativePaymentInfo = {
            bankShortName: "BIDV",
            accountName: "NGUYEN PHAM THU HA",
            accountNo: "V3CAS6721131488",
            amount: String(job.price || 2000),
          };

          // Extract transactionInfo if embedded in Next.js script
          const matchInfo = html.match(/"transactionInfo":(\{.*?\})/);
          if (matchInfo && matchInfo[1]) {
            try {
              const parsed = JSON.parse(matchInfo[1]);
              extracted = { ...extracted, ...parsed };
            } catch {
              // ignore
            }
          }

          // Extract addInfo (Nội dung CK) accurately from PayOS HTML
          const matchAddInfo =
            html.match(/"addInfo"\s*:\s*"(.*?)"/) ||
            html.match(/\|\s*([A-Z0-9]+\s+PAYMENT)\s*\|/i) ||
            html.match(/nội dung\s*<b>(.*?)<\/b>/i);

          if (matchAddInfo && matchAddInfo[1]) {
            extracted.addInfo = matchAddInfo[1].replace(/<[^>]*>/g, "").trim();
          }

          // Extract official quicklink from PayOS HTML
          const matchQuicklink = html.match(/"quicklink"\s*:\s*"(.*?)"/);
          if (matchQuicklink && matchQuicklink[1]) {
            extracted.quicklink = matchQuicklink[1].replace(/\\u0026/g, "&");
          } else if (extracted.addInfo) {
            extracted.quicklink = `https://img.vietqr.io/image/970418-${extracted.accountNo || "V3CAS6721131488"}-vietqr_pro.jpg?addInfo=${encodeURIComponent(
              extracted.addInfo
            )}&amount=${extracted.amount || 2000}`;
          }

          if (extracted.addInfo || extracted.quicklink) {
            setNativeInfo(extracted);
            setShowEmbeddedFallback(false);
            return;
          }
        } catch {
          // try next proxy target
        }
      }
    };

    tryFetchNativeInfo();
  }, [checkoutUrl, job.price]);

  // Auto-poll payment status every 3 seconds while payment modal is open
  useEffect(() => {
    if (!checkoutUrl || hasPurchased) return;

    const interval = setInterval(async () => {
      const purchased = await jdPurchaseManager.checkPurchased(jdIdNum);
      if (purchased) {
        toast.success(t("payment.paymentSuccess", "Thanh toán thành công!"));
        setCheckoutUrl(null);
        await refetchStatus();
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
        const res = await jdPurchaseManager.createPayment(jdIdNum);
        if (res?.checkoutUrl) {
          const extracted = extractNativeInfoFromRawData(res.rawData);
          setNativeInfo(extracted);
          setShowEmbeddedFallback(false);
          setCheckoutUrl(res.checkoutUrl);
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

      {/* ── Native 1-Screen Merged Payment Modal ────────────────────────────── */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header — Clean & Simple */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {t("payment.checkoutTitle", "Thanh toán ứng tuyển")}
                </h3>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setCheckoutUrl(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: 100% Native Merged Single Screen */}
            <div className="relative flex-1 overflow-y-auto bg-slate-50 p-4.5 dark:bg-slate-950 custom-scrollbar">
              {!showEmbeddedFallback ? (
                nativeInfo?.addInfo ? (
                  <div className="flex flex-col items-center gap-4">
                    {/* Clean QR Image without gray border or subtext */}
                    <div className="flex flex-col items-center">
                      {nativeInfo.quicklink ? (
                        <img
                          src={nativeInfo.quicklink}
                          alt="VietQR Code"
                          className="h-[240px] w-[240px] rounded-xl border border-slate-100 object-contain shadow-xs bg-white dark:border-slate-800 dark:bg-white"
                        />
                      ) : (
                        <div className="flex h-[240px] w-[240px] items-center justify-center text-xs text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>

                    {/* Single Unified Bank Info Box */}
                    <div className="w-full space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      {/* Bank */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {nativeInfo.bankShortName || "BIDV"}
                        </span>
                      </div>

                      {/* Account Name */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {nativeInfo.accountName || "NGUYEN PHAM THU HA"}
                        </span>
                      </div>

                      {/* Account No */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {nativeInfo.accountNo || "V3CAS6721131488"}
                          </span>
                          <button
                            onClick={() => handleCopy(nativeInfo.accountNo || "V3CAS6721131488", "Số tài khoản")}
                            className="flex h-5.5 px-2 items-center gap-1 rounded bg-slate-100 text-[11px] font-medium hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950">
                            {copiedField === "Số tài khoản" ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Sao chép
                          </button>
                        </div>
                      </div>

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
                            className="flex h-5.5 px-2 items-center gap-1 rounded bg-slate-100 text-[11px] font-medium hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950">
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
                              className="flex h-5.5 px-2 items-center gap-1 rounded bg-indigo-50 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-400">
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
                        Vui lòng nhập chính xác <strong>Số tiền</strong> và <strong>Nội dung chuyển khoản</strong> để hệ thống tự động kích hoạt sau 3s.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Loading State while fetching real addInfo */
                  <div className="flex h-[380px] flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Đang khởi tạo mã chuyển khoản VietQR...
                    </p>
                  </div>
                )
              ) : (
                /* Embedded Fallback View */
                <div className="relative h-[460px] w-full overflow-hidden rounded-xl bg-white dark:bg-slate-900">
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

            {/* Modal Footer Controls — Streamlined with 15m Countdown */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Hết hạn sau:</span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
                  {formatTimeLeft(timeLeft)}
                </span>
              </div>

              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors">
                <ExternalLink className="h-3 w-3" />
                Mở trang PayOS gốc ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
