import type { CartItem } from "../types"
import type { KDSTicket } from "../data/mockData"
import { findKdsTicketForCartItem, isItemKitchenStarted } from "./kds"
import { canGuestUndoItem } from "./order"

export type GuestOrderItemTone = "paid" | "delivered" | "ready" | "preparing" | "pending" | "sent"

export interface GuestOrderItemStatus {
  label: string
  labelEn: string
  tone: GuestOrderItemTone
}

const TONE_CLASSES: Record<GuestOrderItemTone, string> = {
  paid: "text-status-green",
  delivered: "text-status-green",
  ready: "text-status-green",
  preparing: "text-blue-600",
  pending: "text-status-yellow",
  sent: "text-primary",
}

export function guestOrderStatusClass(tone: GuestOrderItemTone): string {
  return TONE_CLASSES[tone]
}

/** Guest-facing kitchen + payment status for a sent line. */
export function getGuestOrderItemStatus(
  item: CartItem,
  kdsTickets: KDSTicket[],
  remainingDue: number,
  now: number
): GuestOrderItemStatus {
  if (remainingDue <= 0) {
    return { label: "Pagado", labelEn: "Paid", tone: "paid" }
  }

  const ticket = findKdsTicketForCartItem(kdsTickets, item.cartId)
  const started = isItemKitchenStarted(kdsTickets, item.cartId)
  const undoable = canGuestUndoItem(item.sentAt, started, now)

  if (ticket?.status === "delivered") {
    return { label: "Entregado", labelEn: "Delivered", tone: "delivered" }
  }
  if (ticket?.status === "ready") {
    return { label: "Listo", labelEn: "Ready", tone: "ready" }
  }
  if (ticket?.status === "preparing") {
    return { label: "Preparando", labelEn: "Preparing", tone: "preparing" }
  }
  if (ticket?.status === "pending") {
    if (undoable) {
      return { label: "Enviado", labelEn: "Sent", tone: "sent" }
    }
    return { label: "Pendiente", labelEn: "Pending", tone: "pending" }
  }

  return { label: "Confirmado", labelEn: "Confirmed", tone: "sent" }
}
