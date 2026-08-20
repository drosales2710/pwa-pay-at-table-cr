import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, Users, ShoppingBag, Star, ArrowUpRight } from "lucide-react"
import { WEEKLY_SALES, TOP_ITEMS, MOCK_TABLES, formatCRCShort } from "../../data/mockData"
import { formatCRC } from "../../utils/format"

const activeTables = MOCK_TABLES.filter((t) => ["open", "processing"].includes(t.status))

export default function AdminDashboard() {
  const todayRevenue = WEEKLY_SALES[WEEKLY_SALES.length - 1].revenue
  const yesterdayRevenue = WEEKLY_SALES[WEEKLY_SALES.length - 2].revenue
  const revDelta = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
  const weekTotal = WEEKLY_SALES.reduce((sum, d) => sum + d.revenue, 0)
  const weekOrders = WEEKLY_SALES.reduce((sum, d) => sum + d.orders, 0)

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
          Dashboard <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Overview</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
          La Terraza · {new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          {
            label: "Ventas hoy", labelEn: "Today's Revenue",
            value: formatCRC(todayRevenue),
            delta: `+${revDelta}% vs ayer`,
            icon: <TrendingUp size={20} />,
            color: "#1E40AF",
            bg: "#EFF6FF",
          },
          {
            label: "Semana actual", labelEn: "This Week",
            value: formatCRCShort(weekTotal),
            delta: `${weekOrders} órdenes`,
            icon: <ShoppingBag size={20} />,
            color: "#7C3AED",
            bg: "#F5F3FF",
          },
          {
            label: "Mesas activas", labelEn: "Active Tables",
            value: `${activeTables.length}`,
            delta: `${MOCK_TABLES.filter((t) => t.status === "available").length} disponibles`,
            icon: <Users size={20} />,
            color: "#059669",
            bg: "#ECFDF5",
          },
          {
            label: "Rating promedio", labelEn: "Avg Rating",
            value: "4.6",
            delta: "Últimas 7 noches",
            icon: <Star size={20} />,
            color: "#D97706",
            bg: "#FFFBEB",
          },
        ].map((card) => (
          <div key={card.label} style={{ background: "#FFFFFF", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {card.icon}
              </div>
              <ArrowUpRight size={16} color="#94A3B8" />
            </div>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.35rem", color: "#0F172A", lineHeight: 1 }}>{card.value}</p>
            <p style={{ color: "#0F172A", fontSize: "0.82rem", fontWeight: 600, marginTop: "4px" }}>{card.label}</p>
            <p style={{ color: "#64748B", fontSize: "0.68rem" }}>{card.delta} · {card.labelEn}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Revenue trend */}
        <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "4px" }}>
            Tendencia de ventas <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Revenue Trend</span>
          </p>
          <p style={{ color: "#64748B", fontSize: "0.72rem", marginBottom: "16px" }}>Últimos 7 días / Last 7 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={WEEKLY_SALES} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [formatCRCShort(Number(v)), "Ventas"]}
                contentStyle={{ background: "#1E40AF", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.75rem" }}
                itemStyle={{ color: "#BFDBFE" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#1E40AF" strokeWidth={2.5} dot={{ fill: "#1E40AF", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top items */}
        <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "4px" }}>
            Artículos top <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Top Items</span>
          </p>
          <p style={{ color: "#64748B", fontSize: "0.72rem", marginBottom: "16px" }}>Por ventas esta semana / By orders this week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TOP_ITEMS} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(v) => [Number(v), "Unidades"]}
                contentStyle={{ background: "#0F172A", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.75rem" }}
              />
              <Bar dataKey="orders" fill="#1E40AF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active tables grid */}
      <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "16px" }}>
          Mesas activas ahora <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Currently Active Tables</span>
        </p>
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
                <p style={{ color: "#64748B", fontSize: "0.7rem" }}>{table.guestCount} pax · {table.server?.split(" ")[0]}</p>
                <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#0F172A", marginTop: "4px" }}>
                  {formatCRCShort(table.billTotal)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
