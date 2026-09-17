import { dateKeyCR } from "./format"
import {
  authenticateStaffByPin as lookupStaffPin,
  type StaffRole,
} from "./staffDirectory"

export type { StaffRole }
export type ShiftStatus = "open" | "closing" | "closed"

export interface StaffShiftSession {
  shiftId: string
  staffId: string
  staffName: string
  role: StaffRole
  restaurantId: string
  clockedInAt: string
  clockedOutAt: string | null
  status: ShiftStatus
}

export interface ClosedCheckRecord {
  id: string
  shiftId: string
  staffId: string
  tableId: string
  tableNumber: number
  sessionId: string
  closedAt: string
  sales: number
  tips: number
  covers: number
  payments: Array<{ amount: number; tipAmount: number; paidAt: string }>
}

export interface ShiftSnapshot {
  shiftId: string
  staffId: string
  staffName: string
  role: StaffRole
  restaurantId: string
  clockedInAt: string
  clockedOutAt: string
  sales: number
  tips: number
  covers: number
  closedChecks: number
  avgTicket: number | null
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  server: "Mesero",
  bartender: "Bartender",
  cashier: "Cajero",
  manager: "Gerente",
}

const SHIFT_KEY = "cr-pat-staff-shift"
const LEDGER_KEY = "cr-pat-shift-ledger"
const SNAPSHOTS_KEY = "cr-pat-shift-snapshots"

function createId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`
  } catch {
    return `${prefix}-${Date.now()}`
  }
}

export function getPersonInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function loadStaffShift(): StaffShiftSession | null {
  try {
    const raw = localStorage.getItem(SHIFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StaffShiftSession
  } catch {
    return null
  }
}

function saveStaffShift(session: StaffShiftSession) {
  try {
    localStorage.setItem(SHIFT_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}

export function getOpenStaffShift(): StaffShiftSession | null {
  const session = loadStaffShift()
  if (!session) return null
  if (session.status === "closed") return null
  return session
}

/** Look up an active staff member by personal PIN. */
export function authenticateStaffByPin(pin: string) {
  return lookupStaffPin(pin)
}

export function forceEndStaffShift(staffId: string): StaffShiftSession | null {
  const current = getOpenStaffShift()
  if (!current || current.staffId !== staffId) return null
  return closeStaffShift({
    sales: 0,
    tips: 0,
    covers: 0,
    closedChecks: 0,
    avgTicket: null,
  })
}

export function startStaffShift(params: {
  staffId: string
  staffName: string
  role: StaffRole
  restaurantId: string
}):
  | { ok: true; session: StaffShiftSession }
  | { ok: false; reason: "other_open"; existing: StaffShiftSession } {
  const current = getOpenStaffShift()
  if (current) {
    if (current.staffId === params.staffId) {
      return { ok: true, session: current }
    }
    return { ok: false, reason: "other_open", existing: current }
  }

  const session: StaffShiftSession = {
    shiftId: createId("shift"),
    staffId: params.staffId,
    staffName: params.staffName,
    role: params.role,
    restaurantId: params.restaurantId,
    clockedInAt: new Date().toISOString(),
    clockedOutAt: null,
    status: "open",
  }
  saveStaffShift(session)
  return { ok: true, session }
}

export function closeStaffShift(stats: {
  sales: number
  tips: number
  covers: number
  closedChecks: number
  avgTicket: number | null
}): StaffShiftSession | null {
  const current = getOpenStaffShift()
  if (!current) return null

  const clockedOutAt = new Date().toISOString()
  const closed: StaffShiftSession = {
    ...current,
    status: "closed",
    clockedOutAt,
  }
  saveStaffShift(closed)

  const snapshot: ShiftSnapshot = {
    shiftId: closed.shiftId,
    staffId: closed.staffId,
    staffName: closed.staffName,
    role: closed.role,
    restaurantId: closed.restaurantId,
    clockedInAt: closed.clockedInAt,
    clockedOutAt,
    sales: stats.sales,
    tips: stats.tips,
    covers: stats.covers,
    closedChecks: stats.closedChecks,
    avgTicket: stats.avgTicket,
  }
  appendShiftSnapshot(snapshot)
  return closed
}

export function loadShiftLedger(): ClosedCheckRecord[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ClosedCheckRecord[]
  } catch {
    return []
  }
}

function saveShiftLedger(records: ClosedCheckRecord[]) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(records))
  } catch {
    // ignore
  }
}

export function recordClosedCheck(input: {
  tableId: string
  sessionId: string
  closedAt: string
  sales: number
  tips: number
  covers: number
  payments: Array<{ amount: number; tipAmount: number; paidAt: string }>
}): ClosedCheckRecord | null {
  const shift = getOpenStaffShift()
  if (!shift) return null
  if (input.sales <= 0 && input.tips <= 0) return null

  const ledger = loadShiftLedger()
  if (ledger.some((c) => c.sessionId === input.sessionId)) return null

  const tableNumber = parseInt(input.tableId.replace(/\D/g, ""), 10) || 0
  const record: ClosedCheckRecord = {
    id: createId("check"),
    shiftId: shift.shiftId,
    staffId: shift.staffId,
    tableId: input.tableId,
    tableNumber,
    sessionId: input.sessionId,
    closedAt: input.closedAt,
    sales: input.sales,
    tips: input.tips,
    covers: input.covers,
    payments: input.payments,
  }
  saveShiftLedger([...ledger, record])
  return record
}

export function loadShiftSnapshots(): ShiftSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ShiftSnapshot[]
  } catch {
    return []
  }
}

function saveShiftSnapshots(snapshots: ShiftSnapshot[]) {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))
  } catch {
    // ignore
  }
}

function appendShiftSnapshot(snapshot: ShiftSnapshot) {
  const all = loadShiftSnapshots()
  if (all.some((s) => s.shiftId === snapshot.shiftId)) return
  saveShiftSnapshots([...all, snapshot])
}

/** Other staff members' sealed reports from today — used for anonymous team average. */
export function getTodaysClosedSnapshots(restaurantId: string, excludeShiftId?: string): ShiftSnapshot[] {
  const today = dateKeyCR(new Date())
  return loadShiftSnapshots().filter((s) => {
    if (s.restaurantId !== restaurantId) return false
    if (excludeShiftId && s.shiftId === excludeShiftId) return false
    return dateKeyCR(s.clockedOutAt) === today
  })
}

export function stampSessionWithOpenShift<T extends { serverId?: string | null; serverName?: string | null }>(
  session: T
): T {
  if (session.serverId) return session
  const shift = getOpenStaffShift()
  if (!shift) return session
  return { ...session, serverId: shift.staffId, serverName: shift.staffName }
}
