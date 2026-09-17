import type { CartItem, PaymentRecord } from "../types"
import { WEEKLY_SALES } from "../data/mockData"
import { dateKeyCR } from "./format"
import { loadShiftLedger, loadShiftSnapshots } from "./staffSession"
import { listStaff, type StaffAccount } from "./staffDirectory"

export interface ReportSession {
  payments: PaymentRecord[]
  sentOrders: CartItem[]
}

export type ReportRange = "Hoy" | "7 días" | "30 días" | "Este mes"

export interface TenderTotals {
  apple: number
  google: number
  card: number
  sinpe: number
  unknown: number
}

export interface StaffReportRow {
  staffId: string
  name: string
  role: StaffAccount["role"]
  status: StaffAccount["status"]
  sales: number
  tips: number
  covers: number
  closedChecks: number
}

export interface DailyPoint {
  date: string
  label: string
  revenue: number
  orders: number
}

export interface HourlyPoint {
  hour: string
  revenue: number
}

export interface TopItemRow {
  name: string
  orders: number
  revenue: number
}

export interface AdminReport {
  range: ReportRange
  sales: number
  tips: number
  orders: number
  avgTicket: number | null
  daily: DailyPoint[]
  hourly: HourlyPoint[]
  topItems: TopItemRow[]
  staff: StaffReportRow[]
  tender: TenderTotals
  isLiveOnly: boolean
}

function startOfRange(range: ReportRange, now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (range === "Hoy") return d
  if (range === "7 días") {
    d.setDate(d.getDate() - 6)
    return d
  }
  if (range === "30 días") {
    d.setDate(d.getDate() - 29)
    return d
  }
  d.setDate(1)
  return d
}

function inRange(iso: string, from: Date, now: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= from.getTime() && t <= now.getTime()
}

function tenderOf(p: PaymentRecord): keyof TenderTotals {
  const m = p.tender
  if (m === "apple" || m === "google" || m === "card" || m === "sinpe") return m
  return "unknown"
}

function hourLabel(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const suffix = h >= 12 ? "pm" : "am"
  const h12 = h % 12 || 12
  return `${h12}${suffix}`
}

export function buildAdminReport(
  sessions: ReportSession[],
  range: ReportRange,
  now = new Date()
): AdminReport {
  const from = startOfRange(range, now)
  const payments: PaymentRecord[] = []
  const items: CartItem[] = []

  for (const session of sessions) {
    for (const p of session.payments) {
      if (inRange(p.paidAt, from, now)) payments.push(p)
    }
    if (session.sentOrders.length > 0 && session.payments.some((p) => inRange(p.paidAt, from, now))) {
      items.push(...session.sentOrders)
    }
  }

  const ledger = loadShiftLedger().filter((c) => inRange(c.closedAt, from, now))
  for (const check of ledger) {
    for (const p of check.payments) {
      if (inRange(p.paidAt, from, now)) {
        payments.push({
          id: `${check.id}-${p.paidAt}`,
          guestId: "ledger",
          guestName: "Cuenta",
          amount: p.amount,
          tipAmount: p.tipAmount,
          splitMethod: "full",
          paidAt: p.paidAt,
          receiptCycle: 1,
        })
      }
    }
  }

  const sales = payments.reduce((s, p) => s + p.amount, 0)
  const tips = payments.reduce((s, p) => s + p.tipAmount, 0)
  const orders = payments.length
  const avgTicket = orders > 0 ? Math.round(sales / orders) : null

  const tender: TenderTotals = { apple: 0, google: 0, card: 0, sinpe: 0, unknown: 0 }
  for (const p of payments) tender[tenderOf(p)] += p.amount + p.tipAmount

  const hourlyMap = new Map<string, number>()
  for (const p of payments) {
    const key = hourLabel(p.paidAt)
    hourlyMap.set(key, (hourlyMap.get(key) ?? 0) + p.amount)
  }
  const hourly: HourlyPoint[] = [...hourlyMap.entries()].map(([hour, revenue]) => ({ hour, revenue }))

  const itemMap = new Map<string, TopItemRow>()
  for (const item of items) {
    const row = itemMap.get(item.name) ?? { name: item.name, orders: 0, revenue: 0 }
    row.orders += item.quantity
    row.revenue += item.totalPrice * item.quantity
    itemMap.set(item.name, row)
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 5)

  const snapshots = loadShiftSnapshots().filter((s) => inRange(s.clockedOutAt, from, now))
  const staffMap = new Map<string, StaffReportRow>()
  for (const snap of snapshots) {
    const row = staffMap.get(snap.staffId) ?? {
      staffId: snap.staffId,
      name: snap.staffName,
      role: snap.role,
      status: "active" as const,
      sales: 0,
      tips: 0,
      covers: 0,
      closedChecks: 0,
    }
    row.sales += snap.sales
    row.tips += snap.tips
    row.covers += snap.covers
    row.closedChecks += snap.closedChecks
    staffMap.set(snap.staffId, row)
  }

  const directory = listStaff(true)
  for (const member of directory) {
    if (member.role === "manager") continue
    if (!staffMap.has(member.id)) {
      staffMap.set(member.id, {
        staffId: member.id,
        name: member.name,
        role: member.role,
        status: member.status,
        sales: 0,
        tips: 0,
        covers: 0,
        closedChecks: 0,
      })
    } else {
      const row = staffMap.get(member.id)!
      row.status = member.status
      row.name = member.name
      row.role = member.role
    }
  }

  const daily = buildDailySeries(range, now, payments)

  return {
    range,
    sales,
    tips,
    orders,
    avgTicket,
    daily,
    hourly,
    topItems,
    staff: [...staffMap.values()].sort((a, b) => b.sales - a.sales),
    tender,
    isLiveOnly: payments.length > 0 || snapshots.length > 0,
  }
}

