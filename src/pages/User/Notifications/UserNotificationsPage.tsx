import { NotificationDetailModal, NotificationList } from "@/components/notification";
import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  getNotificationTypeConfig,
  inferNotificationType,
  NOTIFICATION_GROUP_ORDER,
} from "@/constants/notification-types";
import { useMarkAllAsRead, useMarkAsRead, useNotifications } from "@/hooks/useNotification";
import { cn } from "@/lib/utils";
import type { Notification } from "@/services/notification.manager";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationFilter = "all" | "unread" | "read";

export function UserNotificationsPage() {
  const { t } = useTranslation();
  const [filterStatus, setFilterStatus] = useState<NotificationFilter>("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { data: notifications = [], isLoading, isRefetching, refetch } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.length - unreadCount;
  const unreadNotificationIds = useMemo(
    () =>
      notifications.filter((n) => !n.isRead && typeof n.id === "number").map((n) => n.id as number),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filterStatus === "unread") {
      return notifications.filter((notification) => !notification.isRead);
    }
    if (filterStatus === "read") {
      return notifications.filter((notification) => notification.isRead);
    }
    return notifications;
  }, [filterStatus, notifications]);

  const groupedNotifications = useMemo(() => {
    const groupedMap = new Map<string, Notification[]>();
    for (const notification of filteredNotifications) {
      const type = inferNotificationType(notification.title, t);
      const currentGroup = groupedMap.get(type) ?? [];
      currentGroup.push(notification);
      groupedMap.set(type, currentGroup);
    }
    return NOTIFICATION_GROUP_ORDER.map((type) => ({
      type,
      label: getNotificationTypeConfig(type, t).label,
      notifications: groupedMap.get(type) ?? [],
    })).filter((group) => group.notifications.length > 0);
  }, [filteredNotifications, t]);

  const handleMarkAllRead = () => {
    if (!unreadNotificationIds.length) {
      return;
    }
    markAllAsRead(unreadNotificationIds);
  };

  const handleMarkRead = (notificationId: number) => {
    markAsRead(notificationId);
  };

  const handleItemClick = (notification: Notification) => {
    setSelectedNotification(
      notification.isRead
        ? notification
        : {
            ...notification,
            isRead: true,
          }
    );
  };

  return (
    <>
      <div className="animate-in fade-in space-y-5 duration-300">
        {/* Header Container */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-400 dark:ring-indigo-500/30">
              <Bell className="h-5.5 w-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("common.notification")}
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                    {unreadCount} {t("general.unread", "mới")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("common.manageAllYourNotifications")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ReloadButton
              onReload={async () => {
                await refetch();
              }}
              isLoading={isRefetching}
              tooltip={t("common.reloadNotifications")}
            />
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllRead}
                disabled={isMarkingAllAsRead}
                className="h-9 gap-2 rounded-xl border-slate-200/90 px-4 text-xs font-semibold text-indigo-600 shadow-2xs hover:bg-indigo-50/80 hover:text-indigo-700 dark:border-slate-800/80 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                {isMarkingAllAsRead ? <Spinner size="sm" /> : <CheckCheck className="h-4 w-4" />}
                {t("common.markAllAsRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs Container */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: t("common.all"), count: notifications.length },
              { id: "unread", label: t("general.unread"), count: unreadCount },
              { id: "read", label: t("general.read"), count: readCount },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as NotificationFilter)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  )}>
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "py-0.2 rounded-full px-1.5 text-[10.5px] font-bold",
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List Container */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 py-12 text-center dark:border-slate-800/80 dark:bg-slate-950/40">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("compNotification.thereAreNoNewNotifications", "Không có thông báo nào")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "common.noMessagesMatchingTheFilterWereFou",
                  "Không tìm thấy tin nhắn khớp với bộ lọc này"
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedNotifications.map((group) => (
                <section key={group.type} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                        {group.label}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {group.notifications.length} {t("common.notification1", "thông báo")}
                    </span>
                  </div>
                  <NotificationList
                    notifications={group.notifications}
                    isLoading={isLoading}
                    onItemClick={handleItemClick}
                    onMarkRead={handleMarkRead}
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <NotificationDetailModal
        notification={selectedNotification}
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      />
    </>
  );
}
