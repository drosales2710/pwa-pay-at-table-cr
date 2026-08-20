import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Settings, User, Users, Clock, TriangleAlert } from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import { formatCRCShort, elapsedMins, type TableRecord, type TableStatus } from "../../data/mockData"
import { useGuest } from "../../context/GuestContext"

const STATUS_CONFIG: Record<TableStatus, { label: string; labelEn: string; bg: string; border: string; text: string; dot: string }> = {
  available: { label: "Disponible", labelEn: "Available", bg: "#F5F5F4", border: "#D6D3D1", text: "#78716C", dot: "#A8A29E" },
  open:      { label: "Abierta",    labelEn: "Open",      bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
  processing:{ label: "Pagando",    labelEn: "Paying",    bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B" },
  closed:    { label: "Pagado",     labelEn: "Paid",      bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", dot: "#22C55E" },
}

const APPROVAL_CONFIG = {
  label: "Aprobar",
  labelEn: "Approve",
  bg: "#FFFBEB",
  border: "#F59E0B",
  text: "#92400E",
  dot: "#F59E0B",
}

type FloorFilter = TableStatus | "all" | "approval"

const SECTIONS = [
  { id: "main",    label: "Salón Principal", labelEn: "Main Dining" },
  { id: "bar",     label: "Barra",           labelEn: "Bar" },
  { id: "private", label: "Privado",         labelEn: "Private" },
  { id: "terrace", label: "Terraza",         labelEn: "Terrace" },
] as const

export default function FloorPlan() {
  const navigate = useNavigate()
  const { allTables: tables, restaurant } = useGuest()
  const [filter, setFilter] = useState<FloorFilter>("all")
  const pendingAlerts = tables.filter((t) => t.hasGuardianPending).length

  const firstPendingTable = tables.find((t) => t.hasGuardianPending)
  const pendingTablePath = firstPendingTable
    ? `/server/table/${firstPendingTable.id}`
    : "/server/table/t7"

  const filtered =
    filter === "all"
      ? tables
      : filter === "approval"
        ? tables.filter((t) => t.hasGuardianPending)
        : tables.filter((t) => t.status === filter)

  const stats = {
    open: tables.filter((t) => t.status === "open").length,
    available: tables.filter((t) => t.status === "available").length,
    processing: tables.filter((t) => t.status === "processing").length,
    approval: pendingAlerts,
    revenue: tables.reduce((s, t) => s + t.billTotal, 0),
  }

  const filterTabs = useMemo((): FloorFilter[] => {
    const statusTabs: FloorFilter[] = ["available", "open", "processing", "closed"]
    if (pendingAlerts > 0) {
      return ["all", "approval", ...statusTabs]
    }
    return ["all", ...statusTabs, "approval"]
  }, [pendingAlerts])

  return (
    <div className="flex justify-center items-start min-h-screen" style={{ background: "#E5E0DA" }}>
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        {/* Header */}
        <header className="safe-top bg-card border-b border-border px-5 pt-5 pb-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h1 className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.2 }}>
                {restaurant.name} <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.78rem" }}>· Floor Plan</span>
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem", lineHeight: 1.3 }}>
                {stats.open} mesas activas · {stats.available} disponibles
                {pendingAlerts > 0 && (
                  <span style={{ color: "#D97706", fontWeight: 700 }}> · {pendingAlerts} por aprobar</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PortalSwitcher />
              {pendingAlerts > 0 && (
                <button
                  onClick={() => navigate(pendingTablePath)}
                  className="relative w-9 h-9 flex items-center justify-center rounded-full active:opacity-70 animate-pulse"
                  style={{ background: "#FEF3C7", border: "2px solid #F59E0B" }}
                >
                  <Bell size={18} style={{ color: "#D97706" }} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center" style={{ fontSize: "0.6rem", fontWeight: 800 }}>
                    {pendingAlerts}
                  </span>
                </button>
              )}
              <button onClick={() => navigate("/server/shift-closing")} className="w-9 h-9 flex items-center justify-center bg-muted rounded-full">
                <User size={17} className="text-foreground" />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-2 mb-4 mt-1">
            {[
              { label: "Activas", value: stats.open, color: "#EF4444" },
              { label: "Libres", value: stats.available, color: "#22C55E" },
              { label: pendingAlerts > 0 ? "Aprobar" : "Pagando", value: pendingAlerts > 0 ? stats.approval : stats.processing, color: pendingAlerts > 0 ? "#F59E0B" : "#F59E0B" },
              { label: "Ventas", value: formatCRCShort(stats.revenue), color: "#6366F1" },
            ].map((s) => (
              <div key={s.label} className="bg-muted/70 rounded-xl px-2 py-2.5 text-center">
                <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: s.color }}>
                  {s.value}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "0.62rem" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-1" style={{ scrollbarWidth: "none" }}>
            {filterTabs.map((s) => {
              const isApproval = s === "approval"
              const isActive = filter === s
              const approvalCount = stats.approval
              const isPriorityApproval = isApproval && approvalCount > 0
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                    isActive
                      ? isPriorityApproval
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-foreground text-background border-foreground"
                      : isPriorityApproval
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : isApproval
                          ? "bg-muted text-muted-foreground border-transparent opacity-60"
                          : "bg-muted text-muted-foreground border-transparent"
                  }`}
                  style={{ fontSize: "0.72rem", fontWeight: 600 }}
                >
                  {s === "all" ? "Todas / All" : isApproval ? (
                    <>
                      {isPriorityApproval && <TriangleAlert size={11} />}
                      Aprobar / Approve
                      {approvalCount > 0 && (
                        <span className="bg-red-500 text-white rounded-full px-1.5 min-w-[16px] text-center" style={{ fontSize: "0.6rem", fontWeight: 800 }}>
                          {approvalCount}
                        </span>
                      )}
                    </>
                  ) : (
                    STATUS_CONFIG[s].label
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {/* Floor sections */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-24">
          {filter === "approval" && filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCirclePlaceholder />
              <p className="text-muted-foreground mt-3" style={{ fontSize: "0.85rem" }}>Sin pedidos por aprobar / No approvals needed</p>
            </div>
          )}
          {SECTIONS.map((section) => {
            const sectionTables = filtered.filter((t) => t.section === section.id)
            if (sectionTables.length === 0) return null
            return (
              <div key={section.id} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                    {section.label}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>/ {section.labelEn}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {sectionTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onClick={() => navigate(`/server/table/${table.id}`)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom nav */}
        <div className="safe-bottom border-t border-border bg-card flex">
          {[
            { icon: <Settings size={20} />, label: "Mesas", active: true },
            { icon: <Bell size={20} />, label: "Pedidos", badge: pendingAlerts },
            { icon: <User size={20} />, label: "Mi turno" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={i === 1 ? () => navigate(pendingTablePath) : i === 2 ? () => navigate("/server/shift-closing") : undefined}
              className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${item.active ? "" : ""}`}
            >
              <span style={{ color: item.active ? "#6366F1" : pendingAlerts > 0 && i === 1 ? "#D97706" : "#78716C" }}>{item.icon}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: item.active ? "#6366F1" : pendingAlerts > 0 && i === 1 ? "#D97706" : "#78716C" }}>
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute top-1.5 right-1/4 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center" style={{ fontSize: "0.55rem" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckCirclePlaceholder() {
  return (
    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
      <span style={{ fontSize: "1.5rem" }}>✓</span>
    </div>
  )
}

function TableCard({ table, onClick }: { table: TableRecord; onClick: () => void }) {
  const { getTableSession } = useGuest()
  const session = getTableSession(table.number.toString())
  const guestNames = session?.guests.map((g) => g.displayName) ?? []

  const cfg = table.hasGuardianPending ? APPROVAL_CONFIG : STATUS_CONFIG[table.status]
  const mins = table.openedAt ? elapsedMins(table.openedAt) : null

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative shadow-sm ${
        table.hasGuardianPending ? "animate-pulse" : ""
      }`}
      style={{
        background: cfg.bg,
        borderColor: table.hasGuardianPending ? "#F59E0B" : cfg.border,
        borderWidth: table.hasGuardianPending ? 2 : 1,
        minHeight: "84px",
        boxShadow: table.hasGuardianPending ? "0 0 0 2px rgba(245,158,11,0.25)" : undefined,
      }}
    >
      {table.hasGuardianPending && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
          <TriangleAlert size={11} className="text-white" />
        </span>
      )}
      <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.25rem", color: cfg.text, lineHeight: 1.1 }}>
        {table.number}
      </span>
      {table.status !== "available" ? (
        <>
          <div className="flex items-center gap-1">
            <Users size={11} style={{ color: cfg.text }} />
            <span style={{ fontSize: "0.68rem", color: cfg.text, fontWeight: 600 }}>{table.guestCount} pax</span>
          </div>
          {guestNames.length > 0 && (
            <span
              className="truncate max-w-full text-center px-1"
              style={{ fontSize: "0.58rem", color: cfg.text, fontWeight: 600, lineHeight: 1.2 }}
              title={guestNames.join(", ")}
            >
              {guestNames.join(", ")}
            </span>
          )}
          {table.hasGuardianPending && (
            <span style={{ fontSize: "0.58rem", color: "#D97706", fontWeight: 800 }}>¡Aprobar!</span>
          )}
          {mins !== null && (
            <div className="flex items-center gap-1">
              <Clock size={11} style={{ color: cfg.text }} />
              <span style={{ fontSize: "0.68rem", color: cfg.text }}>{mins}m</span>
            </div>
          )}
          {table.billTotal > 0 && (
            <span style={{ fontSize: "0.68rem", color: cfg.text, fontWeight: 700 }}>
              {formatCRCShort(table.billTotal)}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: "0.68rem", color: cfg.text, fontWeight: 500 }}>Libre</span>
      )}
      <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: cfg.dot }} />
    </button>
  )
}
