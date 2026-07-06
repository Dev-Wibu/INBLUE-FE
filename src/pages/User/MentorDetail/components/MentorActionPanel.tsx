import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SchemaMentorResponse } from "@/interfaces/schema.types";
import { openUrlInNewTab } from "@/lib/media-file-utils";
import { cn } from "@/lib/utils";
import { CalendarCheck2, Copy, ExternalLink, Linkedin, Mail, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
interface MentorActionPanelProps {
  mentor: SchemaMentorResponse;
  onBookNow: () => void;
  onStartChat: () => void;
}
export function MentorActionPanel({ mentor, onBookNow, onStartChat }: MentorActionPanelProps) {
  const { t } = useTranslation();
  const handleCopyEmail = async () => {
    if (!mentor.email) {
      return;
    }
    try {
      await navigator.clipboard.writeText(mentor.email);
      toast.success(t("common.mentorEmailCopied"));
    } catch {
      toast.error(t("common.emailCannotBeCopiedPleaseTryAgain"));
    }
  };
  return (
    <Card className="h-fit border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {t("common.bookThisMentor")}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {t("userMentordetail.chooseTheAppropriateWayTo")}
      </p>

      <div className="mt-5 space-y-3">
        <Button
          type="button"
          className="h-11 w-full bg-[#0047AB] font-semibold text-white hover:bg-[#003b8f]"
          onClick={onBookNow}>
          <CalendarCheck2 className="mr-2 h-4 w-4" />
          {t("common.scheduleNow")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full border-slate-200 text-slate-700 hover:bg-slate-100",
            "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          )}
          onClick={onStartChat}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("common.startAConversation")}
        </Button>
      </div>

      <div className="my-5 border-t border-slate-200 dark:border-slate-700" />

      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
        {mentor.email && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center font-medium">
                <Mail className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-300" />
                {t("userMentordetail.contactEmail")}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                onClick={handleCopyEmail}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {t("userMentordetail.copy")}
              </Button>
            </div>

            <p
              className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400"
              title={mentor.email}>
              {mentor.email}
            </p>
          </div>
        )}

        {mentor.linkedInUrl && (
          <a
            href={mentor.linkedInUrl}
            rel="noreferrer"
            onClick={(event) => {
              event.preventDefault();
              openUrlInNewTab(mentor.linkedInUrl || "");
            }}
            className={cn(
              "flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:border-slate-300",
              "dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600"
            )}>
            <span className="flex items-center">
              <Linkedin className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-300" />
              {t("common.linkedinProfile")}
            </span>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        )}
      </div>
    </Card>
  );
}
