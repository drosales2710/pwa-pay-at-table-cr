import type { CartItem } from "../types"

/** Guest can undo a sent line within this window before that station starts preparing. */
export const ORDER_UNDO_WINDOW_MS = 60 * 1000

export function extractOrderId(cartId: string): string | null {
  const match = cartId.match(/^(gq-\d+)/)
  return match ? match[1] : null
}

export function getItemOrderId(item: CartItem): string {
  return item.orderId ?? extractOrderId(item.cartId) ?? item.cartId
}

export interface SentOrderBatch {
  orderId: string
  sentAt: string
  /** Kitchen send batch number (not billing cycle). */
  round: number
  receiptCycle: number
  items: CartItem[]
}

export function groupSentOrdersByBatch(items: CartItem[]): SentOrderBatch[] {
  const batches = new Map<string, SentOrderBatch>()

  for (const item of items) {
    const orderId = getItemOrderId(item)
    const existing = batches.get(orderId)
    if (existing) {
      existing.items.push(item)
    } else {
      batches.set(orderId, {
        orderId,
        sentAt: item.sentAt ?? new Date(0).toISOString(),
        round: item.round,
        receiptCycle: item.receiptCycle,
        items: [item],
      })
    }
  }

  return Array.from(batches.values()).sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
}

export function undoSecondsRemaining(sentAt: string, now = Date.now()): number {
  const elapsed = now - new Date(sentAt).getTime()
  return Math.max(0, Math.ceil((ORDER_UNDO_WINDOW_MS - elapsed) / 1000))
}

export function canUndoBatch(sentAt: string, now = Date.now()): boolean {
  return undoSecondsRemaining(sentAt, now) > 0
}

export type GuestCancelReason = "expired" | "kitchen_started" | "not_found"
export type StaffBillReason = "not_found" | "paid"

export function canGuestUndoItem(sentAt: string | undefined, kitchenStarted: boolean, now = Date.now()): boolean {
  if (!sentAt || !canUndoBatch(sentAt, now)) return false
  return !kitchenStarted
}
