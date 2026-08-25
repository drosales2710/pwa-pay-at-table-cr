import type { CartItem, PaymentRecord } from "../types"
import { getCycleRemaining, getPaidForCycle } from "./billing"

/** Fully paid cycles cannot be silently rewritten — they need a refund path. */
export function isReceiptCyclePaid(
  item: CartItem,
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): boolean {
  const paid = getPaidForCycle(payments, item.receiptCycle)
  if (paid <= 0) return false
  return getCycleRemaining(sentOrders, cart, payments, item.receiptCycle) <= 0
}

export function staffGuestId(tableId: string): string {
  return `staff-${tableId}`
}
