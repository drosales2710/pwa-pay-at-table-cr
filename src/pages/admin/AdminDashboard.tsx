import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, Users, ShoppingBag, Wallet } from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import { formatCRC, formatCRCShort } from "../../utils/format"
import { getAdminSession } from "../../utils/adminSession"
import { getOpenStaffShift } from "../../utils/staffSession"

export default function AdminDashboard() {
  const { restaurant, allTables, listTableSessions } = useGuest()
  const admin = getAdminSession()
  const shift = getOpenStaffShift()
  const sessions = listTableSessions()
  const payments = sessions.flatMap((s) => s.payments)

  const todaySales = payments.reduce((s, p) => s + p.amount, 0)
  const todayTips = payments.reduce((s, p) => s + p.tipAmount, 0)
  const activeTables = allTables.filter((t) => t.status === "open" || t.status === "processing")
  const available = allTables.filter((t) => t.status === "available").length

  const hourly = buildHourly(payments)

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
          Dashboard <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Overview</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
          {restaurant.name} · {new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
          {admin ? ` · ${admin.staffName}` : ""}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Ventas hoy", labelEn: "Today's Revenue", value: formatCRC(todaySales), delta: `${payments.length} pagos / payments`, icon: <TrendingUp size={20} />, color: "#1E40AF", bg: "#EFF6FF" },
          { label: "Propinas hoy", labelEn: "Tips today", value: formatCRC(todayTips), delta: "Voluntarias / Voluntary", icon: <Wallet size={20} />, color: "#059669", bg: "#ECFDF5" },
          { label: "Mesas activas", labelEn: "Active Tables", value: `${activeTables.length}`, delta: `${available} disponibles / available`, icon: <Users size={20} />, color: "#D97706", bg: "#FFFBEB" },
          { label: "Turno abierto", labelEn: "Open shift", value: shift ? shift.staffName.split(" ")[0] : "—", delta: shift ? "En piso / On floor" : "Nadie clock-in / No one clocked in", icon: <ShoppingBag size={20} />, color: "#7C3AED", bg: "#F5F3FF" },
        ].map((card) => (
          <div key={card.label} style={{ background: "#FFFFFF", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              {card.icon}
            </div>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.35rem", color: "#0F172A", lineHeight: 1 }}>{card.value}</p>
            <p style={{ color: "#0F172A", fontSize: "0.82rem", fontWeight: 600, marginTop: "4px" }}>{card.label}</p>
            <p style={{ color: "#64748B", fontSize: "0.68rem" }}>{card.delta} · {card.labelEn}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0", marginBottom: "24px" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "4px" }}>
          Tendencia de ventas <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Revenue Trend</span>
        </p>
        <p style={{ color: "#64748B", fontSize: "0.72rem", marginBottom: "16px" }}>Pagos de hoy por hora / Today's payments by hour</p>
        {hourly.every((h) => h.revenue === 0) ? (
          <p style={{ color: "#94A3B8", fontSize: "0.85rem", padding: "40px 0", textAlign: "center" }}>
            Aún no hay pagos hoy / No payments yet today
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hourly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [formatCRCShort(Number(v)), "Ventas"]}
                contentStyle={{ background: "#1E40AF", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.75rem" }}
                itemStyle={{ color: "#BFDBFE" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#1E40AF" strokeWidth={2.5} dot={{ fill: "#1E40AF", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "16px" }}>
          Mesas activas ahora <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Currently Active Tables</span>
        </p>
        {activeTables.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "0.85rem" }}>No hay mesas abiertas en el piso en vivo / No live tables are open</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
            {activeTables.map((table) => {
              const statusColor = table.status === "processing" ? "#D97706" : "#DC2626"
              const statusBg = table.status === "processing" ? "#FFFBEB" : "#FEF2F2"
              return (
                <div key={table.id} style={{ border: `1px solid ${statusColor}33`, borderRadius: "10px", padding: "12px", borderLeft: `3px solid ${statusColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#0F172A" }}>#{table.number}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: statusColor, background: statusBg, padding: "2px 6px", borderRadius: "20px" }}>
                      {table.status === "processing" ? "PAGANDO" : "ACTIVA"}
                    </span>
                  </div>
                  <p style={{ color: "#64748B", fontSize: "0.7rem" }}>{table.guestCount} pax · {table.server?.split(" ")[0] ?? "—"}</p>
                  <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#0F172A", marginTop: "4px" }}>
                    {formatCRCShort(table.billTotal)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function buildHourly(payments: Array<{ amount: number; paidAt: string }>) {
  const map = new Map<string, number>()
  for (const p of payments) {
    const h = new Date(p.paidAt).getHours()
    const label = `${h % 12 || 12}${h >= 12 ? "pm" : "am"}`
    map.set(label, (map.get(label) ?? 0) + p.amount)
  }
  if (map.size === 0) return [{ hour: "—", revenue: 0 }]
  return [...map.entries()].map(([hour, revenue]) => ({ hour, revenue }))
}
