import { useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Plus,
  ChefHat,
  CreditCard,
  TriangleAlert,
  Trash2,
  Lock,
  Ban,
  Minus,
} from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import StaffMenuPicker from "../../components/StaffMenuPicker"
import ModifierModal from "../../components/ModifierModal"
import { elapsedMins, type GuardianOrder, type KDSTicket } from "../../data/mockData"
import { formatCRC } from "../../utils/format"
import { findKdsTicketForCartItem } from "../../utils/kds"
import { isReceiptCyclePaid, staffGuestId } from "../../utils/billEdit"
import { useGuest } from "../../context/GuestContext"
import type { CartItem, MenuItem, Restaurant, TableGuest, PaymentRecord } from "../../types"

export default function TableDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    restaurant,
    allTables,
    guardianQueue,
    approveGuardianOrder,
    rejectGuardianOrder,
    getTableSession,
    kdsTickets,
    staffSendToKitchen,
    staffVoidItem,
    staffRemoveCartItem,
    staffPresentBill,
    staffClearTable,
    menuItems,
  } = useGuest()

  const table = allTables.find((t) => t.id === id) || allTables[0]
  const tableId = table.number.toString()
  const session = getTableSession(tableId)
  const queue = guardianQueue.filter((q) => q.tableId === tableId)

  const [activeTab, setActiveTab] = useState<"guardian" | "orders" | "manual">("guardian")
  const pendingCount = queue.filter((q) => q.status === "pending").length
  const [banner, setBanner] = useState<string | null>(null)

  const showBanner = (msg: string) => {
    setBanner(msg)
    window.setTimeout(() => setBanner(null), 2800)
  }

  const billState = useMemo(() => {
    const paidTotal = session?.payments.reduce((s, p) => s + p.amount, 0) ?? 0
    const billTotal = table.billTotal
    const remaining = Math.max(0, billTotal - paidTotal)
    const isFullyPaid = billTotal > 0 && remaining === 0
    const isPaying = session?.lifecycle === "paying" || Boolean(session?.splitSnapshot)
    const hasSentOrders = (session?.sentOrders.length ?? 0) > 0
    const hasCart = (session?.cart.length ?? 0) > 0
    const pendingGuardian = queue.some((q) => q.status === "pending")

    return { paidTotal, billTotal, remaining, isFullyPaid, isPaying, hasSentOrders, hasCart, pendingGuardian }
  }, [session, table.billTotal, queue])

  const closeAction = useMemo(() => {
    if (billState.isFullyPaid) {
      return { label: "Liberar mesa", disabled: billState.pendingGuardian }
    }
    if (billState.isPaying) {
      return { label: "Esperando pago", disabled: false }
    }
    return {
      label: "Presentar cuenta",
      disabled: !billState.hasSentOrders || billState.hasCart || billState.pendingGuardian,
    }
  }, [billState])

  const openGuestMenuPreview = () => {
    navigate(
      `/menu?table=${tableId}&restaurant=${restaurant.id}&staffPreview=1&return=${encodeURIComponent(`/server/table/${table.id}`)}`
    )
  }

  const handleCloseAccount = () => {
    if (billState.isFullyPaid) {
      const result = staffClearTable(tableId)
      if (result.ok) {
        showBanner("Mesa liberada — lista para nuevos comensales")
        navigate("/server/floor-plan")
      } else if (result.reason === "guardian_pending") {
        showBanner("Aprueba los pedidos pendientes antes de liberar la mesa")
      } else {
        showBanner("Aún hay saldo pendiente por cobrar")
      }
      return
    }

    if (billState.isPaying) {
      showBanner("Cuenta presentada — los comensales pueden pagar desde su teléfono")
      return
    }

    const result = staffPresentBill(tableId)
    if (result.ok) {
      showBanner("Cuenta presentada — los comensales pueden pagar desde su teléfono")
      return
    }

    const messages = {
      empty: "No hay consumo enviado a cocina para presentar",
      cart_pending: "Envía o quita los artículos del carrito antes de presentar la cuenta",
      guardian_pending: "Aprueba los pedidos pendientes antes de presentar la cuenta",
      already_paid: "La cuenta ya está pagada — puedes liberar la mesa",
      already_paying: "La cuenta ya fue presentada",
    }
    showBanner(messages[result.reason])
  }

  return (
    <div className="flex justify-center items-start min-h-screen" style={{ background: "#E5E0DA" }}>
      <div className="relative w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        <header className="safe-top bg-card border-b border-border px-5 pt-5 pb-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/server/floor-plan")}
              className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:scale-95 transition-transform"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 space-y-0.5">
              <h1
                className="text-foreground"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.2 }}
              >
                Mesa #{table.number}{" "}
                <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.78rem" }}>
                  / Table #{table.number}
                </span>
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    {table.guestCount} comensales / guests
                  </span>
                </div>
                {table.openedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      {elapsedMins(table.openedAt)} min
                    </span>
                  </div>
                )}
              </div>
              {session && session.guests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {session.guests.map((g) => (
                    <span
                      key={g.guestId}
                      className="bg-muted text-foreground px-2 py-0.5 rounded-full"
                      style={{ fontSize: "0.68rem", fontWeight: 600 }}
                    >
                      {g.displayName}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right space-y-0.5 flex flex-col items-end">
              <div className="mb-2">
                <PortalSwitcher />
              </div>
              <p
                className="text-foreground animate-pulse"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.1 }}
              >
                {formatCRC(table.billTotal)}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                Total acumulado
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {[
              { id: "guardian" as const, label: "Guardian", badge: pendingCount },
              { id: "orders" as const, label: "Consumo", badge: 0 },
              { id: "manual" as const, label: "Agregar", badge: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-2 rounded-xl border transition-all ${
                  activeTab === tab.id
                    ? "border-[#6366F1] bg-[#6366F1] text-white"
                    : "border-border bg-muted text-muted-foreground"
                }`}
                style={{ fontSize: "0.78rem", fontWeight: 700 }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                    style={{ fontSize: "0.55rem" }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {banner && (
          <div
            className="mx-5 mt-3 px-3 py-2 rounded-xl bg-primary/10 text-primary text-center"
            style={{ fontSize: "0.75rem", fontWeight: 600 }}
          >
            {banner}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
          {activeTab === "guardian" && (
            <GuardianTab queue={queue} onApprove={approveGuardianOrder} onReject={rejectGuardianOrder} />
          )}
          {activeTab === "orders" && (
            <OrdersTab
              sentOrders={session?.sentOrders ?? []}
              cart={session?.cart ?? []}
              guests={session?.guests ?? []}
              payments={session?.payments ?? []}
              pendingOrderLinks={session?.pendingOrderLinks ?? {}}
              kdsTickets={kdsTickets}
              total={table.billTotal}
              onVoid={(cartId) => {
                const result = staffVoidItem(tableId, cartId)
                if (result.ok) showBanner("Artículo anulado / Voided")
                else if (result.reason === "paid")
                  showBanner("Ya pagado — requiere reembolso / Paid — needs refund")
                else showBanner("No se pudo anular / Could not void")
              }}
              onRemoveCart={(cartId) => {
                const result = staffRemoveCartItem(tableId, cartId)
                if (result.ok) showBanner("Quitado del carrito / Removed from cart")
              }}
            />
          )}
          {activeTab === "manual" && (
            <ManualOrderTab
              tableId={tableId}
              tableNumber={table.number}
              restaurant={restaurant}
              guests={session?.guests ?? []}
              onSent={() => {
                showBanner("Enviado a cocina / Sent to kitchen")
                setActiveTab("orders")
              }}
              staffSendToKitchen={staffSendToKitchen}
              menuItems={menuItems}
            />
          )}
        </div>

        <div className="safe-bottom border-t border-border bg-card px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={openGuestMenuPreview}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted text-foreground active:scale-[0.99]"
            style={{ fontSize: "0.82rem", fontWeight: 700 }}
          >
            <ChefHat size={16} />
            <span>Ver menú cliente</span>
          </button>
          <button
            type="button"
            onClick={handleCloseAccount}
            disabled={closeAction.disabled}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white disabled:opacity-40 active:scale-[0.99]"
            style={{ fontSize: "0.82rem", fontWeight: 700, background: billState.isFullyPaid ? "var(--color-confirm-green)" : "var(--color-server)" }}
          >
            <CreditCard size={16} />
            <span>{closeAction.label}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function GuardianTab({
  queue,
  onApprove,
  onReject,
}: {
  queue: GuardianOrder[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 size={40} className="text-status-green mx-auto mb-3" />
        <p className="text-foreground" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          Sin pedidos pendientes
        </p>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.78rem" }}>
          No pending orders
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TriangleAlert size={16} className="text-status-yellow" />
        <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
          Guardian Mode — Aprobación de pedidos / Order Approval
        </p>
      </div>
      {queue.map((order) => (
        <div
          key={order.id}
          className={`bg-card rounded-2xl border p-4 mb-3 ${
            order.status === "approved"
              ? "border-status-green opacity-60"
              : order.status === "rejected"
                ? "border-status-red opacity-60"
                : "border-status-yellow"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p
                className="text-foreground"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}
              >
                Ronda de pedido #{order.id.slice(-4)}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                {elapsedMins(new Date(order.submittedAt))} min ago · {formatCRC(order.total)}
                {order.submittedBy && (
                  <span style={{ fontWeight: 600, color: "#6366F1" }}> · {order.submittedBy}</span>
                )}
              </p>
            </div>
            {order.status !== "pending" && (
              <span
                className={`px-2 py-0.5 rounded-full text-white ${order.status === "approved" ? "bg-status-green" : "bg-status-red"}`}
                style={{ fontSize: "0.68rem", fontWeight: 700 }}
              >
                {order.status === "approved" ? "Aprobado" : "Rechazado"}
              </span>
            )}
          </div>
          {order.reasons && order.reasons.length > 0 && (
            <div className="mb-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
              {order.reasons.map((r, ri) => (
                <p key={ri} className="text-amber-800" style={{ fontSize: "0.68rem" }}>
                  • {r}
                </p>
              ))}
            </div>
          )}
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-muted-foreground bg-muted px-1.5 rounded" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                {item.quantity}×
              </span>
              <div>
                <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {item.name}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                    {item.modifiers.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}
          {order.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onReject(order.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-500 active:bg-red-50"
                style={{ fontSize: "0.82rem", fontWeight: 700 }}
              >
                <XCircle size={15} /> Rechazar / Reject
              </button>
              <button
                onClick={() => onApprove(order.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white"
                style={{ background: "#6366F1", fontSize: "0.82rem", fontWeight: 700 }}
              >
                <CheckCircle2 size={15} /> Aprobar / Approve
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function OrdersTab({
  sentOrders,
  cart,
  guests,
  payments,
  pendingOrderLinks,
  kdsTickets,
  total,
  onVoid,
  onRemoveCart,
}: {
  sentOrders: CartItem[]
  cart: CartItem[]
  guests: TableGuest[]
  payments: PaymentRecord[]
  pendingOrderLinks: Record<string, string[]>
  kdsTickets: KDSTicket[]
  total: number
  onVoid: (cartId: string) => void
  onRemoveCart: (cartId: string) => void
}) {
  const guestName = (guestId: string) => guests.find((g) => g.guestId === guestId)?.displayName ?? "Comensal"
  const pendingIds = new Set(Object.values(pendingOrderLinks).flat())

  if (sentOrders.length === 0 && cart.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          No hay consumo registrado aún
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cart.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
            Por enviar / Guest cart
          </p>
          <div className="bg-card rounded-2xl border border-primary/30 overflow-hidden">
            {cart.map((item, i) => (
              <div
                key={item.cartId}
                className={`px-4 py-3 flex justify-between gap-2 ${i < cart.length - 1 ? "border-b border-border" : ""}`}
              >
                <BillLine item={item} guestName={guestName(item.orderedBy)} status="Carrito" />
                <button
                  type="button"
                  onClick={() => onRemoveCart(item.cartId)}
                  className="flex-shrink-0 self-center flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-200 text-red-500"
                  style={{ fontSize: "0.65rem", fontWeight: 700 }}
                >
                  <Trash2 size={12} /> Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {sentOrders.map((item, i) => {
            const ticket = findKdsTicketForCartItem(kdsTickets, item.cartId)
            const paid = isReceiptCyclePaid(item, sentOrders, cart, payments)
            const awaiting = pendingIds.has(item.cartId)
            const status = paid
              ? "Pagado"
              : awaiting
                ? "Por aprobar"
                : ticket?.status === "preparing"
                  ? "Preparando"
                  : ticket?.status === "ready"
                    ? "Listo"
                    : ticket?.status === "delivered"
                      ? "Entregado"
                      : ticket?.status === "pending"
                        ? "En cola"
                        : "Enviado"

            return (
              <div
                key={item.cartId}
                className={`px-4 py-3 ${i < sentOrders.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex justify-between gap-2">
                  <BillLine
                    item={item}
                    guestName={guestName(item.orderedBy)}
                    status={status}
                    staff={item.source === "staff"}
                  />
                  <span
                    className="text-foreground flex-shrink-0"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}
                  >
                    {formatCRC(item.totalPrice * item.quantity)}
                  </span>
                </div>
                <div className="flex justify-end gap-1.5 mt-2">
                  {paid ? (
                    <span
                      className="flex items-center gap-1 text-muted-foreground px-2 py-1"
                      style={{ fontSize: "0.65rem", fontWeight: 600 }}
                    >
                      <Lock size={11} /> Requiere reembolso
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onVoid(item.cartId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500"
                      style={{ fontSize: "0.65rem", fontWeight: 700 }}
                    >
                      <Ban size={12} /> Anular / Void
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <div className="px-4 py-3 bg-muted border-t border-border flex justify-between">
            <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>
              Total
            </span>
            <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>
              {formatCRC(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function BillLine({
  item,
  guestName,
  status,
  staff,
}: {
  item: CartItem
  guestName: string
  status: string
  staff?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
        {item.quantity > 1 ? `${item.quantity}× ` : ""}
        {item.name}
      </p>
      {item.modifiers.length > 0 && (
        <p className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>
          {item.modifiers.join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap gap-1 mt-0.5">
        <span className="bg-muted text-muted-foreground px-1.5 rounded" style={{ fontSize: "0.65rem" }}>
          {status}
        </span>
        <span className="bg-primary/10 text-primary px-1.5 rounded" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
          {guestName}
        </span>
        {staff && (
          <span className="bg-muted text-muted-foreground px-1.5 rounded" style={{ fontSize: "0.65rem" }}>
            Mesero
          </span>
        )}
      </div>
    </div>
  )
}

interface DraftLine {
  draftId: string
  menuItemId: string
  name: string
  basePrice: number
  totalPrice: number
  quantity: number
  modifiers: string[]
}

function ManualOrderTab({
  tableId,
  tableNumber,
  restaurant,
  guests,
  onSent,
  staffSendToKitchen,
  menuItems,
}: {
  tableId: string
  tableNumber: number
  restaurant: Restaurant
  guests: TableGuest[]
  onSent: () => void
  staffSendToKitchen: ReturnType<typeof useGuest>["staffSendToKitchen"]
  menuItems: MenuItem[]
}) {
  const [note, setNote] = useState("")
  const [draft, setDraft] = useState<DraftLine[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null)
  const [orderedBy, setOrderedBy] = useState(staffGuestId(tableId))
  const guestChoices = guests.filter((g) => !g.guestId.startsWith("staff-"))
  const draftTotal = draft.reduce((s, i) => s + i.totalPrice * i.quantity, 0)

  const handleConfirm = (item: MenuItem, qty: number, modifiers: string[], unitPrice: number) => {
    setDraft((prev) => [
      ...prev,
      {
        draftId: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        basePrice: item.price,
        totalPrice: unitPrice,
        quantity: qty,
        modifiers,
      },
    ])
    setModifierItem(null)
  }

  const send = () => {
    const result = staffSendToKitchen(
      tableId,
      draft.map((d) => ({
        menuItemId: d.menuItemId,
        name: d.name,
        basePrice: d.basePrice,
        totalPrice: d.totalPrice,
        quantity: d.quantity,
        modifiers: d.modifiers,
      })),
      { notes: note, orderedBy }
    )
    if (result.ok) {
      setDraft([])
      setNote("")
      onSent()
    }
  }

  return (
    <div>
      <p className="text-muted-foreground mb-4" style={{ fontSize: "0.82rem" }}>
        Ingresa un pedido del menú para Mesa #{tableNumber} / Manual order entry
      </p>

      {guestChoices.length > 0 && (
        <label className="block mb-3">
          <span className="text-muted-foreground" style={{ fontSize: "0.72rem", fontWeight: 600 }}>
            Atribuir a / Assign to
          </span>
          <select
            value={orderedBy}
            onChange={(e) => setOrderedBy(e.target.value)}
            className="mt-1 w-full bg-card border border-border rounded-xl px-3 py-2.5 text-foreground"
            style={{ fontSize: "0.85rem" }}
          >
            <option value={staffGuestId(tableId)}>Mesero / Staff</option>
            {guestChoices.map((g) => (
              <option key={g.guestId} value={g.guestId}>
                {g.displayName}
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border bg-card text-foreground mb-3"
        style={{ fontWeight: 600, fontSize: "0.88rem" }}
      >
        <Plus size={18} />
        Agregar artículo del menú / Add Menu Item
      </button>

      {draft.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-3">
          {draft.map((line) => (
            <div
              key={line.draftId}
              className="px-4 py-3 flex items-start justify-between gap-2 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {line.quantity}× {line.name}
                </p>
                {line.modifiers.length > 0 && (
                  <p className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>
                    {line.modifiers.join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.82rem" }}>
                  {formatCRC(line.totalPrice * line.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => setDraft((p) => p.filter((d) => d.draftId !== line.draftId))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted"
                  aria-label="Quitar"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-muted flex justify-between">
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Subtotal</span>
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>{formatCRC(draftTotal)}</span>
          </div>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notas especiales, alergias... / Special notes, allergies..."
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#6366F1] transition-colors mb-3"
        style={{ fontSize: "0.85rem", minHeight: "80px" }}
      />

      <button
        type="button"
        disabled={draft.length === 0}
        onClick={send}
        className="w-full py-3.5 rounded-2xl text-white disabled:opacity-40"
        style={{ background: "#6366F1", fontWeight: 700, fontSize: "0.9rem" }}
      >
        <ChefHat size={16} className="inline mr-2" />
        Enviar a Cocina / Send to Kitchen
      </button>

      {pickerOpen && (
        <StaffMenuPicker
          restaurant={restaurant}
          tableNumber={tableNumber}
          onClose={() => setPickerOpen(false)}
          onAddItem={(item) => {
            setPickerOpen(false)
            setModifierItem(item)
          }}
          menuItems={menuItems}
        />
      )}
      {modifierItem && (
        <ModifierModal item={modifierItem} onClose={() => setModifierItem(null)} onConfirm={handleConfirm} />
      )}
    </div>
  )
}
