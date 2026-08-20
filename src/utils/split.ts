import type { CartItem, SplitMethod } from "../types"

/** Sum line totals for all cart items */
export function sumItems(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
}

/**
 * Exact equal shares: first (n-1) guests pay floor(total/n),
 * remainder colones assigned to the last share (tip pool in production).
 */
export function calculateEqualShares(grandTotal: number, guestCount: number): number[] {
  if (guestCount < 1) return [grandTotal]
  const base = Math.floor(grandTotal / guestCount)
  const remainder = grandTotal - base * guestCount
  const shares = Array.from({ length: guestCount }, () => base)
  if (remainder > 0 && shares.length > 0) {
    shares[shares.length - 1] += remainder
  }
  return shares
}

/** This guest's equal-share amount based on join order index */
export function getGuestEqualShare(
  grandTotal: number,
  guestCount: number,
  guestIndex: number
): number {
  const shares = calculateEqualShares(grandTotal, guestCount)
  return shares[Math.min(guestIndex, shares.length - 1)] ?? shares[0]
}

export function sumGuestItems(items: CartItem[], guestId: string): number {
  return sumItems(items.filter((i) => i.orderedBy === guestId))
}

export interface SplitSnapshot {
  id: string
  method: SplitMethod
  lockedAt: string
  /** Bill subtotal frozen at split start (excludes post-split items) */
  lockedSubtotal: number
  guestCount: number
  /** Per-guest equal shares at lock time */
  equalShares: number[]
}

export function createSplitSnapshot(
  method: SplitMethod,
  lockedSubtotal: number,
  guestCount: number
): SplitSnapshot {
  return {
    id: `split-${Date.now()}`,
    method,
    lockedAt: new Date().toISOString(),
    lockedSubtotal,
    guestCount,
    equalShares: method === "equal" ? calculateEqualShares(lockedSubtotal, guestCount) : [],
  }
}
