import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { subscribeToNotificationCreated } from "@/lib/notification-alert-bus";
import type { Notification } from "@/services/notification.manager";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

const NOTIFICATION_SOUND_COOLDOWN_MS = 1500;
const MAX_TOAST_MESSAGE_LENGTH = 140;

const isValidNotificationId = (id: Notification["id"]): id is number => {
  return typeof id === "number" && Number.isFinite(id) && id > 0;
};

const toTimestamp = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsedTime = new Date(value).getTime();
  return Number.isFinite(parsedTime) ? parsedTime : 0;
};

const truncateMessage = (message?: string): string => {
  const trimmed = message?.trim();
  if (!trimmed) {
    return "Bạn vừa nhận được một thông báo mới.";
  }

  if (trimmed.length <= MAX_TOAST_MESSAGE_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_TOAST_MESSAGE_LENGTH - 1).trimEnd()}…`;
};

const getNotificationSummaryTitle = (notifications: Notification[]): string => {
  if (notifications.length <= 1) {
    return notifications[0]?.title?.trim() || "Thông báo mới";
  }

  return `Có ${notifications.length} thông báo mới`;
};

const getNotificationSummaryDescription = (notifications: Notification[]): string => {
  if (notifications.length <= 1) {
    return truncateMessage(notifications[0]?.message);
  }

  const latestNotification = [...notifications].sort(
    (left, right) => toTimestamp(right.createAt) - toTimestamp(left.createAt)
  )[0];

  const latestTitle = latestNotification?.title?.trim();
  const latestMessage = truncateMessage(latestNotification?.message);

  if (latestTitle) {
    return `${latestTitle} · ${latestMessage}`;
  }

  return latestMessage;
};

const playNotificationChime = async (): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  try {
    const audioContext = new AudioContextCtor();

    if (audioContext.state === "suspended") {
      await audioContext.resume().catch(() => undefined);
    }

    const createTone = (frequency: number, startOffset: number, duration: number): void => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startTime = audioContext.currentTime + startOffset;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.65, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.18, startTime + duration - 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.02);
    };

    createTone(880, 0, 0.18);
    createTone(1175, 0.2, 0.18);

    window.setTimeout(() => {
      audioContext.close().catch(() => undefined);
    }, 1000);
  } catch {
    // Ignore sound playback failures. Toast still communicates the alert.
  }
};

export interface UseNotificationAlertsOptions {
  notifications: Notification[];
  notificationsPath?: string;
  enabled?: boolean;
}

export function useNotificationAlerts({
  notifications,
  notificationsPath = "/user?tab=notifications",
  enabled = true,
}: UseNotificationAlertsOptions) {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const muteSoundNotification = useSettingsStore((state) => state.muteSoundNotification);
  const muteToastNotification = useSettingsStore((state) => state.muteToastNotification);
  const seenNotificationIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const lastSoundAtRef = useRef(0);

  const markNotificationAsSeen = useCallback((notification: Notification): void => {
    if (isValidNotificationId(notification.id)) {
      seenNotificationIdsRef.current.add(notification.id);
    }
  }, []);

  const shouldHandleNotification = useCallback(
    (notification: Notification): boolean => {
      if (!isValidNotificationId(notification.id) || notification.isRead) {
        return false;
      }

      if (currentUserId && notification.user?.id && notification.user.id !== currentUserId) {
        return false;
      }

      return true;
    },
    [currentUserId]
  );

  const handleNotificationBatch = useCallback(
    (notificationBatch: Notification[]): void => {
      const newNotifications = notificationBatch.filter(
        (notification) =>
          shouldHandleNotification(notification) &&
          !seenNotificationIdsRef.current.has(notification.id as number)
      );

      notificationBatch.forEach(markNotificationAsSeen);

      if (newNotifications.length === 0) {
        return;
      }

      const summaryTitle = getNotificationSummaryTitle(newNotifications);
      const summaryDescription = getNotificationSummaryDescription(newNotifications);

      if (
        !muteSoundNotification &&
        Date.now() - lastSoundAtRef.current >= NOTIFICATION_SOUND_COOLDOWN_MS
      ) {
        lastSoundAtRef.current = Date.now();
        void playNotificationChime();
      }

      if (!muteToastNotification) {
        toast.info(summaryTitle, {
          description: summaryDescription,
          duration: 6000,
          action: {
            label: "Xem thông báo",
            onClick: () => navigate(notificationsPath),
          },
        });
      }
    },
    [
      markNotificationAsSeen,
      muteSoundNotification,
      muteToastNotification,
      navigate,
      notificationsPath,
      shouldHandleNotification,
    ]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!initializedRef.current) {
      notifications.forEach(markNotificationAsSeen);
      initializedRef.current = true;
      return;
    }

    handleNotificationBatch(notifications);
  }, [enabled, handleNotificationBatch, markNotificationAsSeen, notifications]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToNotificationCreated((notification) => {
      handleNotificationBatch([notification]);
    });
  }, [enabled, handleNotificationBatch]);
}
