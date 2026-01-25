/**
 * Notification Store using Zustand with persistence
 * Manages notification state for real-time updates
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Notification } from "@/services/notification.manager";

export interface NotificationState {
  // State
  unreadCount: number;
  notifications: Notification[];
  isDropdownOpen: boolean;

  // Actions
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      // Initial state
      unreadCount: 0,
      notifications: [],
      isDropdownOpen: false,

      // Actions
      setUnreadCount: (count) => set({ unreadCount: count }),

      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

      decrementUnread: () =>
        set((state) => ({
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          unreadCount: Math.max(
            0,
            state.unreadCount - (state.notifications.find((n) => n.id === id && !n.isRead) ? 1 : 0)
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),

      toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),

      closeDropdown: () => set({ isDropdownOpen: false }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
        })),

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        }),
    }),
    {
      name: "notification-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist unreadCount to avoid stale data
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
