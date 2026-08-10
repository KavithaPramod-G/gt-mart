import { OrderStatus, WhatsAppNotification } from '@/types';

function normalizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

/** Latest shop note recorded for each status (from order_notifications). */
export function buildStatusNoteMap(
  updates: WhatsAppNotification[],
): Partial<Record<OrderStatus, string>> {
  const map: Partial<Record<OrderStatus, string>> = {};

  for (const update of updates) {
    const note = normalizeNote(update.statusNote);
    if (note) {
      map[update.status] = note;
    }
  }

  return map;
}

/** When each status was first reached (from order_notifications). */
export function buildStatusTimeMap(
  updates: WhatsAppNotification[],
): Partial<Record<OrderStatus, string>> {
  const map: Partial<Record<OrderStatus, string>> = {};

  for (const update of updates) {
    if (!map[update.status]) {
      map[update.status] = update.sentAt;
    }
  }

  return map;
}

export function formatOrderHistoryTime(sentAt: string): string {
  return new Date(sentAt).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getLatestStatusNote(updates: WhatsAppNotification[]): string | null {
  for (let index = updates.length - 1; index >= 0; index -= 1) {
    const note = normalizeNote(updates[index]?.statusNote);
    if (note) return note;
  }
  return null;
}

export function getCancelReason(updates: WhatsAppNotification[]): string | null {
  const cancelled = updates.filter((update) => update.status === 'cancelled');
  const last = cancelled[cancelled.length - 1];
  return normalizeNote(last?.statusNote);
}

export function getSortedStatusUpdates(
  updates: WhatsAppNotification[],
): WhatsAppNotification[] {
  return [...updates].sort(
    (left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime(),
  );
}
