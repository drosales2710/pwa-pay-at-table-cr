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

export interface ItemSettlement {
  cartId: string
  lineTotal: number
  allocatedPaid: number
  remainingDue: number
  quantity: number
  unitPrice: number
  /** Whole units still owed on this line (no fractional items). */
  remainingUnits: number
  paidUnits: number
}

export interface ItemUnitSelection {
  cartId: string
  units: number
}

function lineTotal(item: CartItem): number {
  return item.totalPrice * item.quantity
}

function sortItemsFifo(a: CartItem, b: CartItem): number {
  const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0
  const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0
  if (ta !== tb) return ta - tb
  if (a.round !== b.round) return a.round - b.round
  return a.cartId.localeCompare(b.cartId)
}

/** Apply cycle payments to items oldest-first (FIFO). Hidden from guest UI. */
export function allocateCycleItems(items: CartItem[], paidOnCycle: number): Map<string, ItemSettlement> {
  const sorted = [...items].sort(sortItemsFifo)
  let pool = Math.max(0, paidOnCycle)
  const map = new Map<string, ItemSettlement>()

  for (const item of sorted) {
    const total = lineTotal(item)
    const allocated = Math.min(pool, total)
    pool -= allocated
    const remainingDue = total - allocated
    const unitPrice = item.totalPrice
    const quantity = item.quantity
    const remainingUnits =
      remainingDue <= 0 ? 0 : Math.min(quantity, Math.floor(remainingDue / unitPrice))
    map.set(item.cartId, {
      cartId: item.cartId,
      lineTotal: total,
      allocatedPaid: allocated,
      remainingDue,
      quantity,
      unitPrice,
      remainingUnits,
      paidUnits: quantity - remainingUnits,
    })
  }

  return map
}

export function buildItemSettlementMap(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): Map<string, ItemSettlement> {
  const all = [...sentOrders, ...cart]
  const result = new Map<string, ItemSettlement>()

  for (const cycle of getActiveReceiptCycles(sentOrders, cart)) {
    const cycleItems = all.filter((i) => i.receiptCycle === cycle)
    const paid = getPaidForCycle(payments, cycle)
    allocateCycleItems(cycleItems, paid).forEach((v, k) => result.set(k, v))
  }

  return result
}

export function sumRemainingDueForItems(
  settlement: Map<string, ItemSettlement>,
  cartIds: string[]
): number {
  return cartIds.reduce((s, id) => s + (settlement.get(id)?.remainingDue ?? 0), 0)
}

/** Pay amount for whole-unit selections (Pay my items). */
export function sumDueForUnitSelections(
  settlement: Map<string, ItemSettlement>,
  items: CartItem[],
  selections: ItemUnitSelection[]
): number {
  const itemMap = new Map(items.map((i) => [i.cartId, i]))
  return selections.reduce((sum, sel) => {
    if (sel.units <= 0) return sum
    const line = settlement.get(sel.cartId)
    const item = itemMap.get(sel.cartId)
    if (!line || !item || line.remainingDue <= 0) return sum
    const units = Math.min(sel.units, line.remainingUnits)
    if (units <= 0) return sum
    return sum + Math.min(units * line.unitPrice, line.remainingDue)
  }, 0)
}

export function countSelectedUnits(selections: ItemUnitSelection[]): number {
  return selections.reduce((s, sel) => s + (sel.units > 0 ? sel.units : 0), 0)
}

/** Total open balance across all receipt cycles (matches table remaining). */
export function getOpenTabRemaining(
  sentOrders: CartItem[],
  cart: CartItem[],
  payments: PaymentRecord[]
): number {
  return getActiveReceiptCycles(sentOrders, cart).reduce(
    (sum, cycle) => sum + getCycleRemaining(sentOrders, cart, payments, cycle),
    0
  )
}
