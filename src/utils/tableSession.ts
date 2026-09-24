import type { TableLifecycleStatus } from "../types"

export interface StoredTableSession {
  tableId: string
  sessionId: string
  lifecycle: TableLifecycleStatus
  closedAt: string | null
  cart: unknown[]
  sentOrders: unknown[]
  sendBatch: number
  receiptCycle: number
  guests: unknown[]
  payments: unknown[]
  splitSnapshot: unknown | null
  checkoutLock: unknown | null
  pendingOrderLinks: Record<string, string[]>
  serverId?: string | null
  serverName?: string | null
}

const TABLE_SESSIONS_KEY = "cr-pat-table-sessions"

export function createTableSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `sess-${Date.now()}`
  }
}

export function loadStoredTableSessions(): Record<string, StoredTableSession> {
  try {
    const raw = localStorage.getItem(TABLE_SESSIONS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, StoredTableSession>
  } catch {
    return {}
  }
}

export function saveStoredTableSessions(sessions: Record<string, StoredTableSession>) {
  try {
    localStorage.setItem(TABLE_SESSIONS_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

export function isTableSessionClosed(session: { closedAt: string | null; lifecycle: TableLifecycleStatus }): boolean {
  return session.lifecycle === "closed" || session.closedAt !== null
}

export interface GuestMenuAccess {
  restaurantId: string
  tableId: string
  tableSessionId: string
  menuAccess: boolean
}

const MENU_ACCESS_KEY = "cr-pat-guest-session"

/** In-memory fallback when localStorage is blocked (e.g. strict private mode). */
let memoryMenuAccess: GuestMenuAccess | null = null

export function loadGuestMenuAccess(): GuestMenuAccess | null {
  try {
    const raw = localStorage.getItem(MENU_ACCESS_KEY)
    if (raw) {
      memoryMenuAccess = JSON.parse(raw) as GuestMenuAccess
      return memoryMenuAccess
    }
  } catch {
    // ignore — fall back to memory
  }
  return memoryMenuAccess
}

export function saveGuestMenuAccess(access: GuestMenuAccess) {
  memoryMenuAccess = access
  try {
    localStorage.setItem(MENU_ACCESS_KEY, JSON.stringify(access))
  } catch {
    // ignore — memoryMenuAccess still holds the grant for this tab
  }
}

export function revokeGuestMenuAccess() {
  const current = loadGuestMenuAccess()
  if (!current) {
    memoryMenuAccess = null
    return
  }
  saveGuestMenuAccess({ ...current, menuAccess: false })
}

export function isGuestMenuAccessValid(
  access: GuestMenuAccess | null,
  restaurantId: string,
  tableId: string,
  tableSessionId: string
): boolean {
  if (!access) return false
  if (!access.menuAccess) return false
  if (access.restaurantId !== restaurantId) return false
  if (access.tableId !== tableId) return false
  if (access.tableSessionId !== tableSessionId) return false
  return true
}
