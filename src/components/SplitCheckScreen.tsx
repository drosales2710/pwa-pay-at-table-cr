import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, Users, UserCheck, CreditCard, Minus, Plus } from "lucide-react"
import type { CartItem, SplitMethod } from "../types"
import { formatCRC, formatUSD } from "../utils/format"
import { useGuest } from "../context/GuestContext"
import { sumItems, getGuestEqualShare } from "../utils/split"
import { groupByReceiptCycle, buildItemSettlementMap, sumDueForUnitSelections, countSelectedUnits, type ItemUnitSelection } from "../utils/billing"
import {
  DEV_SIMULATED_GUEST_COUNT,
  getEffectiveGuestCount,
  isDevSimulateMultiGuest,
  setDevSimulateMultiGuest,
} from "../utils/devFlags"

/** Custom split hidden until partial-pay rules are finalized with stakeholders. */
const GUEST_CUSTOM_SPLIT_ENABLED = false

interface SplitCheckScreenProps {
  allItems: CartItem[]
  onBack: () => void
  onContinue: (
    method: SplitMethod,
    amount: number,
    partySize: number,
    unitSelections?: ItemUnitSelection[]
  ) => void
}

export default function SplitCheckScreen({
  allItems,
  onBack,
  onContinue,
}: SplitCheckScreenProps) {
  const { guestIndex, guests, tableBalance, payments, sentOrders, cart } = useGuest()

  const settlement = useMemo(
    () => buildItemSettlementMap(sentOrders, cart, payments),
    [sentOrders, cart, payments]
  )

  const cycleGroups = useMemo(() => {
    const sent = allItems.filter((i) => i.status === "sent")
    const pending = allItems.filter((i) => i.status === "cart")
    return groupByReceiptCycle(sent, pending, payments).filter((g) => g.remaining > 0)
  }, [allItems, payments])

  const scannedGuestCount = guests.length
  const billTotal = sumItems(allItems)
  const amountDue = tableBalance.remaining

  const [method, setMethod] = useState<SplitMethod>("full")
  const [partySize, setPartySize] = useState(() =>
    Math.min(
      Math.max(getEffectiveGuestCount(scannedGuestCount) || 2, 2),
      Math.max(getEffectiveGuestCount(scannedGuestCount), 2)
    )
  )
  const [unitSelections, setUnitSelections] = useState<Record<string, number>>({})
  const [simulateMultiGuest, setSimulateMultiGuest] = useState(() => isDevSimulateMultiGuest())

  const effectiveGuestCount = getEffectiveGuestCount(scannedGuestCount)
  const canUseMultiGuestPayment = import.meta.env.DEV
    ? simulateMultiGuest
    : scannedGuestCount >= 2
  const minPartySize = 2
  const maxPartySize = effectiveGuestCount
  const multiGuestRequiredHint = import.meta.env.DEV
    ? "Activa el simulador de demo arriba / Enable demo simulator above"
    : "Requiere 2+ comensales con QR escaneado / Needs 2+ guests at table"

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
      setUnitSelections({})
    }
  }

  const selectionsList = useMemo(
    (): ItemUnitSelection[] =>
      Object.entries(unitSelections)
        .filter(([, units]) => units > 0)
        .map(([cartId, units]) => ({ cartId, units })),
    [unitSelections]
  )

  const equalShare = Math.min(getGuestEqualShare(amountDue, partySize, guestIndex), amountDue)

  const getPayAmount = (): number => {
    if (method === "full") return amountDue
    if (method === "equal") return equalShare
    if (method === "myItems") {
      return Math.min(sumDueForUnitSelections(settlement, allItems, selectionsList), amountDue)
    }
    return amountDue
  }

  const payAmount = getPayAmount()
  const remainingAfterPay = Math.max(0, amountDue - payAmount)

  const getLineSettlement = (item: CartItem) => settlement.get(item.cartId)

  const setItemUnits = (cartId: string, units: number) => {
    setUnitSelections((prev) => {
      const next = { ...prev }
      if (units <= 0) delete next[cartId]
      else next[cartId] = units
      return next
    })
  }

  const toggleSingleUnit = (item: CartItem) => {
    const line = getLineSettlement(item)
    if (!line || line.remainingUnits <= 0) return
    const current = unitSelections[item.cartId] ?? 0
    setItemUnits(item.cartId, current > 0 ? 0 : 1)
  }

  const adjustUnits = (item: CartItem, delta: number) => {
    const line = getLineSettlement(item)
    if (!line) return
    const max = line.remainingUnits
    const current = unitSelections[item.cartId] ?? 0
    setItemUnits(item.cartId, Math.min(max, Math.max(0, current + delta)))
  }

  const selectedUnitCount = countSelectedUnits(selectionsList)

  const canContinue =
    payAmount > 0 &&
    payAmount <= amountDue &&
    (method === "full" ||
      (canUseMultiGuestPayment &&
        ((method === "equal" && partySize >= minPartySize) ||
          (method === "myItems" && selectedUnitCount > 0))))

  return (
    <div className="flex flex-col h-full bg-background screen-fade">
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
              Dividir la cuenta{" "}
              <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>
                / Split Bill
              </span>
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Saldo pendiente {formatCRC(amountDue)}
              {tableBalance.paidTotal > 0 && (
                <span>
                  {" "}
                  · {tableBalance.paidGuestCount} pagaron
                </span>
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
            Solo puedes pagar hasta el saldo pendiente ({formatCRC(amountDue)}). No se permiten pagos
            mayores ni reembolsos.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-36 px-4">
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
                    <div
                      className={`px-4 py-2 bg-muted/50 border-b border-border ${groupIdx > 0 ? "border-t" : ""}`}
                    >
                      <p className="text-muted-foreground" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                        Envío · Ronda {group.receiptCycle}
                      </p>
                    </div>
                  )}
                  {cycleItems.map((item, idx) => {
                    const line = getLineSettlement(item)
                    const remaining = line?.remainingDue ?? item.totalPrice * item.quantity
                    const lineTotal = line?.lineTotal ?? item.totalPrice * item.quantity
                    const remainingUnits = line?.remainingUnits ?? item.quantity
                    const isPaid = remaining <= 0
                    const isMyItems = method === "myItems" && !isPaid
                    const selectedUnits = unitSelections[item.cartId] ?? 0
                    const showStepper = isMyItems && item.quantity > 1 && remainingUnits > 0
                    const showCheckbox = isMyItems && !showStepper

                    return (
                      <div
                        key={item.cartId}
                        className={`px-4 py-3.5 flex items-center justify-between gap-3 ${
                          idx < cycleItems.length - 1 ? "border-b border-border" : ""
                        } ${showCheckbox ? "cursor-pointer active:bg-muted transition-colors" : ""} ${
                          isPaid ? "opacity-50" : ""
                        }`}
                        onClick={() => showCheckbox && toggleSingleUnit(item)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {showCheckbox && (
                            <button
                              type="button"
                              disabled={isPaid}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSingleUnit(item)
                              }}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                selectedUnits > 0
                                  ? "border-primary bg-primary"
                                  : "border-border bg-background"
                              }`}
                            >
                              {selectedUnits > 0 && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2 6l3 3 5-5"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-foreground"
                              style={{ fontSize: "0.88rem", fontWeight: 600 }}
                            >
                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                              {item.name}
                            </p>
                            {item.modifiers.length > 0 && (
                              <p className="text-muted-foreground truncate" style={{ fontSize: "0.72rem" }}>
                                {item.modifiers.join(" · ")}
                              </p>
                            )}
                            {isPaid && (
                              <p className="text-status-green mt-0.5" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                                Pagado
                              </p>
                            )}
                            {showStepper && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => adjustUnits(item, -1)}
                                  disabled={selectedUnits <= 0}
                                  className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg active:scale-95 transition-transform disabled:opacity-40"
                                >
                                  <Minus size={14} className="text-foreground" />
                                </button>
                                <span
                                  className="text-foreground min-w-[4.5rem] text-center"
                                  style={{ fontSize: "0.78rem", fontWeight: 600 }}
                                >
                                  {selectedUnits} de {remainingUnits}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustUnits(item, 1)}
                                  disabled={selectedUnits >= remainingUnits}
                                  className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg active:scale-95 transition-transform disabled:opacity-40"
                                >
                                  <Plus size={14} className="text-foreground" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {selectedUnits > 0 && line && (
                            <span
                              className="text-primary block mb-0.5"
                              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}
                            >
                              {formatCRC(Math.min(selectedUnits * line.unitPrice, line.remainingDue))}
                            </span>
                          )}
                          {remaining < lineTotal ? (
                            <>
                              <span
                                className="text-muted-foreground line-through block"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {formatCRC(lineTotal)}
                              </span>
                              <span
                                className="text-foreground"
                                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}
                              >
                                {formatCRC(remaining)}
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div className="px-4 py-3 bg-muted border-t border-border">
              <div className="flex justify-between mb-1">
                <span
                  className="text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  Consumo abierto
                </span>
                <span
                  className="text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}
                >
                  {formatCRC(billTotal)}
                </span>
              </div>
              {tableBalance.paidTotal > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>
                    Ya pagado
                  </span>
                  <span className="text-muted-foreground" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    − {formatCRC(tableBalance.paidTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/60">
                <span
                  className="text-primary"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  Saldo pendiente
                </span>
                <div className="text-right">
                  <span
                    className="text-primary block"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}
                  >
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
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <SplitOption
              selected={method === "full"}
              onClick={() => selectMethod("full")}
              icon={<CreditCard size={20} />}
              title="Pago Completo"
              titleEn="Full Payment"
              description={`Paga el saldo pendiente (${formatCRC(amountDue)})`}
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
                  ? `Divide ${formatCRC(amountDue)} entre ${partySize} personas`
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
                  ? "Elige cuántos consumiste — solo se cobra lo pendiente"
                  : multiGuestRequiredHint
              }
            />
            {GUEST_CUSTOM_SPLIT_ENABLED && (
              <SplitOption
                selected={method === "custom"}
                onClick={() => canUseMultiGuestPayment && selectMethod("custom")}
                disabled={!canUseMultiGuestPayment}
                icon={<CreditCard size={20} />}
                title="Monto personalizado"
                titleEn="Custom Amount"
                description="Ingresa el monto exacto que deseas pagar"
              />
            )}
          </div>
        </div>

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
                <p
                  className="text-primary"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem" }}
                >
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
              {selectedUnitCount === 0
                ? "Elige cuántos consumiste arriba"
                : `${selectedUnitCount} unidad${selectedUnitCount === 1 ? "" : "es"}`}
            </p>
            <div className="text-right">
              <p
                className="text-primary"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem" }}
              >
                {formatCRC(payAmount)}
              </p>
              {payAmount > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                  Restante mesa: {formatCRC(remainingAfterPay)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 safe-bottom z-40 pointer-events-none">
        <button
          onClick={() =>
            onContinue(
              method,
              payAmount,
              partySize,
              method === "myItems" ? selectionsList : undefined
            )
          }
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
          <p
            className="text-foreground"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.92rem" }}
          >
            {title}
          </p>
          {titleEn && (
            <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>
              / {titleEn}
            </span>
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
