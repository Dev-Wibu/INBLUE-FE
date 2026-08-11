import { Badge } from "@/components/ui/badge";
import { getNotificationTypeConfigFromTitle } from "@/constants/notification-types";
import { formatDateTime, parseBackendDate } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Notification } from "@/services/notification.manager";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkRead?: () => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  compact = false,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const notificationType = getNotificationTypeConfigFromTitle(notification.title, t);
  const isUnread = !notification.isRead;
  const parsedCreatedAt = parseBackendDate(notification.createAt);
  const notificationTitle = notification.title || t("common.notification");

  const handleClick = () => {
    if (onMarkRead && isUnread) {
      onMarkRead();
    }
    onClick?.();
  };

  const timeAgo = parsedCreatedAt
    ? formatDistanceToNow(parsedCreatedAt, {
        addSuffix: true,
        locale: i18n.language === "en" ? undefined : vi,
      })
    : "";
  const absoluteTime = parsedCreatedAt ? formatDateTime(parsedCreatedAt) : "";
  const IconComponent = notificationType.icon;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t("general.openNotification", {
          var_0: notificationTitle,
        })}
        className={cn(
          "group flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-all",
          isUnread
            ? "border border-indigo-100/80 bg-indigo-50/60 hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50"
            : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60"
        )}>
        {/* Icon */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
            isUnread
              ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}>
          <IconComponent className={cn("h-4 w-4", notificationType.iconColorClassName)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-xs font-semibold text-slate-900 dark:text-slate-100",
                isUnread && "font-bold text-indigo-950 dark:text-indigo-100"
              )}>
              {notificationTitle}
            </p>
            {isUnread && (
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-indigo-600 shadow-2xs dark:bg-indigo-400" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-600 dark:text-slate-300">
            {notification.message}
          </p>
          {timeAgo && (
            <p
              title={absoluteTime}
              className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {timeAgo}
            </p>
          )}
        </div>
      </button>
    );
  }

  // Full Page Notification Item Card
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("general.openNotification", {
        var_0: notificationTitle,
      })}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-4 rounded-2xl p-4 text-left shadow-2xs transition-all",
        isUnread
          ? "border border-indigo-200/90 bg-indigo-50/70 hover:border-indigo-300 hover:bg-indigo-50/90 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/60"
          : "border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      )}>
      {/* Type Icon Badge */}
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-2xs transition-all",
          isUnread
            ? "bg-indigo-600 text-white shadow-indigo-500/20 dark:bg-indigo-600"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        )}>
        <IconComponent
          className={cn("h-5 w-5", isUnread ? "text-white" : notificationType.iconColorClassName)}
        />
      </div>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "text-sm font-bold tracking-tight text-slate-900 dark:text-white",
                isUnread && "text-indigo-950 dark:text-indigo-100"
              )}>
              {notificationTitle}
            </h4>
            {isUnread && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all",
                isUnread
                  ? "border-indigo-200 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/80 dark:text-indigo-300"
                  : "border-slate-200/80 bg-slate-100/70 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400"
              )}>
              {isUnread ? (
                <>
                  <Circle className="mr-1 h-3 w-3 fill-current" />
                  {t("common.haventReadYet", "Chưa đọc")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {t("common.read", "Đã đọc")}
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Message Body */}
        <p className="mt-1.5 text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-200">
          {notification.message}
        </p>

        {/* Timestamp Footer */}
        {parsedCreatedAt && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            <span title={absoluteTime}>{timeAgo || absoluteTime}</span>
            {timeAgo && absoluteTime && (
              <>
                <span>•</span>
                <span>{absoluteTime}</span>
              </>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
