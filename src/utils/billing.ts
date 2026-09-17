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

/** Apply cycle payments to items oldest-first (FIFO). Used for full/equal/custom payments. */
export function allocateCycleItems(items: CartItem[], paidOnCycle: number): Map<string, ItemSettlement> {
  const map = initItemSettlements(items)
  applyFifoPool(map, items, paidOnCycle)
  return map
}

function initItemSettlements(items: CartItem[]): Map<string, ItemSettlement> {
  const map = new Map<string, ItemSettlement>()
  for (const item of items) {
    const total = lineTotal(item)
    map.set(item.cartId, {
      cartId: item.cartId,
      lineTotal: total,
      allocatedPaid: 0,
      remainingDue: total,
      quantity: item.quantity,
      unitPrice: item.totalPrice,
      remainingUnits: item.quantity,
      paidUnits: 0,
    })
  }
  return map
}

function syncSettlementUnits(line: ItemSettlement): void {
  line.remainingUnits =
    line.remainingDue <= 0
      ? 0
      : Math.min(line.quantity, Math.floor(line.remainingDue / line.unitPrice))
  line.paidUnits = line.quantity - line.remainingUnits
}

function applyAllocation(map: Map<string, ItemSettlement>, cartId: string, amount: number): void {
  const line = map.get(cartId)
  if (!line || amount <= 0) return
  const allocated = Math.min(amount, line.remainingDue)
  line.allocatedPaid += allocated
  line.remainingDue -= allocated
  syncSettlementUnits(line)
}

function applyExplicitUnitSelections(
  map: Map<string, ItemSettlement>,
  items: CartItem[],
  selections: ItemUnitSelection[]
): void {
  const itemMap = new Map(items.map((i) => [i.cartId, i]))
  for (const sel of selections) {
    if (sel.units <= 0) continue
    const line = map.get(sel.cartId)
    const item = itemMap.get(sel.cartId)
    if (!line || !item || line.remainingDue <= 0) continue
    const units = Math.min(sel.units, line.remainingUnits)
    if (units <= 0) continue
    applyAllocation(map, sel.cartId, Math.min(units * line.unitPrice, line.remainingDue))
  }
}

function applyFifoPool(map: Map<string, ItemSettlement>, items: CartItem[], pool: number): void {
  let remaining = Math.max(0, pool)
  const sorted = [...items].sort(sortItemsFifo)
  for (const item of sorted) {
    if (remaining <= 0) break
    const line = map.get(item.cartId)
    if (!line || line.remainingDue <= 0) continue
    const allocated = Math.min(remaining, line.remainingDue)
    applyAllocation(map, item.cartId, allocated)
    remaining -= allocated
  }
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
    const cyclePayments = payments.filter((p) => p.receiptCycle === cycle)
    const map = initItemSettlements(cycleItems)

    for (const payment of cyclePayments) {
      if (payment.itemSelections?.length) {
        applyExplicitUnitSelections(map, cycleItems, payment.itemSelections)
      }
    }

    const fifoPool = cyclePayments
      .filter((p) => !p.itemSelections?.length)
      .reduce((sum, p) => sum + p.amount, 0)
    applyFifoPool(map, cycleItems, fifoPool)

    map.forEach((v, k) => result.set(k, v))
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
