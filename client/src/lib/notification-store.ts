import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoExtensionNotification {
  id: string;
  type: "geo-extension-applied";
  cbuId: string;
  cbuCode: string;
  cbuDescription: string;
  addedGeos: string[];
  addedDepots: string[];
  timestamp: number;
  read: boolean;
}

export type AppNotification = GeoExtensionNotification;

// ─── Module-level store ───────────────────────────────────────────────────────

let _notifications: AppNotification[] = [];
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(fn => fn());
}

export function getNotifications(): AppNotification[] {
  return _notifications;
}

export function getUnreadCount(): number {
  return _notifications.filter(n => !n.read).length;
}

export function addNotification(n: Omit<AppNotification, "id" | "read" | "timestamp">): void {
  _notifications = [
    { ...n, id: crypto.randomUUID(), read: false, timestamp: Date.now() } as AppNotification,
    ..._notifications,
  ];
  notify();
}

export function markAllRead(): void {
  _notifications = _notifications.map(n => ({ ...n, read: true }));
  notify();
}

export function subscribeNotifications(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificationStore() {
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotifications);
  const [unreadCount, setUnreadCount]     = useState<number>(getUnreadCount);
  useEffect(() => {
    return subscribeNotifications(() => {
      setNotifications([...getNotifications()]);
      setUnreadCount(getUnreadCount());
    });
  }, []);
  return { notifications, unreadCount };
}
