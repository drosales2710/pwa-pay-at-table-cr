import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Wine, CreditCard, Users, Clock, CheckCircle2, Printer } from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import { elapsedMins, type TableRecord } from "../../data/mockData"
import { formatCRC, formatCRCShort } from "../../utils/format"
import { useGuest } from "../../context/GuestContext"
import type { PaymentRecord } from "../../types"

export default function CashierPOS() {
  const navigate = useNavigate()
  const { restaurant, allTables, getTableSession } = useGuest()
  const [tab, setTab] = useState<"floor" | "payments" | "zreport">("floor")

  const session = getTableSession("7")
  const payments = session?.payments ?? []
  const paidTotal = payments.reduce((s, p) => s + p.amount + p.tipAmount, 0)
  const orderCount = session?.sentOrders.length
    ? new Set(session.sentOrders.map((i) => i.orderId).filter(Boolean)).size
    : 0

  const stats = {
    openTables: allTables.filter((t) => t.status === "open").length,
    processing: allTables.filter((t) => t.status === "processing").length,
    todayRevenue: paidTotal > 0 ? paidTotal : allTables.reduce((s, t) => s + t.billTotal, 0),
    todayOrders: payments.length > 0 ? payments.length : orderCount,
  }

  return (
    <div style={{ minHeight: "100svh", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ background: "#111111", borderBottom: "1px solid #2A2A2A", padding: "18px 28px", display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <CreditCard size={24} color="#A78BFA" />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <p style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.2 }}>
              Caja / POS <span style={{ color: "#6B7280", fontWeight: 400, fontSize: "0.8rem" }}>/ Cashier</span>
            </p>
            <p style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 500 }}>{restaurant.name} · {new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <PortalSwitcher />
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          {[
            { icon: <ChefHat size={15} />, label: "Cocina", path: "/kds/kitchen" },
            { icon: <Wine size={15} />, label: "Barra", path: "/kds/bar" },
            { icon: <CreditCard size={15} />, label: "Caja", path: "/kds/cashier", active: true },
          ].map((b) => (
            <button key={b.label} onClick={() => navigate(b.path)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: b.active ? "#A78BFA" : "#1F1F1F", color: b.active ? "#000" : "#9CA3AF",
                fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.75rem" }}>
              {b.icon}{b.label}
            </button>
          ))}
        </div>
      </header>

      {/* Stats strip */}
      <div style={{ background: "#111111", borderBottom: "1px solid #1F1F1F", padding: "16px 28px", display: "flex", gap: "36px" }}>
        {[
          { label: "Mesas activas / Open", value: stats.openTables, color: "#EF4444" },
          { label: "Pagando / Processing", value: stats.processing, color: "#F59E0B" },
          { label: "Ventas hoy / Today", value: formatCRCShort(stats.todayRevenue), color: "#4ADE80" },
          { label: "Órdenes hoy / Orders", value: stats.todayOrders, color: "#60A5FA" },
        ].map((s) => (
          <div key={s.label}>
            <p style={{ color: s.color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.25rem" }}>{s.value}</p>
            <p style={{ color: "#6B7280", fontSize: "0.65rem", marginTop: "2px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ background: "#111111", borderBottom: "1px solid #2A2A2A", padding: "0 28px", display: "flex", gap: "8px" }}>
        {[
          { id: "floor", label: "Piso / Floor" },
          { id: "payments", label: "Pagos / Payments" },
          { id: "zreport", label: "Cierre Z / Z-Report" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{ padding: "12px 16px", border: "none", cursor: "pointer", background: "transparent",
              color: tab === t.id ? "#A78BFA" : "#6B7280",
              borderBottom: tab === t.id ? "2px solid #A78BFA" : "2px solid transparent",
              fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.78rem" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {tab === "floor" && <FloorTab tables={allTables} />}
        {tab === "payments" && <PaymentsTab payments={payments} />}
        {tab === "zreport" && <ZReportTab stats={stats} />}
      </div>
    </div>
  )
}

function FloorTab({ tables }: { tables: TableRecord[] }) {
  const open = tables.filter((t) => ["open", "processing"].includes(t.status))

  if (open.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#6B7280", fontSize: "0.85rem" }}>
        Sin mesas activas / No active tables
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
        {open.map((table) => {
          const mins = table.openedAt ? elapsedMins(table.openedAt) : 0
          const statusColor = table.status === "processing" ? "#F59E0B" : "#EF4444"
          return (
            <div key={table.id} style={{ background: "#141414", border: `1px solid ${statusColor}40`, borderRadius: "12px", padding: "14px", borderLeft: `3px solid ${statusColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.4rem" }}>#{table.number}</span>
                <span style={{ color: statusColor, background: statusColor + "22", padding: "2px 8px", borderRadius: "20px", fontSize: "0.62rem", fontWeight: 700 }}>
                  {table.status === "processing" ? "PAGANDO" : "ACTIVA"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Users size={11} color="#9CA3AF" />
                  <span style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>{table.guestCount}</span>
                </div>
                {mins > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} color="#9CA3AF" />
                    <span style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>{mins}m</span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1px solid #2A2A2A", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>Cuenta</span>
                <span style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.9rem" }}>{formatCRCShort(table.billTotal)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PaymentsTab({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#6B7280", fontSize: "0.85rem" }}>
        Sin pagos registrados / No payments yet
      </div>
    )
  }

  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: "0.75rem", fontWeight: 700, marginBottom: "12px" }}>TRANSACCIONES / TRANSACTIONS</p>
      <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: "12px", overflow: "hidden" }}>
        {payments.map((tx, i) => (
          <div key={tx.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", borderBottom: i < payments.length - 1 ? "1px solid #2A2A2A" : "none" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: "#F5F5F5", fontSize: "0.85rem", fontWeight: 600 }}>Mesa #7 · {tx.guestName}</p>
              <p style={{ color: "#6B7280", fontSize: "0.68rem" }}>{tx.id} · {new Date(tx.paidAt).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "#4ADE80", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.88rem" }}>
                {formatCRC(tx.amount + tx.tipAmount)}
              </p>
              <p style={{ color: "#6B7280", fontSize: "0.62rem" }}>{tx.splitMethod ?? "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ZReportTab({ stats }: { stats: { todayRevenue: number; todayOrders: number } }) {
  const [printed, setPrinted] = useState(false)
  const avgTicket = stats.todayOrders > 0 ? Math.round(stats.todayRevenue / stats.todayOrders) : 0
  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: "0.75rem", fontWeight: 700, marginBottom: "12px" }}>REPORTE DE CIERRE Z / Z-REPORT</p>
      <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        {[
          { label: "Ventas netas / Net Sales", value: formatCRC(stats.todayRevenue) },
          { label: "Órdenes / Orders", value: `${stats.todayOrders}` },
          { label: "Ticket promedio / Avg Ticket", value: stats.todayOrders > 0 ? formatCRC(avgTicket) : "—" },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F1F1F" }}>
            <span style={{ color: "#9CA3AF", fontSize: "0.82rem" }}>{row.label}</span>
            <span style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", marginTop: "4px" }}>
          <span style={{ color: "#A78BFA", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}>TOTAL CAJA</span>
          <span style={{ color: "#A78BFA", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
            {formatCRC(stats.todayRevenue)}
          </span>
        </div>
      </div>
      <button
        onClick={() => setPrinted(true)}
        style={{
          width: "100%", padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer",
          background: printed ? "#14532D" : "#A78BFA", color: printed ? "#4ADE80" : "#000",
          fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.9rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}
      >
        {printed ? <><CheckCircle2 size={18} /> Reporte impreso / Printed</> : <><Printer size={18} /> Imprimir cierre Z / Print Z-Report</>}
      </button>
    </div>
  )
}
