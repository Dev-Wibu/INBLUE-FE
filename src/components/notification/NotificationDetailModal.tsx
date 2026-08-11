import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getNotificationTypeConfigFromTitle } from "@/constants/notification-types";
import { formatDateTime, parseBackendDate } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import type { Notification } from "@/services/notification.manager";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NotificationDetailModalProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDetailModal({
  notification,
  open,
  onOpenChange,
}: NotificationDetailModalProps) {
  const { t } = useTranslation();
  if (!notification) {
    return null;
  }

  const notificationType = getNotificationTypeConfigFromTitle(notification.title, t);
  const IconComponent = notificationType.icon;
  const parsedCreatedAt = parseBackendDate(notification.createAt);
  const isRead = Boolean(notification.isRead);

  const timeAgo = parsedCreatedAt
    ? formatDistanceToNow(parsedCreatedAt, {
        addSuffix: true,
        locale: i18n.language === "en" ? undefined : vi,
      })
    : "";
  const absoluteTime = parsedCreatedAt ? formatDateTime(parsedCreatedAt) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-slate-200/90 p-6 shadow-xl sm:max-w-md dark:border-slate-800/80 dark:bg-slate-950">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-400 dark:ring-indigo-500/30">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {notification.title || t("common.notification")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("compNotification.viewYourNotificationDetails")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Metadata & Status Bar */}
          <div className="flex items-center justify-between border-y border-slate-100 py-3 dark:border-slate-800/80">
            <Badge
              variant="outline"
              className={
                isRead
                  ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-indigo-200/80 bg-indigo-50/80 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300"
              }>
              {isRead ? (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Circle className="mr-1.5 h-3.5 w-3.5 fill-current" />
              )}
              {isRead ? t("common.read") : t("common.haventReadYet")}
            </Badge>

            {parsedCreatedAt && (
              <span
                title={absoluteTime}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                <span>{timeAgo || absoluteTime}</span>
              </span>
            )}
          </div>

          {/* Message Content Box */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 text-xs leading-relaxed font-medium text-slate-700 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-200">
            <p className="whitespace-pre-wrap">
              {notification.message || t("compNotification.thisAnnouncementDoesNotHave")}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-1 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl border-slate-200/90 px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-900">
            {t("common.close", "Đóng")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
