import type { TableLifecycleStatus } from "../types"
import type { TableRecord } from "../data/mockData"
import { formatDuration, formatTimeCR } from "./format"
import {
  type ClosedCheckRecord,
  type ShiftSnapshot,
  type StaffShiftSession,
} from "./staffSession"

export interface ShiftPaymentLike {
  amount: number
  tipAmount: number
  paidAt: string
}

export interface ShiftGuestLike {
  guestId: string
}

export interface ShiftSessionLike {
  tableId: string
  sessionId: string
  lifecycle: TableLifecycleStatus
  closedAt: string | null
  guests: ShiftGuestLike[]
  payments: ShiftPaymentLike[]
  serverId?: string | null
}

export interface OpenShiftTable {
  id: string
  number: number
  status: TableRecord["status"]
  billTotal: number
  guestCount: number
}

export interface TipBucket {
  label: string
  tips: number
}

export interface ShiftStats {
  sales: number
  tips: number
  covers: number
  closedChecks: number
  avgTicket: number | null
  openBillTotal: number
  openTables: OpenShiftTable[]
  pendingApprovals: number
  tipBuckets: TipBucket[]
  hoursWorkedLabel: string
  clockedInLabel: string
  isEmpty: boolean
}

export interface TeamAverage {
  sales: number
  tips: number
  peerCount: number
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function countCovers(guests: ShiftGuestLike[]): number {
  return guests.filter((g) => !g.guestId.startsWith("staff-")).length
}

function isAttributedToShift(session: ShiftSessionLike, shift: StaffShiftSession): boolean {
  if (session.serverId) return session.serverId === shift.staffId
  return true
}

function paymentsInShift(payments: ShiftPaymentLike[], clockedInAt: string): ShiftPaymentLike[] {
  return payments.filter((p) => p.paidAt >= clockedInAt)
}

export function computeShiftStats(input: {
  shift: StaffShiftSession
  sessions: ShiftSessionLike[]
  tables: TableRecord[]
  ledger: ClosedCheckRecord[]
  pendingTableIds: string[]
  now?: Date
}): ShiftStats {
  const now = input.now ?? new Date()
  const clockedInAt = input.shift.clockedInAt
  const ledgerForShift = input.ledger.filter((c) => c.shiftId === input.shift.shiftId)
  const ledgerSessionIds = new Set(ledgerForShift.map((c) => c.sessionId))

  let sales = ledgerForShift.reduce((s, c) => s + c.sales, 0)
  let tips = ledgerForShift.reduce((s, c) => s + c.tips, 0)
  let closedCovers = ledgerForShift.reduce((s, c) => s + c.covers, 0)
  let closedChecks = ledgerForShift.length
  const livePayments: ShiftPaymentLike[] = ledgerForShift.flatMap((c) =>
    c.payments.length > 0
      ? c.payments
      : [{ amount: c.sales, tipAmount: c.tips, paidAt: c.closedAt }]
  )

  for (const session of input.sessions) {
    if (!isAttributedToShift(session, input.shift)) continue
    if (ledgerSessionIds.has(session.sessionId)) continue

    const payments = paymentsInShift(session.payments, clockedInAt)
    const paymentSales = payments.reduce((s, p) => s + p.amount, 0)
    const paymentTips = payments.reduce((s, p) => s + p.tipAmount, 0)
    sales += paymentSales
    tips += paymentTips
    livePayments.push(...payments)

    if (session.closedAt && payments.length > 0) {
      closedChecks += 1
      closedCovers += countCovers(session.guests)
    }
  }

  const openTables: OpenShiftTable[] = input.tables
    .filter((t) => t.status === "open" || t.status === "processing")
    .filter((t) => !t.server || t.server === input.shift.staffName)
    .map((t) => ({
      id: t.id,
      number: t.number,
      status: t.status,
      billTotal: t.billTotal,
      guestCount: t.guestCount,
    }))

  const openCovers = openTables.reduce((s, t) => s + t.guestCount, 0)
  const openBillTotal = openTables.reduce((s, t) => s + t.billTotal, 0)
  const pendingApprovals = input.pendingTableIds.length
  const covers = closedCovers + openCovers
  const avgTicket = closedChecks > 0 ? Math.round(sales / closedChecks) : null
  const elapsedMs = now.getTime() - new Date(clockedInAt).getTime()

  return {
    sales,
    tips,
    covers,
    closedChecks,
    avgTicket,
    openBillTotal,
    openTables,
    pendingApprovals,
    tipBuckets: buildTipBuckets(clockedInAt, now, livePayments),
    hoursWorkedLabel: formatDuration(elapsedMs),
    clockedInLabel: formatTimeCR(clockedInAt),
    isEmpty: sales === 0 && tips === 0 && closedChecks === 0 && openTables.length === 0,
  }
}

export function computeTeamAverage(peers: ShiftSnapshot[]): TeamAverage | null {
  if (peers.length === 0) return null
  const sales = Math.round(peers.reduce((s, p) => s + p.sales, 0) / peers.length)
  const tips = Math.round(peers.reduce((s, p) => s + p.tips, 0) / peers.length)
  return { sales, tips, peerCount: peers.length }
}

export function buildTipBuckets(
  clockedInAt: string,
  now: Date,
  payments: ShiftPaymentLike[]
): TipBucket[] {
  const start = new Date(clockedInAt).getTime()
  const end = now.getTime()
  if (!Number.isFinite(start) || end <= start) {
    return [{ label: "Este turno", tips: payments.reduce((s, p) => s + p.tipAmount, 0) }]
  }

  const span = end - start
  const slotMs = span <= TWO_HOURS_MS ? span : TWO_HOURS_MS
  const buckets: TipBucket[] = []
  let cursor = start

  while (cursor < end) {
    const next = Math.min(cursor + slotMs, end)
    const isLast = next >= end
    const slotStart = new Date(cursor)
    const slotEnd = new Date(next)
    const label = isLast
      ? `${formatTimeCR(slotStart)}–ahora`
      : `${formatTimeCR(slotStart)}–${formatTimeCR(slotEnd)}`
    const tips = payments
      .filter((p) => {
        const t = new Date(p.paidAt).getTime()
        return isLast ? t >= cursor && t <= next : t >= cursor && t < next
      })
      .reduce((s, p) => s + p.tipAmount, 0)
    buckets.push({ label, tips })
    cursor = next
    if (buckets.length >= 6) break
  }

  return buckets
}

export function canCloseShift(stats: ShiftStats): boolean {
  return stats.openTables.length === 0 && stats.pendingApprovals === 0
}
