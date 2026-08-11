import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, parseBackendDate } from "@/lib/formatting";
import type { Notification } from "@/services/notification.manager";
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
  const parsedCreatedAt = parseBackendDate(notification.createAt);
  const isRead = Boolean(notification.isRead);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-slate-200/90 sm:max-w-lg dark:border-slate-800/80 dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {notification.title || t("common.notification")}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {t("compNotification.viewYourNotificationDetails")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                isRead
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-indigo-200 bg-indigo-50/80 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-300"
              }>
              {isRead ? (
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Circle className="mr-1 h-3.5 w-3.5 fill-current" />
              )}
              {isRead ? t("common.read") : t("common.haventReadYet")}
            </Badge>

            {parsedCreatedAt && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                {formatDateTime(parsedCreatedAt)}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs leading-relaxed font-medium text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-200">
            {notification.message || t("compNotification.thisAnnouncementDoesNotHave")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
