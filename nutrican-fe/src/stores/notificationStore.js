// src/stores/notificationStore.js
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  sseConnection: null,

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),

  markAsRead: (id) => set((state) => {
    const wasUnread = state.notifications.some((n) => n.id === id && !n.isRead);
    return {
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    };
  }),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),

  setNotifications: (notifications) => set({ notifications }),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  setSseConnection: (conn) => set({ sseConnection: conn }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));
