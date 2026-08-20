import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, CheckCircle2, XCircle, Clock, Users, Plus, ChefHat, CreditCard, TriangleAlert } from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import { formatCRCShort, elapsedMins, type GuardianOrder } from "../../data/mockData"
import { formatCRC } from "../../utils/format"
import { useGuest } from "../../context/GuestContext"

export default function TableDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { 
    allTables, 
    guardianQueue, 
    approveGuardianOrder, 
    rejectGuardianOrder, 
    getTableSession 
  } = useGuest()

  const table = allTables.find((t) => t.id === id) || allTables[0]
  const session = getTableSession(table.number.toString())
  const queue = guardianQueue.filter((q) => q.tableId === table.number.toString())
  
  const [activeTab, setActiveTab] = useState<"guardian" | "orders" | "manual">("guardian")
  const pendingCount = queue.filter((q) => q.status === "pending").length

  return (
    <div className="flex justify-center items-start min-h-screen" style={{ background: "#E5E0DA" }}>
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        {/* Header */}
        <header className="safe-top bg-card border-b border-border px-5 pt-5 pb-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/server/floor-plan")} className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:scale-95 transition-transform">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 space-y-0.5">
              <h1 className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.2 }}>
                Mesa #{table.number} <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.78rem" }}>/ Table #{table.number}</span>
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{table.guestCount} comensales / guests</span>
                </div>
                {table.openedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{elapsedMins(table.openedAt)} min</span>
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
              <p className="text-foreground animate-pulse" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.1 }}>
                {formatCRC(table.billTotal)}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Total acumulado</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { id: "guardian", label: "Guardian", badge: pendingCount },
              { id: "orders", label: "Consumo" },
              { id: "manual", label: "Agregar" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex-1 py-2 rounded-xl border transition-all ${
                  activeTab === tab.id
                    ? "border-[#6366F1] bg-[#6366F1] text-white"
                    : "border-border bg-muted text-muted-foreground"
                }`}
                style={{ fontSize: "0.78rem", fontWeight: 700 }}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: "0.55rem" }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
          {activeTab === "guardian" && (
            <GuardianTab queue={queue} onApprove={approveGuardianOrder} onReject={rejectGuardianOrder} />
          )}
          {activeTab === "orders" && (
            <OrdersTab items={session?.sentOrders || []} total={table.billTotal} guests={session?.guests ?? []} />
          )}
          {activeTab === "manual" && (
            <ManualOrderTab tableNumber={table.number} />
          )}
        </div>

        {/* Bottom actions */}
        <div className="safe-bottom border-t border-border bg-card px-5 py-4 flex gap-3">
          <button
            onClick={() => navigate(`/m/${table.number}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted text-foreground"
            style={{ fontSize: "0.82rem", fontWeight: 700 }}
          >
            <ChefHat size={16} />
            <span>Ver menú cliente</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white"
            style={{ fontSize: "0.82rem", fontWeight: 700, background: "#6366F1" }}
          >
            <CreditCard size={16} />
            <span>Cerrar cuenta</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function GuardianTab({ queue, onApprove, onReject }: { queue: GuardianOrder[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 size={40} className="text-status-green mx-auto mb-3" />
        <p className="text-foreground" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Sin pedidos pendientes</p>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.78rem" }}>No pending orders</p>
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
        <div key={order.id} className={`bg-card rounded-2xl border p-4 mb-3 ${
          order.status === "approved" ? "border-status-green opacity-60" :
          order.status === "rejected" ? "border-status-red opacity-60" :
          "border-status-yellow"
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
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
              <span className={`px-2 py-0.5 rounded-full text-white ${order.status === "approved" ? "bg-status-green" : "bg-status-red"}`}
                style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                {order.status === "approved" ? "Aprobado" : "Rechazado"}
              </span>
            )}
          </div>
          {order.reasons && order.reasons.length > 0 && (
            <div className="mb-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
              {order.reasons.map((r, ri) => (
                <p key={ri} className="text-amber-800" style={{ fontSize: "0.68rem" }}>• {r}</p>
              ))}
            </div>
          )}
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-muted-foreground bg-muted px-1.5 rounded" style={{ fontSize: "0.7rem", fontWeight: 700 }}>{item.quantity}×</span>
              <div>
                <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>{item.name}</p>
                {item.modifiers.length > 0 && (
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{item.modifiers.join(", ")}</p>
                )}
              </div>
            </div>
          ))}
          {order.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => onReject(order.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-500 active:bg-red-50" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                <XCircle size={15} /> Rechazar / Reject
              </button>
              <button onClick={() => onApprove(order.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white" style={{ background: "#6366F1", fontSize: "0.82rem", fontWeight: 700 }}>
                <CheckCircle2 size={15} /> Aprobar / Approve
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function OrdersTab({ items, total, guests }: { items: Array<{ name: string; quantity: number; totalPrice: number; round: number; orderedBy: string; modifiers?: string[] }>; total: number; guests: Array<{ guestId: string; displayName: string }> }) {
  const guestName = (guestId: string) => guests.find((g) => g.guestId === guestId)?.displayName ?? "Comensal"

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No hay consumo registrado aún</p>
      </div>
    )
  }
  return (
    <div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`px-4 py-3 flex justify-between gap-2 ${i < items.length - 1 ? "border-b border-border" : ""}`}>
            <div>
              <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                <span className="bg-muted text-muted-foreground px-1.5 rounded" style={{ fontSize: "0.65rem" }}>Cuenta {item.receiptCycle}</span>
                {item.round > 0 && (
                  <span className="bg-muted text-muted-foreground px-1.5 rounded" style={{ fontSize: "0.65rem" }}>Envío {item.round}</span>
                )}
                <span className="bg-primary/10 text-primary px-1.5 rounded" style={{ fontSize: "0.65rem", fontWeight: 600 }}>{guestName(item.orderedBy)}</span>
              </div>
            </div>
            <span className="text-foreground flex-shrink-0" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>
              {formatCRC(item.totalPrice * item.quantity)}
            </span>
          </div>
        ))}
        <div className="px-4 py-3 bg-muted border-t border-border flex justify-between">
          <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>Total</span>
          <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>{formatCRC(total)}</span>
        </div>
      </div>
    </div>
  )
}

function ManualOrderTab({ tableNumber }: { tableNumber: number }) {
  const [note, setNote] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <div>
      <p className="text-muted-foreground mb-4" style={{ fontSize: "0.82rem" }}>
        Ingresa un pedido manualmente para Mesa #{tableNumber} / Manual order entry
      </p>
      <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border bg-card text-foreground mb-3" style={{ fontWeight: 600, fontSize: "0.88rem" }}>
        <Plus size={18} />
        Agregar artículo del menú / Add Menu Item
      </button>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notas especiales, alergias... / Special notes, allergies..."
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#6366F1] transition-colors mb-3"
        style={{ fontSize: "0.85rem", minHeight: "80px" }}
      />
      {sent ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-status-green border border-green-200">
          <CheckCircle2 size={18} />
          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Enviado a cocina / Sent to Kitchen</span>
        </div>
      ) : (
        <button onClick={() => setSent(true)} className="w-full py-3.5 rounded-2xl text-white" style={{ background: "#6366F1", fontWeight: 700, fontSize: "0.9rem" }}>
          <ChefHat size={16} className="inline mr-2" />
          Enviar a Cocina / Send to Kitchen
        </button>
      )}
    </div>
  )
}
