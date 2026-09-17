import { useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  TrendingUp,
  Users,
  Wallet,
  Receipt,
  TriangleAlert,
  X,
} from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import { formatCRC, formatCRCShort } from "../../utils/format"
import {
  canCloseShift,
  computeShiftStats,
  computeTeamAverage,
} from "../../utils/shiftStats"
import {
  closeStaffShift,
  getOpenStaffShift,
  getPersonInitials,
  getTodaysClosedSnapshots,
  loadShiftLedger,
  STAFF_ROLE_LABELS,
} from "../../utils/staffSession"

export default function ShiftSummary() {
  const navigate = useNavigate()
  const { allTables, guardianQueue, listTableSessions, restaurant } = useGuest()
  const shift = getOpenStaffShift()
  const [now, setNow] = useState(() => Date.now())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    if (!shift) return null
    const pendingTableIds = guardianQueue
      .filter((q) => q.status === "pending")
      .map((q) => q.tableId)
    return computeShiftStats({
      shift,
      sessions: listTableSessions(),
      tables: allTables,
      ledger: loadShiftLedger(),
      pendingTableIds,
      now: new Date(now),
    })
  }, [shift, listTableSessions, allTables, guardianQueue, now])

  const teamAvg = useMemo(() => {
    if (!shift) return null
    return computeTeamAverage(getTodaysClosedSnapshots(restaurant.id, shift.shiftId))
  }, [shift, restaurant.id])

  if (!shift || !stats) {
    return <Navigate to="/server/login" replace />
  }

  const closeAllowed = canCloseShift(stats)
  const maxTip = Math.max(...stats.tipBuckets.map((b) => b.tips), 1)
  const comparisonMax = teamAvg ? Math.max(stats.sales, teamAvg.sales, 1) : 1

  const handleConfirmClose = () => {
    if (!closeAllowed || closing) return
    setClosing(true)
    closeStaffShift({
      sales: stats.sales,
      tips: stats.tips,
      covers: stats.covers,
      closedChecks: stats.closedChecks,
      avgTicket: stats.avgTicket,
    })
    navigate("/server/login", { replace: true })
  }

  const metrics = [
    {
      label: "Ventas cobradas",
      value: formatCRC(stats.sales),
      icon: <TrendingUp size={16} />,
      color: "var(--color-server)",
    },
    {
      label: "Propinas voluntarias",
      value: formatCRC(stats.tips),
      icon: <Wallet size={16} />,
      color: "var(--color-confirm-green)",
    },
    {
      label: "Comensales",
      value: `${stats.covers} pax`,
      icon: <Users size={16} />,
      color: "var(--color-accent)",
    },
    {
      label: "Ticket promedio",
      value: stats.avgTicket != null ? formatCRCShort(stats.avgTicket) : "—",
      icon: <Receipt size={16} />,
      color: "var(--color-info)",
    },
  ]

  return (
    <div className="flex justify-center items-start min-h-screen bg-phone-frame">
      <div className="relative w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        <header className="safe-top bg-card border-b border-border px-5 pt-5 pb-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/server/floor-plan")}
              className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:scale-95 transition-transform"
              aria-label="Volver al plano"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 space-y-0.5">
              <h1 className="text-title text-foreground">Mi turno</h1>
              <p className="text-caption text-muted-foreground">
                {shift.staffName} · {stats.clockedInLabel} → ahora
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 pb-28">
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-server font-display font-extrabold" style={{ fontSize: "1.1rem" }}>
                {getPersonInitials(shift.staffName)}
              </div>
              <div className="min-w-0">
                <p className="text-subhead text-foreground truncate">{shift.staffName}</p>
                <p className="text-caption text-muted-foreground">
                  {STAFF_ROLE_LABELS[shift.role]} · {stats.hoursWorkedLabel} trabajadas
                </p>
              </div>
            </div>

            {stats.isEmpty && (
              <p className="text-caption text-muted-foreground mb-3 rounded-xl bg-muted px-3 py-2">
                Aún no hay ventas en este turno. Los cobros y propinas aparecerán aquí al cerrar mesas.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {metrics.map((s) => (
                <div key={s.label} className="bg-muted rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                    {s.icon}
                    <span className="text-micro font-bold">{s.label}</span>
                  </div>
                  <p className="text-numeral text-foreground" style={{ fontSize: "1.05rem" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-micro text-muted-foreground mt-3">
              Las propinas son voluntarias. El 10% de servicio (Ley 1802) no se incluye aquí.
            </p>
          </div>

          {stats.openTables.length > 0 && (
            <div className="bg-card rounded-2xl border border-status-yellow/40 p-4 mb-4">
              <p className="text-subhead text-foreground mb-2">Mesas abiertas</p>
              <p className="text-caption text-muted-foreground mb-3">
                {formatCRC(stats.openBillTotal)} pendientes de cobro
              </p>
              <div className="flex flex-col gap-2">
                {stats.openTables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => navigate(`/server/table/${table.id}`)}
                    className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left active:scale-[0.99]"
                  >
                    <span className="text-caption font-semibold text-foreground">Mesa {table.number}</span>
                    <span className="text-caption text-muted-foreground">
                      {table.guestCount} pax · {formatCRCShort(table.billTotal)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stats.pendingApprovals > 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-status-yellow/40 bg-status-yellow-light px-4 py-3 mb-4">
              <TriangleAlert size={16} className="text-status-yellow mt-0.5 flex-shrink-0" />
              <p className="text-caption text-foreground">
                {stats.pendingApprovals === 1
                  ? "Hay 1 pedido por aprobar."
                  : `Hay ${stats.pendingApprovals} pedidos por aprobar.`}
              </p>
            </div>
          )}

          {teamAvg && (
            <div className="bg-card rounded-2xl border border-border p-4 mb-4">
              <p className="text-label text-muted-foreground mb-3">Comparación con el equipo</p>
              <p className="text-micro text-muted-foreground mb-3">
                Promedio anónimo de {teamAvg.peerCount === 1 ? "1 turno cerrado hoy" : `${teamAvg.peerCount} turnos cerrados hoy`}.
              </p>
              {[
                { label: "Tus ventas", value: stats.sales, bar: stats.sales / comparisonMax },
                { label: "Promedio del equipo", value: teamAvg.sales, bar: teamAvg.sales / comparisonMax },
              ].map((row) => (
                <div key={row.label} className="mb-2 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-caption text-muted-foreground">{row.label}</span>
                    <span className="text-caption font-bold text-foreground">{formatCRCShort(row.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-server"
                      style={{ width: `${Math.max(4, Math.min(100, row.bar * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <p className="text-subhead text-foreground mb-3">Propinas del turno</p>
            {stats.tipBuckets.map((t) => (
              <div key={t.label} className="flex items-center gap-3 mb-2 last:mb-0">
                <span className="text-caption text-muted-foreground w-28 flex-shrink-0">{t.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-status-green"
                    style={{ width: `${Math.max(t.tips > 0 ? 6 : 0, (t.tips / maxTip) * 100)}%` }}
                  />
                </div>
                <span className="text-caption font-bold text-foreground w-12 text-right">
                  {formatCRCShort(t.tips)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3 flex justify-between">
              <span className="text-subhead text-foreground">Total propinas</span>
              <span className="text-numeral text-status-green" style={{ fontSize: "1rem" }}>
                {formatCRC(stats.tips)}
              </span>
            </div>
          </div>
        </div>

        <div className="safe-bottom border-t border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full py-4 rounded-2xl text-white bg-server font-display font-bold active:scale-[0.99] transition-transform"
            style={{ fontSize: "1rem" }}
          >
            Cerrar turno
          </button>
        </div>

        {sheetOpen && (
          <div
            className="absolute inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(28,25,23,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !closing) setSheetOpen(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-shift-title"
              className="w-full bg-card rounded-t-3xl p-5 pb-8 shadow-modal"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 id="close-shift-title" className="text-title text-foreground">
                  {closeAllowed ? "Confirmar cierre" : "No puedes cerrar todavía"}
                </h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              {closeAllowed ? (
                <>
                  <p className="text-caption text-muted-foreground mb-4">
                    Se registra el reporte de {shift.staffName} y se cierra la sesión.
                  </p>
                  <div className="rounded-2xl bg-muted p-4 mb-5 space-y-2">
                    <Row label="Tiempo" value={stats.hoursWorkedLabel} />
                    <Row label="Ventas cobradas" value={formatCRC(stats.sales)} />
                    <Row label="Propinas" value={formatCRC(stats.tips)} />
                    <Row label="Cuentas cerradas" value={`${stats.closedChecks}`} />
                    <Row label="Comensales" value={`${stats.covers} pax`} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      className="flex-1 py-3.5 rounded-2xl bg-muted text-foreground font-display font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClose}
                      disabled={closing}
                      className="flex-1 py-3.5 rounded-2xl bg-server text-white font-display font-bold"
                    >
                      {closing ? "Cerrando…" : "Cerrar turno"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-caption text-muted-foreground mb-4">
                    Cierra o transfiere las mesas abiertas y aprueba los pedidos pendientes antes de terminar el turno.
                  </p>
                  {stats.openTables.length > 0 && (
                    <ul className="rounded-2xl bg-muted p-4 mb-3 space-y-1">
                      {stats.openTables.map((table) => (
                        <li key={table.id} className="text-caption text-foreground">
                          Mesa {table.number} · {formatCRC(table.billTotal)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {stats.pendingApprovals > 0 && (
                    <p className="text-caption text-foreground mb-4">
                      Pedidos por aprobar: {stats.pendingApprovals}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/server/floor-plan")}
                    className="w-full py-3.5 rounded-2xl bg-server text-white font-display font-bold"
                  >
                    Ir al plano
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="text-caption font-bold text-foreground">{value}</span>
    </div>
  )
}
