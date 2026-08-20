import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Wine, CreditCard, AlertTriangle } from "lucide-react"
import PortalSwitcher from "../../components/PortalSwitcher"
import { elapsedMins, type KDSStatus } from "../../data/mockData"
import { useGuest } from "../../context/GuestContext"

function ElapsedTimer({ createdAt }: { createdAt: Date }) {
  const [mins, setMins] = useState(elapsedMins(createdAt))
  useEffect(() => {
    const id = setInterval(() => setMins(elapsedMins(createdAt)), 30000)
    return () => clearInterval(id)
  }, [createdAt])
  const color = mins >= 10 ? "#EF4444" : mins >= 5 ? "#F59E0B" : "#4ADE80"
  return (
    <span style={{ color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.85rem" }}>
      {mins < 1 ? "< 1" : mins}m
      {mins >= 5 && <AlertTriangle size={12} className="inline ml-1" />}
    </span>
  )
}

export default function BarKDS() {
  const navigate = useNavigate()
  const { restaurant, kdsTickets, advanceKdsTicket, bumpKdsTicket } = useGuest()
  const tickets = kdsTickets.filter((t) => t.station === "bar" && t.status !== "delivered")

  const advance = (id: string) => advanceKdsTicket(id)
  const bump = (id: string) => bumpKdsTicket(id)

  const byStatus = (s: KDSStatus) => tickets.filter((t) => t.status === s)

  const COLS: { status: KDSStatus; label: string; color: string; bg: string }[] = [
    { status: "pending",   label: "Pendiente / Pending",    color: "#F59E0B", bg: "#78350F" },
    { status: "preparing", label: "Preparando / Preparing", color: "#60A5FA", bg: "#1E3A5F" },
    { status: "ready",     label: "Listo / Ready",          color: "#4ADE80", bg: "#14532D" },
  ]

  return (
    <div style={{ minHeight: "100svh", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#111111", borderBottom: "1px solid #2A2A2A", padding: "18px 28px", display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Wine size={24} color="#60A5FA" />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <p style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.2 }}>
              KDS Barra <span style={{ color: "#6B7280", fontWeight: 400, fontSize: "0.8rem" }}>/ Bar</span>
            </p>
            <p style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 500 }}>{restaurant.name} · {new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <PortalSwitcher />
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          {[
            { icon: <ChefHat size={15} />, label: "Cocina", path: "/kds/kitchen" },
            { icon: <Wine size={15} />, label: "Barra", path: "/kds/bar", active: true },
            { icon: <CreditCard size={15} />, label: "Caja", path: "/kds/cashier" },
          ].map((b) => (
            <button key={b.label} onClick={() => navigate(b.path)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: b.active ? "#60A5FA" : "#1F1F1F", color: b.active ? "#000" : "#9CA3AF",
                fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.75rem" }}>
              {b.icon}{b.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", padding: "28px", overflowY: "auto" }}>
        {COLS.map(({ status, label, color, bg }) => (
          <div key={status}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "8px 12px", borderRadius: "10px", background: bg + "60" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
              <span style={{ color, fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.82rem" }}>{label}</span>
              <span style={{ marginLeft: "auto", color, fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>{byStatus(status).length}</span>
            </div>

            {byStatus(status).length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#374151", fontSize: "0.78rem" }}>Sin tickets</div>
            )}

            {byStatus(status).map((ticket) => (
              <div key={ticket.id} style={{ background: "#141414", border: `2px solid ${color}`, borderRadius: "12px", marginBottom: "10px", overflow: "hidden" }}>
                <div style={{ background: color + "22", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#F5F5F5", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem" }}>#{ticket.tableNumber}</span>
                  <ElapsedTimer createdAt={ticket.createdAt} />
                </div>
                <div style={{ padding: "10px 12px" }}>
                  {ticket.items.map((item) => (
                    <div key={item.id} style={{ marginBottom: "6px", display: "flex", gap: "8px" }}>
                      <span style={{ color, fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>{item.quantity}×</span>
                      <div>
                        <p style={{ color: "#F5F5F5", fontSize: "0.85rem", fontWeight: 600 }}>{item.name}</p>
                        {item.modifiers.map((m, mi) => (
                          <span key={mi} style={{ color: "#9CA3AF", background: "#1F1F1F", borderRadius: "6px", padding: "1px 6px", fontSize: "0.65rem", marginRight: "3px" }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "0 10px 10px" }}>
                  {status !== "ready" ? (
                    <button onClick={() => advance(ticket.id)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer",
                        background: color, color: "#000", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.78rem" }}>
                      {status === "pending" ? "→ Preparar / Start" : "→ Listo / Ready"}
                    </button>
                  ) : (
                    <button onClick={() => bump(ticket.id)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer",
                        background: "#4ADE80", color: "#000", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.78rem" }}>
                      ✓ Servido / Served
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
