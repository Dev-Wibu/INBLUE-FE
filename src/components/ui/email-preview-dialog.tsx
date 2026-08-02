import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Maximize2,
  Minimize2,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailSubmissionId: number | null;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailSubmissionId,
}: EmailPreviewDialogProps) {
  const { t } = useTranslation();
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    data: email,
    isLoading,
    isError,
  } = useEmailSubmission(emailSubmissionId ?? 0, open && emailSubmissionId !== null);

  const isLongContent = (email?.bodyText?.length ?? 0) > 1000;
  const shouldTruncate = isLongContent && !isContentExpanded;

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setIsContentExpanded(false);
      setIsFullscreen(false);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        {/* Dark Backdrop Overlay */}
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md" />

        {/* Executive Dark Window Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-xl transition-all duration-200",
            "inset-2 sm:inset-auto",
            "sm:top-1/2 sm:left-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            isFullscreen && [
              "inset-0 !top-0 !left-0 !h-screen !w-screen !max-w-none !-translate-x-0 !-translate-y-0 !rounded-none !border-0",
            ],
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 py-3.5">
            <div className="flex items-center gap-3">
              {/* Window Dots */}
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate font-mono text-xs font-extrabold text-amber-300">
                  {email?.subject || t("emailPreview.title", "Chi Tiết Email Bài Làm")}
                </DialogPrimitive.Title>
                <p className="text-[11px] text-slate-400">
                  {t("emailPreview.subtitle", "Nội dung email bài thi đã được hệ thống thu thập")}
                </p>
              </div>
            </div>

            {/* Action Row & Badges */}
            <div className="flex items-center gap-2">
              {email?.status && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                    email.status === "PROCESSED"
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                      : email.status === "ERROR"
                        ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
                        : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                  )}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      email.status === "PROCESSED"
                        ? "bg-emerald-400"
                        : email.status === "ERROR"
                          ? "bg-rose-400"
                          : "bg-amber-400"
                    )}
                  />
                  {email.status === "PROCESSED"
                    ? t("emailPreview.statusProcessed", "Đã thu thập & Chấm AI")
                    : email.status === "ERROR"
                      ? t("emailPreview.statusError", "Lỗi phân tích")
                      : email.status}
                </span>
              )}

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white sm:flex"
                title={
                  isFullscreen
                    ? t("emailPreview.exitFullscreen", "Thoát toàn màn hình")
                    : t("emailPreview.fullscreen", "Toàn màn hình")
                }>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>

              <DialogPrimitive.Close className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">{t("emailPreview.close", "Đóng")}</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Loading */}
            {isLoading && (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Spinner size="lg" tone="primary" />
                <p className="text-xs text-slate-400">
                  {t("emailPreview.loading", "Đang tải dữ liệu email...")}
                </p>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
                  <Mail className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-rose-400">
                  {t("emailPreview.fetchError", "Không thể tải nội dung email")}
                </p>
              </div>
            )}

            {/* Content */}
            {email && !isLoading && (
              <div className="space-y-4">
                {/* Sender & Receiver Meta Box */}
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-mono text-[10px] font-bold text-slate-400 uppercase">
                        Người gửi:
                      </span>
                      <span className="font-mono font-bold text-indigo-300">
                        {email.senderEmail || t("emailPreview.unknownSender", "Chưa xác định")}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {email.receivedAt
                        ? formatDateTime(email.receivedAt)
                        : email.createdAt
                          ? formatDateTime(email.createdAt)
                          : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="w-12 font-mono text-[10px] font-bold text-slate-400 uppercase">
                      Người nhận:
                    </span>
                    <span className="font-mono text-slate-300">
                      {t("emailPreview.toAddress", "hanptse184261@fpt.edu.vn")}
                    </span>
                  </div>
                </div>

                {/* Email Body Editor Frame */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <span>NỘI DUNG EMAIL BÀI THI</span>
                    <span className="flex items-center gap-1 font-mono text-[10px] font-normal text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Captured Body
                    </span>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-inner",
                      shouldTruncate && "relative max-h-80 overflow-hidden"
                    )}>
                    {shouldTruncate && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
                    )}
                    <pre className="m-0 font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-200">
                      {email.bodyText}
                    </pre>
                  </div>

                  {isLongContent && (
                    <div className="flex justify-center pt-1">
                      {shouldTruncate ? (
                        <button
                          type="button"
                          onClick={() => setIsContentExpanded(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-slate-700 hover:text-white">
                          <ChevronDown className="h-3.5 w-3.5" />
                          {t("emailPreview.readMore", "Xem toàn bộ nội dung")}
                        </button>
                      ) : isContentExpanded ? (
                        <button
                          type="button"
                          onClick={() => setIsContentExpanded(false)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-700 hover:text-white">
                          <ChevronUp className="h-3.5 w-3.5" />
                          {t("emailPreview.collapse", "Thu gọn")}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {email.attachmentUrls && email.attachmentUrls !== "[]" && (
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        {t("emailPreview.attachments", "File đính kèm")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const urls = JSON.parse(email.attachmentUrls ?? "[]") as string[];
                          return urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white">
                              <Paperclip className="h-3.5 w-3.5 text-indigo-400" />
                              <span className="max-w-[180px] truncate">
                                {url.split("/").pop() ?? `Attachment #${i + 1}`}
                              </span>
                            </a>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-800 bg-slate-950/90 px-5 py-3">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="h-8 border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white">
                {t("emailPreview.close", "Đóng")}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
