import type { CartItem, PaymentRecord } from "../types"
import { sumItems } from "./split"
import { groupSentOrdersByBatch, type SentOrderBatch } from "./order"

export function sumItemsForCycle(items: CartItem[], cycle: number): number {
  return sumItems(items.filter((i) => i.receiptCycle === cycle))
}

export function getPaidForCycle(payments: PaymentRecord[], cycle: number): number {
  return payments.filter((p) => p.receiptCycle === cycle).reduce((s, p) => s + p.amount, 0)
}

export function getCycleRemaining(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[],
  cycle: number
): number {
  const all = [...sentOrders, ...cart]
  return Math.max(0, sumItemsForCycle(all, cycle) - getPaidForCycle(payments, cycle))
}

export function getActiveReceiptCycles(sentOrders: CartItem[], cart: CartItem[]): number[] {
  const cycles = new Set<number>()
  for (const item of [...sentOrders, ...cart]) {
    cycles.add(item.receiptCycle)
  }
  return [...cycles].sort((a, b) => a - b)
}

export function getOldestUnpaidReceiptCycle(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): number {
  for (const cycle of getActiveReceiptCycles(sentOrders, cart)) {
    if (getCycleRemaining(sentOrders, cart, payments, cycle) > 0) {
      return cycle
    }
  }
  const cycles = getActiveReceiptCycles(sentOrders, cart)
  return cycles[cycles.length - 1] ?? 1
}

/** Items belonging to billing cycles that still have an open balance. */
export function getOpenBillItems(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): CartItem[] {
  const all = [...sentOrders, ...cart]
  return all.filter(
    (item) => getCycleRemaining(sentOrders, cart, payments, item.receiptCycle) > 0
  )
}

export interface ReceiptCycleGroup {
  receiptCycle: number
  batches: SentOrderBatch[]
  cartItems: CartItem[]
  total: number
  remaining: number
  paidTotal: number
}

export function groupByReceiptCycle(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): ReceiptCycleGroup[] {
  const cycles = getActiveReceiptCycles(sentOrders, cart)
  return cycles.map((receiptCycle) => {
    const cycleSent = sentOrders.filter((i) => i.receiptCycle === receiptCycle)
    const cycleCart = cart.filter((i) => i.receiptCycle === receiptCycle)
    const total = sumItemsForCycle([...sentOrders, ...cart], receiptCycle)
    const paidTotal = getPaidForCycle(payments, receiptCycle)
    return {
      receiptCycle,
      batches: groupSentOrdersByBatch(cycleSent),
      cartItems: cycleCart,
      total,
      remaining: Math.max(0, total - paidTotal),
      paidTotal,
    }
  })
}

/** Next receipt cycle number for newly added cart items after a payment. */
export function nextReceiptCycleAfterPayment(
  payments: PaymentRecord[],
  targetCycle: number,
  currentNewItemCycle: number
): number {
  const hadPaymentsOnCycle = payments.some((p) => p.receiptCycle === targetCycle)
  return hadPaymentsOnCycle ? currentNewItemCycle : Math.max(currentNewItemCycle, targetCycle + 1)
}
