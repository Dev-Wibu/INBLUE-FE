import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, Mail, Maximize2, Minimize2, Paperclip, X } from "lucide-react";
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
        {/* Overlay */}
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-200",
            // Mobile: full width with safe padding
            "inset-2 sm:inset-auto",
            // Desktop: centered, constrained, scrollable
            "sm:top-1/2 sm:left-1/2 sm:h-[90vh] sm:w-full sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-slate-200",
            // Fullscreen: full viewport
            isFullscreen && [
              "inset-0 !top-0 !left-0 !h-screen !w-screen !max-w-none !-translate-x-0 !-translate-y-0 !rounded-none !border-0",
            ],
            // Animation
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            // Dark mode
            "dark:border-slate-700 dark:bg-[#1f1f1f]"
          )}>
          {/* ── Header (fixed, no flex-shrink so it never collapses) ── */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-700 dark:bg-[#1f1f1f]">
            <div className="flex items-center gap-3">
              {/* Gmail icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0047AB] shadow-sm">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("emailPreview.title")}
                </DialogPrimitive.Title>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("emailPreview.subtitle")}
                </p>
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-1">
              {/* Status badge */}
              {email?.status && (
                <span
                  className={cn(
                    "mr-1 hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium sm:flex",
                    email.status === "PROCESSED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                      : email.status === "ERROR"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                  )}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      email.status === "PROCESSED"
                        ? "bg-green-500"
                        : email.status === "ERROR"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    )}
                  />
                  {email.status === "PROCESSED"
                    ? t("emailPreview.statusProcessed")
                    : email.status === "ERROR"
                      ? t("emailPreview.statusError")
                      : email.status}
                </span>
              )}
              {/* Fullscreen toggle */}
              <button
                onClick={handleToggleFullscreen}
                className="hidden items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:flex dark:hover:bg-slate-800 dark:hover:text-slate-300"
                title={
                  isFullscreen ? t("emailPreview.exitFullscreen") : t("emailPreview.fullscreen")
                }>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              {/* Close */}
              <DialogPrimitive.Close className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
                <span className="sr-only">{t("emailPreview.close")}</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* ── Scrollable Body ── flex-1 overflow-y-auto */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading */}
            {isLoading && (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Spinner size="lg" tone="primary" />
                <p className="text-sm text-slate-500">{t("emailPreview.loading")}</p>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                  <Mail className="h-7 w-7 text-red-400" />
                </div>
                <p className="font-medium text-red-600 dark:text-red-400">
                  {t("emailPreview.fetchError")}
                </p>
                <p className="text-sm text-slate-500">{t("emailPreview.fetchErrorRetry")}</p>
              </div>
            )}

            {/* Email content */}
            {email && !isLoading && (
              <div className="min-w-0">
                {/* Subject — Gmail style: bold, prominent, full-width */}
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700/50">
                  <h2 className="text-xl leading-snug font-semibold tracking-tight text-slate-900 dark:text-white">
                    {email.subject || t("emailPreview.noSubject")}
                  </h2>
                </div>

                {/* Sender row — Gmail style: avatar + name + date */}
                <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/50">
                  {/* Avatar */}
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0047AB] text-base font-semibold text-white shadow-sm">
                    {(email.senderEmail ?? "?")[0]?.toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Sender name + date on same line */}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {email.senderEmail || t("emailPreview.unknownSender")}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {email.receivedAt
                          ? formatDateTime(email.receivedAt)
                          : email.createdAt
                            ? formatDateTime(email.createdAt)
                            : ""}
                      </span>
                    </div>
                    {/* To row */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">
                        {t("emailPreview.to")}{" "}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {t("emailPreview.toAddress")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email body — Gmail style: full-width, clean */}
                <div className="px-6 py-6">
                  {/* Truncated state */}
                  {shouldTruncate && (
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1a1a1a]",
                        "max-h-80"
                      )}>
                      {/* Fade overlay */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-[#1a1a1a]" />
                      <pre className="m-0 overflow-hidden font-sans text-[15px] leading-7 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {email.bodyText}
                      </pre>
                    </div>
                  )}

                  {/* Expanded state */}
                  {isContentExpanded && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1a1a1a]">
                      <pre className="m-0 font-sans text-[15px] leading-7 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {email.bodyText}
                      </pre>
                    </div>
                  )}

                  {/* Non-truncated content (short emails) */}
                  {!shouldTruncate && !isContentExpanded && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1a1a1a]">
                      <pre className="m-0 font-sans text-[15px] leading-7 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                        {email.bodyText}
                      </pre>
                    </div>
                  )}

                  {/* Read more / collapse toggle */}
                  {isLongContent && (
                    <div className="mt-4 flex justify-center">
                      {shouldTruncate ? (
                        <button
                          onClick={() => setIsContentExpanded(true)}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-[#0047AB] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700">
                          <ChevronDown className="h-4 w-4" />
                          {t("emailPreview.readMore")}
                        </button>
                      ) : isContentExpanded ? (
                        <button
                          onClick={() => setIsContentExpanded(false)}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                          <ChevronUp className="h-4 w-4" />
                          {t("emailPreview.collapse")}
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Attachments */}
                  {email.attachmentUrls && email.attachmentUrls !== "[]" && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#252525]">
                      <div className="mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                          {t("emailPreview.attachments")}
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
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm",
                                  "border-slate-200 bg-white text-slate-700",
                                  "hover:border-[#0047AB]/40 hover:bg-[#0047AB]/5 hover:text-[#0047AB]",
                                  "dark:border-slate-700 dark:bg-[#1a1a1a] dark:text-slate-300",
                                  "dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                                )}>
                                <Paperclip className="h-4 w-4 shrink-0" />
                                <span className="max-w-[180px] truncate">
                                  {url.split("/").pop() ??
                                    t("emailPreview.attachment", { index: i + 1 })}
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

                  {/* Status row */}
                  {email?.status && (
                    <div className="mt-6 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:hidden",
                          email.status === "PROCESSED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            : email.status === "ERROR"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        )}>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            email.status === "PROCESSED"
                              ? "bg-green-500"
                              : email.status === "ERROR"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          )}
                        />
                        {email.status === "PROCESSED"
                          ? t("emailPreview.statusProcessed")
                          : email.status === "ERROR"
                            ? t("emailPreview.statusError")
                            : email.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer (fixed) ── */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-[#1f1f1f]">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                {t("emailPreview.close")}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
