import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, Users, UserCheck, DollarSign, Minus, Plus, CreditCard } from "lucide-react"
import type { CartItem, SplitMethod } from "../types"
import { formatCRC, formatUSD } from "../utils/format"
import { useGuest } from "../context/GuestContext"
import { sumItems, getGuestEqualShare } from "../utils/split"
import { groupByReceiptCycle } from "../utils/billing"
import {
  DEV_SIMULATED_GUEST_COUNT,
  getEffectiveGuestCount,
  isDevSimulateMultiGuest,
  setDevSimulateMultiGuest,
} from "../utils/devFlags"

interface SplitCheckScreenProps {
  allItems: CartItem[]
  onBack: () => void
  onContinue: (method: SplitMethod, amount: number, partySize: number) => void
}

export default function SplitCheckScreen({
  allItems,
  onBack,
  onContinue,
}: SplitCheckScreenProps) {
  const { guestIndex, guests, tableBalance, splitSnapshot, payments } = useGuest()

  const cycleGroups = useMemo(() => {
    const sent = allItems.filter((i) => i.status === "sent")
    const pending = allItems.filter((i) => i.status === "cart")
    return groupByReceiptCycle(sent, pending, payments).filter((g) => g.remaining > 0)
  }, [allItems, payments])

  const scannedGuestCount = guests.length

  const billTotal = sumItems(allItems)
  const amountDue = tableBalance.remaining

  const splitBase = splitSnapshot
    ? Math.max(0, splitSnapshot.lockedSubtotal - tableBalance.paidTotal)
    : amountDue

  const effectiveGuestCount = getEffectiveGuestCount(scannedGuestCount)
  const canUseMultiGuestPayment = effectiveGuestCount >= 2
  const minPartySize = 2
  const maxPartySize = effectiveGuestCount
  const multiGuestRequiredHint =
    "Requiere 2+ comensales con QR escaneado / Needs 2+ guests at table"

  const [method, setMethod] = useState<SplitMethod>("full")
  const [partySize, setPartySize] = useState(() =>
    Math.min(
      Math.max(getEffectiveGuestCount(scannedGuestCount) || 2, 2),
      Math.max(getEffectiveGuestCount(scannedGuestCount), 2)
    )
  )
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [customAmount, setCustomAmount] = useState("")
  const [simulateMultiGuest, setSimulateMultiGuest] = useState(() => isDevSimulateMultiGuest())

  useEffect(() => {
    if (!canUseMultiGuestPayment && method !== "full") {
      setMethod("full")
    }
  }, [canUseMultiGuestPayment, method])

  useEffect(() => {
    setPartySize((p) =>
      Math.min(Math.max(p, minPartySize), Math.max(maxPartySize, minPartySize))
    )
  }, [maxPartySize])

  const handleSimulateToggle = (enabled: boolean) => {
    setSimulateMultiGuest(enabled)
    setDevSimulateMultiGuest(enabled)
    if (!enabled && method !== "full") {
      setMethod("full")
    }
  }

  const selectMethod = (next: SplitMethod) => {
    setMethod(next)
    if (next === "myItems") {
      setSelectedItems([])
    }
  }

  const equalShare = getGuestEqualShare(splitBase, partySize, guestIndex)

  const getPayAmount = (): number => {
    if (method === "full") return amountDue
    if (method === "equal") return equalShare
    if (method === "myItems") {
      return allItems
        .filter((i) => selectedItems.includes(i.cartId))
        .reduce((s, i) => s + i.totalPrice * i.quantity, 0)
    }
    if (method === "custom") {
      const v = parseInt(customAmount.replace(/\D/g, ""), 10)
      return isNaN(v) ? 0 : Math.min(v, amountDue)
    }
    return amountDue
  }

  const payAmount = getPayAmount()
  const remainingAfterPay = Math.max(0, amountDue - payAmount)

  const toggleItem = (cartId: string) => {
    setSelectedItems((p) =>
      p.includes(cartId) ? p.filter((id) => id !== cartId) : [...p, cartId]
    )
  }

  const canContinue =
    payAmount > 0 &&
    payAmount <= amountDue &&
    (method === "full" ||
      (canUseMultiGuestPayment &&
        ((method === "equal" && partySize >= minPartySize) ||
          (method === "myItems" && selectedItems.length > 0) ||
          (method === "custom" && payAmount > 0))))

  return (
    <div className="flex flex-col h-full bg-background screen-fade">
      {/* Header */}
      <header className="safe-top bg-card border-b border-border px-4 py-4 flex-shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al menú"
            className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:opacity-70 relative z-10"
          >
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1
              className="text-foreground"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.15rem" }}
            >
              Dividir la cuenta <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>/ Split Bill</span>
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              {tableBalance.paidTotal > 0 ? (
                <>
                  Restante {formatCRC(amountDue)} de {formatCRC(billTotal)}
                  <span> · {tableBalance.paidGuestCount} pagaron</span>
                </>
              ) : (
                <>Total {formatCRC(billTotal)}</>
              )}
            </p>
          </div>
        </div>
      </header>

      {tableBalance.paidTotal > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-foreground" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            Pagado {formatCRC(tableBalance.paidTotal)} de {formatCRC(tableBalance.billTotal)}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
            Restante: {formatCRC(tableBalance.remaining)} · {tableBalance.paidGuestCount} of {tableBalance.activeGuestCount} guests paid
          </p>
        </div>
      )}

      {splitSnapshot && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <p className="text-foreground" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            División bloqueada en {formatCRC(splitSnapshot.lockedSubtotal)} — nuevos pedidos se cobran aparte
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-36 px-4">
        {/* Itemized bill */}
        <div className="mt-5">
          <p className="text-muted-foreground mb-2" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            DETALLE DE CONSUMO
          </p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {cycleGroups.map((group, groupIdx) => {
              const cycleItems = [
                ...group.batches.flatMap((batch) => batch.items),
                ...group.cartItems,
              ]
              return (
              <div key={group.receiptCycle}>
                {cycleGroups.length > 1 && (
                  <div className={`px-4 py-2 bg-muted/50 border-b border-border ${groupIdx > 0 ? "border-t" : ""}`}>
                    <p className="text-muted-foreground" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                      Cuenta · Ronda {group.receiptCycle}
                    </p>
                  </div>
                )}
                {cycleItems.map((item, idx) => (
              <div
                key={item.cartId}
                className={`px-4 py-3.5 flex items-center justify-between gap-3 ${
                  idx < cycleItems.length - 1 ? "border-b border-border" : ""
                } ${method === "myItems" ? "cursor-pointer active:bg-muted transition-colors" : ""}`}
                onClick={() => method === "myItems" && toggleItem(item.cartId)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {method === "myItems" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleItem(item.cartId)
                      }}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedItems.includes(item.cartId)
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {selectedItems.includes(item.cartId) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                      {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                    </p>
                    {item.modifiers.length > 0 && (
                      <p className="text-muted-foreground truncate" style={{ fontSize: "0.72rem" }}>
                        {item.modifiers.join(" · ")}
                      </p>
                    )}
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
              )
            })}
            <div className="px-4 py-3 bg-muted border-t border-border">
              <div className="flex justify-between mb-1">
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                  Total cuenta
                </span>
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}>
                  {formatCRC(billTotal)}
                </span>
              </div>
              {tableBalance.paidTotal > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>Ya pagado</span>
                  <span className="text-muted-foreground" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    − {formatCRC(tableBalance.paidTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/60">
                <span className="text-primary" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                  Por pagar
                </span>
                <div className="text-right">
                  <span className="text-primary block" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}>
                    {formatCRC(amountDue)}
                  </span>
                  <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                    {formatUSD(amountDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Split method selector */}
        <div className="mt-6">
          <p className="text-muted-foreground mb-3" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            MÉTODO DE PAGO
          </p>

          {import.meta.env.DEV && (
            <div className="mb-3 bg-violet-50 border border-violet-200 border-dashed rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-violet-900" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    Demo: simular {DEV_SIMULATED_GUEST_COUNT} comensales
                  </p>
                  <p className="text-violet-700/80" style={{ fontSize: "0.68rem" }}>
                    UI testing only · remove before production
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={simulateMultiGuest}
                  onClick={() => handleSimulateToggle(!simulateMultiGuest)}
                  className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                    simulateMultiGuest ? "bg-violet-600" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      simulateMultiGuest ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
              {simulateMultiGuest && (
                <p className="text-violet-800 mt-2" style={{ fontSize: "0.68rem", fontWeight: 600 }}>
                  Opciones de división habilitadas para demo ({effectiveGuestCount} comensales simulados)
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <SplitOption
              selected={method === "full"}
              onClick={() => selectMethod("full")}
              icon={<CreditCard size={20} />}
              title="Pago Completo"
              titleEn="Full Payment"
              description={
                tableBalance.paidTotal > 0
                  ? `Paga el saldo restante (${formatCRC(amountDue)})`
                  : "Paga el total de la cuenta en una sola transacción"
              }
            />
            <SplitOption
              selected={method === "equal"}
              onClick={() => canUseMultiGuestPayment && selectMethod("equal")}
              disabled={!canUseMultiGuestPayment}
              icon={<Users size={20} />}
              title="Dividir en partes iguales"
              titleEn="Split Equally"
              description={
                canUseMultiGuestPayment
                  ? `${effectiveGuestCount} comensales en la mesa · elige entre 2 y ${maxPartySize}`
                  : multiGuestRequiredHint
              }
            />
            <SplitOption
              selected={method === "myItems"}
              onClick={() => canUseMultiGuestPayment && selectMethod("myItems")}
              disabled={!canUseMultiGuestPayment}
              icon={<UserCheck size={20} />}
              title="Pagar mis artículos"
              titleEn="Pay My Items"
              description={
                canUseMultiGuestPayment
                  ? "Selecciona los artículos que deseas pagar"
                  : multiGuestRequiredHint
              }
            />
            <SplitOption
              selected={method === "custom"}
              onClick={() => canUseMultiGuestPayment && selectMethod("custom")}
              disabled={!canUseMultiGuestPayment}
              icon={<DollarSign size={20} />}
              title="Monto personalizado"
              titleEn="Custom Amount"
              description={
                canUseMultiGuestPayment
                  ? "Ingresa el monto exacto que deseas pagar"
                  : multiGuestRequiredHint
              }
            />
          </div>
        </div>

        {/* Method-specific controls */}
        {method === "equal" && canUseMultiGuestPayment && (
          <div className="mt-4 bg-card rounded-2xl border border-border p-4">
            <p className="text-foreground mb-3" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              ¿Entre cuántas personas?{" "}
              <span className="text-muted-foreground font-normal">
                ({effectiveGuestCount} en la mesa · min 2, máx {maxPartySize})
              </span>
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 bg-muted rounded-xl px-2 py-1">
                <button
                  onClick={() => setPartySize((p) => Math.max(minPartySize, p - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-card rounded-lg shadow-sm active:scale-95 transition-transform"
                  disabled={partySize <= minPartySize}
                >
                  <Minus size={16} className={partySize <= minPartySize ? "text-border" : "text-foreground"} />
                </button>
                <span
                  className="text-foreground w-8 text-center"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem" }}
                >
                  {partySize}
                </span>
                <button
                  onClick={() => setPartySize((p) => Math.min(maxPartySize, p + 1))}
                  className="w-9 h-9 flex items-center justify-center bg-card rounded-lg shadow-sm active:scale-95 transition-transform"
                  disabled={partySize >= maxPartySize}
                >
                  <Plus size={16} className={partySize >= maxPartySize ? "text-border" : "text-foreground"} />
                </button>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                  Tu parte exacta
                </p>
                <p className="text-primary" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem" }}>
                  {formatCRC(equalShare)}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                  {formatUSD(equalShare)}
                </p>
                {remainingAfterPay > 0 && payAmount > 0 && (
                  <p className="text-muted-foreground mt-1" style={{ fontSize: "0.65rem" }}>
                    Restante mesa: {formatCRC(remainingAfterPay)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {method === "myItems" && canUseMultiGuestPayment && (
          <div className="mt-4 bg-primary/5 rounded-2xl border border-primary/20 p-4 flex justify-between items-center">
            <p className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              {selectedItems.length === 0 ? "Selecciona artículos arriba" : `${selectedItems.length} artículo(s)`}
            </p>
            <div className="text-right">
              <p className="text-primary" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
                {formatCRC(payAmount)}
              </p>
              {payAmount > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                  Restante: {formatCRC(remainingAfterPay)}
                </p>
              )}
            </div>
          </div>
        )}

        {method === "custom" && canUseMultiGuestPayment && (
          <div className="mt-4 bg-card rounded-2xl border border-border p-4">
            <p className="text-foreground mb-3" style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Monto a pagar (₡) · máx {formatCRC(amountDue)}
            </p>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
              >
                ₡
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0"
                max={amountDue}
                className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
              />
            </div>
            {payAmount > 0 && (
              <p className="text-muted-foreground mt-2" style={{ fontSize: "0.75rem" }}>
                ≈ {formatUSD(payAmount)} · Restante en mesa: {formatCRC(remainingAfterPay)}
              </p>
            )}
          </div>
        )}

        {method === "full" && tableBalance.paidTotal > 0 && (
          <div className="mt-4 bg-muted/50 rounded-xl px-4 py-3">
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Pagarás el saldo restante de {formatCRC(amountDue)}
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 safe-bottom z-40 pointer-events-none">
        <button
          onClick={() => onContinue(method, payAmount, partySize)}
          disabled={!canContinue}
          className={`pointer-events-auto w-full rounded-2xl flex items-center justify-between px-5 shadow-lg transition-all active:scale-[0.98] ${
            canContinue ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
          style={{ minHeight: "58px", fontFamily: "Outfit, sans-serif" }}
        >
          <div className="flex flex-col items-start leading-tight">
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>Continuar al pago</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.82 }}>Continue to Payment</span>
          </div>
          <div className="text-right">
            <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>
              {payAmount > 0 ? formatCRC(payAmount) : "—"}
            </span>
            {payAmount > 0 && (
              <p style={{ fontSize: "0.7rem", opacity: 0.85 }}>{formatUSD(payAmount)}</p>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

interface SplitOptionProps {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  title: string
  titleEn?: string
  description: string
}

function SplitOption({ selected, onClick, disabled, icon, title, titleEn, description }: SplitOptionProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all ${
        disabled
          ? "border-border bg-muted/40 opacity-50 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/5 active:scale-[0.98]"
            : "border-border bg-card active:scale-[0.98]"
      }`}
      style={{ minHeight: "72px" }}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          selected && !disabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.92rem" }}>
            {title}
          </p>
          {titleEn && (
            <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>/ {titleEn}</span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
          {description}
        </p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          selected && !disabled ? "border-primary" : "border-border"
        }`}
      >
        {selected && !disabled && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </button>
  )
}