function buildDailySeries(range: ReportRange, now: Date, payments: PaymentRecord[]): DailyPoint[] {
  if (range === "Hoy") {
    return [
      {
        date: dateKeyCR(now),
        label: "Hoy",
        revenue: payments.reduce((s, p) => s + p.amount, 0),
        orders: payments.length,
      },
    ]
  }

  const liveByDay = new Map<string, { revenue: number; orders: number }>()
  for (const p of payments) {
    const key = dateKeyCR(p.paidAt)
    const row = liveByDay.get(key) ?? { revenue: 0, orders: 0 }
    row.revenue += p.amount
    row.orders += 1
    liveByDay.set(key, row)
  }

  if (range === "7 días") {
    return WEEKLY_SALES.map((d, i) => {
      const isToday = i === WEEKLY_SALES.length - 1
      if (isToday) {
        const todayKey = dateKeyCR(now)
        const live = liveByDay.get(todayKey)
        return {
          date: todayKey,
          label: d.date,
          revenue: live?.revenue ?? 0,
          orders: live?.orders ?? 0,
        }
      }
      return { date: d.date, label: d.date, revenue: d.revenue, orders: d.orders }
    })
  }

  const days = range === "30 días" ? 30 : now.getDate()
  const points: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = dateKeyCR(d)
    const live = liveByDay.get(key)
    points.push({
      date: key,
      label: d.toLocaleDateString("es-CR", { day: "numeric", month: "short" }),
      revenue: live?.revenue ?? 0,
      orders: live?.orders ?? 0,
    })
  }
  return points
}

export function reportToCsv(report: AdminReport): string {
  const lines = [
    "Métrica,Valor",
    `Rango,${report.range}`,
    `Ventas,${report.sales}`,
    `Propinas,${report.tips}`,
    `Pagos,${report.orders}`,
    `Ticket promedio,${report.avgTicket ?? 0}`,
    "",
    "Medio,Monto",
    `Apple Pay,${report.tender.apple}`,
    `Google Pay,${report.tender.google}`,
    `Tarjeta,${report.tender.card}`,
    `SINPE,${report.tender.sinpe}`,
    `Sin clasificar,${report.tender.unknown}`,
    "",
    "Personal,Ventas,Propinas,Covers,Cuentas",
    ...report.staff.map(
      (s) => `${s.name},${s.sales},${s.tips},${s.covers},${s.closedChecks}`
    ),
  ]
  return lines.join("\n")
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
