import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, ChefHat, CheckCircle2, Clock, Plus, Undo2 } from "lucide-react"
import PortalSwitcher from "./PortalSwitcher"
import type { CartItem, PaymentRecord } from "../types"
import type { KDSTicket } from "../data/mockData"
import { formatCRC, formatUSD } from "../utils/format"
import { groupByReceiptCycle, buildItemSettlementMap, type ItemSettlement } from "../utils/billing"
import {
  undoSecondsRemaining,
  canGuestUndoItem,
  type GuestCancelReason,
  type SentOrderBatch,
} from "../utils/order"
import { isItemKitchenStarted } from "../utils/kds"
import { getGuestOrderItemStatus, guestOrderStatusClass } from "../utils/guestOrderStatus"

interface OrderHistoryScreenProps {
  sentOrders: CartItem[]
  cart: CartItem[]
  payments: PaymentRecord[]
  openReceiptCycle: number
  onBack: () => void
  onRequestBill: () => void
  onOpenCart: () => void
  onCancelItem: (cartId: string) => { ok: true } | { ok: false; reason: GuestCancelReason }
  kdsTickets: KDSTicket[]
  tableId: string
}

export default function OrderHistoryScreen({
  sentOrders,
  cart,
  payments,
  openReceiptCycle,
  onBack,
  onRequestBill,
  onOpenCart,
  onCancelItem,
  kdsTickets,
  tableId,
}: OrderHistoryScreenProps) {
  const [now, setNow] = useState(Date.now())
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const cycleGroups = groupByReceiptCycle(sentOrders, cart, payments)
  const settlement = useMemo(
    () => buildItemSettlementMap(sentOrders, cart, payments),
    [sentOrders, cart, payments]
  )
  const sentTotal = sentOrders.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const grandTotal = sentTotal + cartTotal
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const openTotal = Math.max(0, grandTotal - paidTotal)

  const handleCancel = (cartId: string) => {
    const result = onCancelItem(cartId)
    if (result.ok) {
      setCancelMessage("Artículo cancelado / Item cancelled")
      setTimeout(() => setCancelMessage(null), 2500)
    } else if (result.reason === "kitchen_started") {
      setCancelMessage("La cocina ya comenzó — contacta a tu mesero / Kitchen started — ask your server")
      setTimeout(() => setCancelMessage(null), 3500)
    } else if (result.reason === "expired") {
      setCancelMessage("Tiempo de cancelación expirado / Undo window expired")
      setTimeout(() => setCancelMessage(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background screen-fade">
      <header className="safe-top bg-card border-b border-border px-4 py-4 flex-shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al menú"
            className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:opacity-70"
          >
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1
              className="text-foreground"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.15rem" }}
            >
              Mis pedidos <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>/ My Orders</span>
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Mesa #{tableId} · Cuenta abierta Ronda {openReceiptCycle}
            </p>
          </div>
          <PortalSwitcher />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-32 px-4">
        {cancelMessage && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-primary/10 text-primary-on-light text-center" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            {cancelMessage}
          </div>
        )}

        {sentOrders.length === 0 && cart.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
              <ChefHat size={40} className="text-muted-foreground opacity-50" />
            </div>
            <h3
              className="text-foreground mb-2"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
            >
              No hay pedidos aún
            </h3>
            <p
              className="text-muted-foreground mx-auto max-w-[240px]"
              style={{ fontSize: "0.85rem", lineHeight: "1.4" }}
            >
              Tus artículos aparecerán aquí una vez que los envíes a la cocina.
            </p>
          </div>
        )}

        {cycleGroups.map((group) => (
          <div key={group.receiptCycle} className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-muted-foreground uppercase tracking-wider"
                style={{ fontSize: "0.72rem", fontWeight: 700 }}
              >
                Cuenta · Ronda {group.receiptCycle}
                {group.remaining <= 0 && group.total > 0 && (
                  <span className="text-status-green normal-case ml-2" style={{ fontWeight: 600 }}>
                    · Pagada
                  </span>
                )}
              </p>
              <span className="text-muted-foreground" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                {formatCRC(group.remaining > 0 ? group.remaining : group.total)}
              </span>
            </div>

            {group.batches.length > 0 && (
              <div className="space-y-3 mb-3">
                <p className="text-muted-foreground" style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                  Enviado a cocina / Sent to Kitchen
                </p>
                {group.batches.map((batch) => (
                  <SentBatchCard
                    key={batch.orderId}
                    batch={batch}
                    now={now}
                    kdsTickets={kdsTickets}
                    settlement={settlement}
                    onCancelItem={handleCancel}
                  />
                ))}
              </div>
            )}

            {group.cartItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                    <Clock size={14} className="text-primary" />
                    <span className="text-primary" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                      Por enviar / Pending
                    </span>
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-primary/30 overflow-hidden">
                  {group.cartItems.map((item, idx) => (
                    <div
                      key={item.cartId}
                      className={`px-4 py-3.5 flex items-start justify-between gap-3 ${
                        idx < group.cartItems.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <span
                            className="bg-primary/10 text-primary-on-light rounded-md px-1.5 py-0.5 flex-shrink-0"
                            style={{ fontSize: "0.7rem", fontWeight: 700 }}
                          >
                            {item.quantity}×
                          </span>
                          <div>
                            <p className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                              {item.name}
                            </p>
                            {item.modifiers.length > 0 && (
                              <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>
                                {item.modifiers.join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-foreground flex-shrink-0"
                        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}
                      >
                        {formatCRC(item.totalPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {group.paidTotal > 0 && group.remaining > 0 && (
              <p className="text-muted-foreground mt-2 px-1" style={{ fontSize: "0.72rem" }}>
                Pagado {formatCRC(group.paidTotal)} de {formatCRC(group.total)} · Restante {formatCRC(group.remaining)}
              </p>
            )}
          </div>
        ))}

        {openTotal > 0 && (
          <div className="mt-5 bg-card rounded-2xl border border-border p-4">
            <div className="flex justify-between items-center">
              <span
                className="text-foreground"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}
              >
                Por pagar
              </span>
              <div className="text-right">
                <p
                  className="text-primary"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem" }}
                >
                  {formatCRC(openTotal)}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  {formatUSD(openTotal)}
                </p>
              </div>
            </div>
            {paidTotal > 0 && (
              <p className="text-muted-foreground mt-2" style={{ fontSize: "0.72rem" }}>
                Total consumo {formatCRC(grandTotal)} · Ya pagado {formatCRC(paidTotal)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 safe-bottom z-40 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2.5">
          {cart.length > 0 && (
            <button
              onClick={onOpenCart}
              className="w-full bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] transition-transform"
              style={{ minHeight: "54px", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
            >
              <Plus size={18} />
              <span>Ver carrito ({cart.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
            </button>
          )}
          {openTotal > 0 && (
            <button
              onClick={onRequestBill}
              className="w-full bg-card border border-border text-foreground rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
              style={{ minHeight: "48px", fontWeight: 700, fontSize: "0.88rem" }}
            >
              Pedir la cuenta <span style={{ opacity: 0.7, fontWeight: 400, fontSize: "0.78rem" }}>/ Request Bill</span> · {formatCRC(openTotal)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SentBatchCard({
  batch,
  now,
  kdsTickets,
  settlement,
  onCancelItem,
}: {
  batch: SentOrderBatch
  now: number
  kdsTickets: KDSTicket[]
  settlement: Map<string, ItemSettlement>
  onCancelItem: (cartId: string) => void
}) {
  const secondsLeft = undoSecondsRemaining(batch.sentAt, now)
  const undoableItems = batch.items.filter((item) =>
    canGuestUndoItem(item.sentAt, isItemKitchenStarted(kdsTickets, item.cartId), now)
  )
  const anyUndoable = undoableItems.length > 0
  const batchTotal = batch.items.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const sentTime = new Date(batch.sentAt).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {anyUndoable && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
          <Clock size={14} className="text-amber-600" />
          <span className="text-amber-800" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            {secondsLeft}s para cancelar artículos · {secondsLeft}s to undo items
          </span>
        </div>
      )}

      {batch.items.map((item, idx) => {
        const started = isItemKitchenStarted(kdsTickets, item.cartId)
        const itemUndoable = canGuestUndoItem(item.sentAt, started, now)
        const line = settlement.get(item.cartId)
        const remainingDue = line?.remainingDue ?? item.totalPrice * item.quantity
        const lineTotal = line?.lineTotal ?? item.totalPrice * item.quantity
        const isPaid = remainingDue <= 0
        const status = getGuestOrderItemStatus(item, kdsTickets, remainingDue, now)
        const statusClass = guestOrderStatusClass(status.tone)

        return (
          <div
            key={item.cartId}
            className={`px-4 py-3.5 flex items-start justify-between gap-3 ${
              idx < batch.items.length - 1 ? "border-b border-border" : ""
            } ${isPaid ? "opacity-60" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span
                  className="bg-muted text-foreground rounded-md px-1.5 py-0.5 flex-shrink-0"
                  style={{ fontSize: "0.7rem", fontWeight: 700 }}
                >
                  {item.quantity}×
                </span>
                <div className="min-w-0">
                  <p className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {item.name}
                  </p>
                  {item.modifiers.length > 0 && (
                    <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>
                      {item.modifiers.join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 size={10} className={statusClass} />
                    <span className={statusClass} style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                      {status.label}{" "}
                      <span style={{ opacity: 0.75, fontWeight: 500 }}>/ {status.labelEn}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {remainingDue < lineTotal ? (
                <>
                  <span
                    className="text-muted-foreground line-through"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.78rem" }}
                  >
                    {formatCRC(lineTotal)}
                  </span>
                  <span
                    className="text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}
                  >
                    {formatCRC(remainingDue)}
                  </span>
                </>
              ) : (
                <span
                  className="text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}
                >
                  {formatCRC(lineTotal)}
                </span>
              )}
              {itemUndoable && !isPaid && (
                <button
                  type="button"
                  onClick={() => onCancelItem(item.cartId)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 active:scale-95 transition-transform"
                  style={{ fontSize: "0.65rem", fontWeight: 700 }}
                >
                  <Undo2 size={12} />
                  Deshacer
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="px-4 py-2 bg-muted/40 border-t border-border flex justify-between items-center">
        <span className="text-muted-foreground" style={{ fontSize: "0.68rem", fontWeight: 600 }}>
          Envío #{batch.round} · {sentTime}
        </span>
        <span className="text-foreground" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
          {formatCRC(batchTotal)}
        </span>
      </div>
    </div>
  )
}
