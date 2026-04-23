import { useState, useEffect } from "react";
import type { ApproverStep } from "@/lib/sr-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoExtensionNotification {
  id: string;
  type: "geo-extension-applied";
  srId: string;
  cbuId: string;
  cbuCode: string;
  cbuDescription: string;
  raisedBy: string;
  addedGeos: string[];
  addedDepots: string[];
  approvers: ApproverStep[];
  timestamp: number;
  read: boolean;
}

export interface LifecycleNotification {
  id: string;
  type: "lifecycle";
  eventLabel: string;
  networkId: string;
  materialCode: string;
  timestamp: number;
  read: boolean;
}

export interface AssignmentNotification {
  id: string;
  type: "assignment";
  action: "assigned" | "removed";
  cbuId: string;
  cbuCode: string;
  timestamp: number;
  read: boolean;
}

export interface FinanceEmailNotification {
  id: string;
  type: "finance-email";
  srId: string;
  networkId: string;
  success: boolean;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface BulkDigestNotification {
  id: string;
  type: "bulk-digest";
  bulkOperationId: string;
  action: "assigned" | "removed";
  cbuCount: number;
  timestamp: number;
  read: boolean;
}

export type AppNotification =
  | GeoExtensionNotification
  | LifecycleNotification
  | AssignmentNotification
  | FinanceEmailNotification
  | BulkDigestNotification;

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type NewNotification = DistributiveOmit<AppNotification, "id" | "read" | "timestamp">;

// ─── Bulk op → CBU code mapping ───────────────────────────────────────────────
// Populated lazily (on first navigation to /network?bulkOp=<id>) so that
// explicit impacted CBU codes are derived from the loaded network entries.

export const BULK_OP_CBU_CODES: Record<string, string[]> = {};

export function registerBulkOpCbus(bulkOpId: string, cbuCodes: string[]): void {
  if (!BULK_OP_CBU_CODES[bulkOpId]) {
    BULK_OP_CBU_CODES[bulkOpId] = cbuCodes;
  }
}

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

export function addNotification(n: NewNotification): void {
  _notifications = [
    { ...n, id: crypto.randomUUID(), read: false, timestamp: Date.now() } as AppNotification,
    ..._notifications,
  ].sort((a, b) => b.timestamp - a.timestamp);
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

// ─── Seed demo notifications (dev / fixture mode only) ────────────────────────

function seedDemoNotifications() {
  const base = Date.now();
  _notifications = [
    {
      id: "seed-bulk-1",
      type: "bulk-digest",
      bulkOperationId: "BULK-OPS-2024-001",
      action: "assigned",
      cbuCount: 12,
      timestamp: base - 1000 * 60 * 5,
      read: false,
    },
    {
      id: "seed-finance-1",
      type: "finance-email",
      srId: "SR-20240001",
      networkId: "NET-4421",
      success: true,
      message: "Finance confirmation email sent successfully to finance@unilever.com",
      timestamp: base - 1000 * 60 * 18,
      read: false,
    },
    {
      id: "seed-finance-2",
      type: "finance-email",
      srId: "SR-20240002",
      networkId: "NET-3305",
      success: false,
      message: "Finance email delivery failed — SMTP timeout. Please retry or contact IT support.",
      timestamp: base - 1000 * 60 * 35,
      read: false,
    },
    {
      id: "seed-assignment-1",
      type: "assignment",
      action: "assigned",
      cbuId: "CBU-8812",
      cbuCode: "CBU-8812",
      timestamp: base - 1000 * 60 * 60,
      read: false,
    },
    {
      id: "seed-assignment-2",
      type: "assignment",
      action: "removed",
      cbuId: "CBU-7703",
      cbuCode: "CBU-7703",
      timestamp: base - 1000 * 60 * 90,
      read: true,
    },
    {
      id: "seed-lifecycle-1",
      type: "lifecycle",
      eventLabel: "Production Started",
      networkId: "NET-1102",
      materialCode: "MAT-5567-A",
      timestamp: base - 1000 * 60 * 120,
      read: true,
    },
    {
      id: "seed-lifecycle-2",
      type: "lifecycle",
      eventLabel: "Stock Movement Initiated",
      networkId: "NET-2234",
      materialCode: "MAT-8823-B",
      timestamp: base - 1000 * 60 * 200,
      read: true,
    },
    {
      id: "seed-lifecycle-3",
      type: "lifecycle",
      eventLabel: "Transition Completed",
      networkId: "NET-3356",
      materialCode: "MAT-1194-C",
      timestamp: base - 1000 * 60 * 300,
      read: true,
    },
  ].sort((a, b) => b.timestamp - a.timestamp);
}

if (import.meta.env.DEV) {
  seedDemoNotifications();
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
