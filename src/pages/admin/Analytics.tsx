import { useState } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Download, TrendingUp, TrendingDown } from "lucide-react"
import { WEEKLY_SALES, TOP_ITEMS, HOURLY_TODAY, STAFF, formatCRCShort } from "../../data/mockData"
import { formatCRC } from "../../utils/format"

const RANGES = ["Hoy", "7 días", "30 días", "Este mes"]

export default function Analytics() {
  const [range, setRange] = useState("7 días")

  const totalRev = WEEKLY_SALES.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = WEEKLY_SALES.reduce((s, d) => s + d.orders, 0)
  const avgTicket = Math.round(totalRev / totalOrders)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Reportes <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Analytics</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>Desempeño del restaurante / Restaurant performance</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
          <Download size={15} /> Exportar CSV / Export
        </button>
      </div>

      {/* Date range selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)}
            style={{
              padding: "7px 16px", borderRadius: "20px", border: "1px solid",
              borderColor: range === r ? "#1E40AF" : "#E2E8F0",
              background: range === r ? "#1E40AF" : "#fff",
              color: range === r ? "#fff" : "#475569",
              fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
            }}>
            {r}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Ingresos totales", labelEn: "Total Revenue", value: formatCRC(totalRev), change: "+8.4%", up: true },
          { label: "Órdenes totales", labelEn: "Total Orders", value: `${totalOrders}`, change: "+5.1%", up: true },
          { label: "Ticket promedio", labelEn: "Avg Ticket", value: formatCRCShort(avgTicket), change: "-2.3%", up: false },
        ].map((c) => (
          <div key={c.label} style={{ background: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#0F172A" }}>{c.value}</p>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>{c.label}</p>
            <p style={{ fontSize: "0.68rem", color: "#64748B" }}>{c.labelEn}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              {c.up ? <TrendingUp size={13} color="#059669" /> : <TrendingDown size={13} color="#DC2626" />}
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.up ? "#059669" : "#DC2626" }}>{c.change} vs período anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "16px" }}>
          Ingresos por día <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Daily Revenue</span>
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={WEEKLY_SALES} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v) => [formatCRCShort(Number(v)), "Ingresos"]}
              contentStyle={{ background: "#1E40AF", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.75rem" }}
              itemStyle={{ color: "#BFDBFE" }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#1E40AF" strokeWidth={2.5} dot={{ fill: "#1E40AF", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly & Top items row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "16px" }}>
            Ventas por hora <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Hourly Sales</span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={HOURLY_TODAY} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [formatCRCShort(Number(v)), "Ventas"]}
                contentStyle={{ background: "#0F172A", border: "none", borderRadius: "8px", color: "#fff", fontSize: "0.72rem" }}
              />
              <Bar dataKey="revenue" fill="#1E40AF" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "16px" }}>
            Artículos top <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Top Items</span>
          </p>
          {TOP_ITEMS.map((item, i) => (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.88rem", color: "#1E40AF", minWidth: "18px" }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0F172A" }}>{item.name}</p>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748B" }}>{item.orders}</p>
                </div>
                <div style={{ height: "4px", background: "#F1F5F9", borderRadius: "2px" }}>
                  <div style={{ height: "100%", borderRadius: "2px", background: "#1E40AF", width: `${(item.orders / TOP_ITEMS[0].orders) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff performance table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>
            Rendimiento del equipo <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.75rem" }}>/ Server Performance</span>
          </p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Mesero / Server", "Ventas / Sales", "Propinas / Tips", "Covers", "⭐ Rating"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.filter((s) => s.role !== "manager").map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < 2 ? "1px solid #F1F5F9" : "none" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#EFF6FF", color: "#1E40AF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.72rem" }}>
                      {s.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{s.name}</p>
                      <p style={{ fontSize: "0.68rem", color: "#94A3B8" }}>{s.role}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#0F172A" }}>{formatCRCShort(s.salesTotal)}</p>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#059669" }}>{formatCRCShort(s.tipsToday)}</p>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <p style={{ fontSize: "0.85rem", color: "#475569" }}>{s.covers} pax</p>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#FFFBEB", padding: "3px 8px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, color: "#92400E" }}>
                    ⭐ {s.avgRating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
