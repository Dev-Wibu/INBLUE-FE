import type { Notification } from "@/services/notification.manager";

const BROADCAST_CHANNEL_NAME = "inblue-fe:notification-alerts";
const STORAGE_EVENT_KEY = "inblue-fe:notification-alert";

const isNotificationPayload = (value: unknown): value is Notification => {
  return typeof value === "object" && value !== null;
};

export function broadcastNotificationCreated(notification: Notification): void {
  if (typeof window === "undefined") {
    return;
  }

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage(notification);
    channel.close();
  }

  try {
    localStorage.setItem(
      STORAGE_EVENT_KEY,
      JSON.stringify({ type: "notification-created", notification, timestamp: Date.now() })
    );
    localStorage.removeItem(STORAGE_EVENT_KEY);
  } catch {
    // Ignore storage access issues. BroadcastChannel remains the primary path.
  }
}

export function subscribeToNotificationCreated(
  handler: (notification: Notification) => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const channel =
    "BroadcastChannel" in window ? new BroadcastChannel(BROADCAST_CHANNEL_NAME) : null;

  if (channel) {
    channel.onmessage = (event) => {
      if (isNotificationPayload(event.data)) {
        handler(event.data);
      }
    };
  }

  const handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) {
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue) as { notification?: unknown };
      if (isNotificationPayload(parsed.notification)) {
        handler(parsed.notification);
      }
    } catch {
      // Ignore malformed storage payloads.
    }
  };

  window.addEventListener("storage", handleStorageEvent);

  return () => {
    channel?.close();
    window.removeEventListener("storage", handleStorageEvent);
  };
}
