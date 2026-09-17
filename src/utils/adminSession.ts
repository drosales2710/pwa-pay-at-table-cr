import type { StaffAccount } from "./staffDirectory"

const KEY = "cr-pat-admin-session"

export interface AdminSession {
  staffId: string
  staffName: string
  restaurantId: string
  loggedInAt: string
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function startAdminSession(member: StaffAccount, restaurantId: string): AdminSession {
  const session: AdminSession = {
    staffId: member.id,
    staffName: member.name,
    restaurantId,
    loggedInAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
  return session
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
