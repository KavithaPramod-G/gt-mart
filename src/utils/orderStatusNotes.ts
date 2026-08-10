import { OrderStatus, WhatsAppNotification } from '@/types';

/** Latest shop note recorded for each status (from order_notifications). */
export function buildStatusNoteMap(
  updates: WhatsAppNotification[],
): Partial<Record<OrderStatus, string>> {
  const map: Partial<Record<OrderStatus, string>> = {};

  for (const update of updates) {
    const note = update.statusNote?.trim();
    if (note) {
      map[update.status] = note;
    }
  }

  return map;
}

export function getLatestStatusNote(updates: WhatsAppNotification[]): string | null {
  for (let index = updates.length - 1; index >= 0; index -= 1) {
    const note = updates[index]?.statusNote?.trim();
    if (note) return note;
  }
  return null;
}

export function getCancelReason(updates: WhatsAppNotification[]): string | null {
  const cancelled = updates.filter((update) => update.status === 'cancelled');
  const last = cancelled[cancelled.length - 1];
  return last?.statusNote?.trim() ?? null;
}
