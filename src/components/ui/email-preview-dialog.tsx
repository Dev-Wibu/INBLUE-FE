import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { cn } from "@/lib/utils";
import { Mail, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailSubmissionId: number;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailSubmissionId,
}: EmailPreviewDialogProps) {
  const { t } = useTranslation();
  const { data: email, isLoading, isError } = useEmailSubmission(emailSubmissionId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#0047AB]" />
            {t("emailPreview.title")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("emailPreview.description")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-red-500">{t("emailPreview.fetchError")}</p>
          </div>
        )}

        {email && !isLoading && (
          <div className="mt-2 space-y-4">
            {/* Email metadata card */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {/* Header */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0047AB]/10">
                    <Mail className="h-4 w-4 text-[#0047AB]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {email.subject || t("emailPreview.noSubject")}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {t("emailPreview.from")}: {email.senderEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="m-0 overflow-visible border-0 bg-transparent p-0 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-700 shadow-none dark:text-slate-300">
                    {email.bodyText}
                  </pre>
                </div>
              </div>

              {/* Attachments */}
              {email.attachmentUrls &&
              email.attachmentUrls !== "[]" &&
              email.attachmentUrls !== "[]" ? (
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
                  <div className="mb-2 flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
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
                              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
                              "border-slate-200 bg-white text-slate-700",
                              "hover:border-[#0047AB]/30 hover:bg-slate-50",
                              "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                              "transition-colors dark:hover:bg-slate-700"
                            )}>
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">
                              {url.split("/").pop() ?? `Attachment ${i + 1}`}
                            </span>
                          </a>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              ) : null}

              {/* Footer: timestamp */}
              {email.receivedAt && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-400">
                    {t("emailPreview.receivedAt")}:{" "}
                    {new Date(email.receivedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("general.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
