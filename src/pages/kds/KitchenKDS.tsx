import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Wine, CreditCard, AlertTriangle } from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import { elapsedMins, type KDSStatus } from "../../data/mockData"
import { useGuest } from "../../context/GuestContext"

type VisibleStatus = "pending" | "preparing" | "ready"
const COLUMN_CONFIG: Record<VisibleStatus, { label: string; labelEn: string; color: string; bg: string }> = {
  pending:   { label: "Pendiente",  labelEn: "Pending",    color: "#F59E0B", bg: "#78350F" },
  preparing: { label: "Preparando", labelEn: "Preparing",  color: "#60A5FA", bg: "#1E3A5F" },
  ready:     { label: "Listo",      labelEn: "Ready",      color: "#4ADE80", bg: "#14532D" },
}

function ticketBorderColor(mins: number, status: KDSStatus) {
  if (status === "ready") return "#4ADE80"
  if (status === "preparing") return "#60A5FA"
  if (mins >= 15) return "#EF4444"
  if (mins >= 10) return "#F59E0B"
  return "#F59E0B"
}

function ElapsedTimer({ createdAt }: { createdAt: Date }) {
  const [mins, setMins] = useState(elapsedMins(createdAt))
  useEffect(() => {
    const id = setInterval(() => setMins(elapsedMins(createdAt)), 30000)
    return () => clearInterval(id)
  }, [createdAt])
  const color = mins >= 15 ? "#EF4444" : mins >= 10 ? "#F59E0B" : "#4ADE80"
  return (
    <span style={{ color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.85rem" }}>
      {mins < 1 ? "< 1" : mins}m
      {mins >= 10 && <AlertTriangle size={12} className="inline ml-1" />}
    </span>
  )
}

export default function KitchenKDS() {
  const navigate = useNavigate()
  const { restaurant, kdsTickets, advanceKdsTicket, bumpKdsTicket } = useGuest()
  const tickets = kdsTickets.filter((t) => t.station === "kitchen" && t.status !== "delivered")
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const advance = (ticketId: string) => advanceKdsTicket(ticketId)
  const bump = (ticketId: string) => bumpKdsTicket(ticketId)

  const byStatus = (s: KDSStatus) => tickets.filter((t) => t.status === s)

  return (
    <div style={{ minHeight: "100svh", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>
      {/* KDS Header */}
      <header style={{ background: "#111111", borderBottom: "1px solid #2A2A2A", padding: "18px 28px", display: "flex", alignItems: "center", gap: "24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ChefHat size={24} color="#F59E0B" />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <p style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.2 }}>
              KDS Cocina <span style={{ color: "#6B7280", fontWeight: 400, fontSize: "0.8rem" }}>/ Kitchen</span>
            </p>
            <p style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 500 }}>{restaurant.name} · {new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <PortalSwitcher />
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <KDSNavBtn icon={<ChefHat size={15} />} label="Cocina" active onClick={() => {}} />
          <KDSNavBtn icon={<Wine size={15} />} label="Barra" onClick={() => navigate("/kds/bar")} />
          <KDSNavBtn icon={<CreditCard size={15} />} label="Caja" onClick={() => navigate("/kds/cashier")} />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {(["pending", "preparing", "ready"] as VisibleStatus[]).map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <p style={{ color: COLUMN_CONFIG[s].color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem" }}>
                {byStatus(s).length}
              </p>
              <p style={{ color: "#6B7280", fontSize: "0.62rem" }}>{COLUMN_CONFIG[s].labelEn}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Ticket columns */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", padding: "28px", overflowY: "auto" }}>
        {(["pending", "preparing", "ready"] as VisibleStatus[]).map((status) => {
          const cfg = COLUMN_CONFIG[status]
          const cols = byStatus(status)
          return (
            <div key={status}>
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "8px 12px", borderRadius: "10px", background: cfg.bg + "60" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color }} />
                <span style={{ color: cfg.color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.85rem" }}>{cfg.label}</span>
                <span style={{ color: "#6B7280", fontSize: "0.7rem" }}>/ {cfg.labelEn}</span>
                <span style={{ marginLeft: "auto", color: cfg.color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.85rem" }}>{cols.length}</span>
              </div>

              {cols.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#374151", fontSize: "0.78rem" }}>
                  Sin tickets / No tickets
                </div>
              )}

              {cols.map((ticket) => {
                const mins = elapsedMins(ticket.createdAt)
                const borderColor = ticketBorderColor(mins, ticket.status)
                return (
                  <div
                    key={ticket.id}
                    style={{
                      background: "#141414",
                      border: `2px solid ${borderColor}`,
                      borderRadius: "12px",
                      marginBottom: "10px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Ticket header */}
                    <div style={{ background: borderColor + "22", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.3rem" }}>
                          #{ticket.tableNumber}
                        </span>
                        <div>
                          <p style={{ color: "#9CA3AF", fontSize: "0.62rem" }}>Envío {ticket.round} · Mesa</p>
                          {ticket.priority === "rush" && (
                            <span style={{ color: "#EF4444", fontSize: "0.6rem", fontWeight: 800, background: "#FEE2E2", padding: "1px 6px", borderRadius: "20px" }}>
                              URGENTE / RUSH
                            </span>
                          )}
                        </div>
                      </div>
                      <ElapsedTimer createdAt={ticket.createdAt} key={tick} />
                    </div>

                    {/* Items */}
                    <div style={{ padding: "10px 12px" }}>
                      {ticket.items.map((item) => (
                        <div key={item.id} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <span style={{ color: borderColor, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem", minWidth: "24px" }}>
                              {item.quantity}×
                            </span>
                            <div>
                              <p style={{ color: "#F5F5F5", fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</p>
                              {item.modifiers.map((m, mi) => (
                                <span key={mi} style={{ display: "inline-block", color: "#9CA3AF", background: "#1F1F1F", borderRadius: "6px", padding: "1px 6px", fontSize: "0.68rem", marginRight: "4px", marginTop: "2px" }}>
                                  {m}
                                </span>
                              ))}
                              {item.notes && (
                                <p style={{ color: "#F59E0B", fontSize: "0.68rem", fontWeight: 600, marginTop: "2px" }}>
                                  ⚠ {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: "0 10px 10px", display: "flex", gap: "6px" }}>
                      {status !== "ready" && (
                        <button
                          onClick={() => advance(ticket.id)}
                          style={{
                            flex: 1, padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: borderColor, color: "#000",
                            fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.78rem",
                          }}
                        >
                          {status === "pending" ? "→ Preparar / Start" : "→ Listo / Ready"}
                        </button>
                      )}
                      {status === "ready" && (
                        <button
                          onClick={() => bump(ticket.id)}
                          style={{
                            flex: 1, padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: "#4ADE80", color: "#000",
                            fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.78rem",
                          }}
                        >
                          ✓ Entregado / Delivered
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KDSNavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
        background: active ? "#F59E0B" : "#1F1F1F",
        color: active ? "#000" : "#9CA3AF",
        fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.75rem",
      }}
    >
      {icon}{label}
    </button>
  )
}
