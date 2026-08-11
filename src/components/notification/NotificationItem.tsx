import { useTranslation } from "react-i18next";
/**
 * NotificationItem Component
 * Displays a single notification with icon, title, message, and time
 */

import { getNotificationTypeConfigFromTitle } from "@/constants/notification-types";
import { formatDateTime, parseBackendDate } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Notification } from "@/services/notification.manager";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
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
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("general.openNotification", {
        var_0: notificationTitle,
      })}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-all",
        isUnread
          ? "border border-indigo-100/80 bg-indigo-50/60 hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50"
          : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60",
        compact && "p-2.5"
      )}>
      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          isUnread
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          compact && "h-8 w-8"
        )}>
        <IconComponent
          className={cn("h-4.5 w-4.5", notificationType.iconColorClassName, compact && "h-4 w-4")}
        />
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
          {/* Unread indicator dot */}
          {isUnread && (
            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-indigo-600 shadow-2xs dark:bg-indigo-400" />
          )}
        </div>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300",
            compact && "line-clamp-1"
          )}>
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
