import { useNavigate } from "react-router-dom"
import { ChevronLeft, TrendingUp, Star, Users, DollarSign, Clock } from "lucide-react"
import { STAFF, formatCRCShort } from "../../data/mockData"
import { formatCRC } from "../../utils/format"
import PortalSwitcher from "../../components/PortalSwitcher"

export default function ShiftSummary() {
  const navigate = useNavigate()
  const currentStaff = STAFF[0]
  const shiftStart = "11:00 AM"
  const shiftHours = "8h 45m"

  return (
    <div className="flex justify-center items-start min-h-screen" style={{ background: "#E5E0DA" }}>
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        <header className="safe-top bg-card border-b border-border px-5 pt-5 pb-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/server/floor-plan")} className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:scale-95 transition-transform">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 space-y-0.5">
              <h1 className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.2 }}>
                Resumen de turno <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.78rem" }}>/ Shift Summary</span>
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{currentStaff.name} · {shiftStart} → Ahora</p>
            </div>
            <PortalSwitcher />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 pb-28">
          {/* Personal summary */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: "#6366F1", fontSize: "1.2rem", fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>
                {currentStaff.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}>{currentStaff.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{currentStaff.role} · {shiftHours} trabajadas / worked</p>
              </div>
              <div className="ml-auto flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-full">
                <Star size={13} fill="#F59E0B" className="text-status-yellow" />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400E" }}>{currentStaff.avgRating}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Ventas totales", labelEn: "Total Sales", value: formatCRC(currentStaff.salesTotal), icon: <TrendingUp size={16} />, color: "#6366F1" },
                { label: "Propinas", labelEn: "Tips Earned", value: formatCRC(currentStaff.tipsToday), icon: <DollarSign size={16} />, color: "#16A34A" },
                { label: "Comensales", labelEn: "Covers", value: `${currentStaff.covers} pax`, icon: <Users size={16} />, color: "#F97316" },
                { label: "Ticket promedio", labelEn: "Avg Ticket", value: formatCRCShort(Math.round(currentStaff.salesTotal / currentStaff.covers)), icon: <Clock size={16} />, color: "#0891B2" },
              ].map((s) => (
                <div key={s.label} className="bg-muted rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                    {s.icon}
                    <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>{s.label}</span>
                  </div>
                  <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>{s.value}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.62rem" }}>{s.labelEn}</p>
                </div>
              ))}
            </div>
          </div>

          {/* All servers comparison */}
          <div className="mb-4">
            <p className="text-muted-foreground mb-2" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              RENDIMIENTO DEL EQUIPO / TEAM PERFORMANCE
            </p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {STAFF.filter((s) => s.role !== "manager").map((s, i) => (
                <div key={s.id} className={`px-4 py-3.5 flex items-center gap-3 ${i < 2 ? "border-b border-border" : ""}`}>
                  <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center flex-shrink-0" style={{ background: "#6366F1", fontSize: "0.75rem", fontWeight: 800 }}>
                    {s.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{s.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1.5 rounded-full bg-muted flex-1">
                        <div className="h-full rounded-full" style={{ width: `${(s.salesTotal / 200000) * 100}%`, background: "#6366F1" }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>
                      {formatCRCShort(s.salesTotal)}
                    </p>
                    <div className="flex items-center justify-end gap-0.5">
                      <Star size={10} fill="#F59E0B" className="text-status-yellow" />
                      <span style={{ fontSize: "0.65rem", color: "#78716C" }}>{s.avgRating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip breakdown */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <p className="text-foreground mb-3" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
              Propinas del turno · Shift Tips
            </p>
            {[
              { hour: "12pm–2pm", tips: 8400, orders: 18 },
              { hour: "2pm–6pm", tips: 4200, orders: 11 },
              { hour: "6pm–now", tips: 5600, orders: 13 },
            ].map((t) => (
              <div key={t.hour} className="flex items-center gap-3 mb-2">
                <span className="text-muted-foreground w-20" style={{ fontSize: "0.75rem" }}>{t.hour}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-status-green" style={{ width: `${(t.tips / 9000) * 100}%` }} />
                </div>
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.78rem" }}>
                  {formatCRCShort(t.tips)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3 flex justify-between">
              <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>Total propinas</span>
              <span className="text-status-green" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}>
                {formatCRC(currentStaff.tipsToday)}
              </span>
            </div>
          </div>
        </div>

        {/* Close shift */}
        <div className="safe-bottom border-t border-border bg-card px-4 py-3">
          <button
            onClick={() => navigate("/server/login")}
            className="w-full py-4 rounded-2xl text-white"
            style={{ background: "#6366F1", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}
          >
            Cerrar turno · End Shift
          </button>
        </div>
      </div>
    </div>
  )
}
