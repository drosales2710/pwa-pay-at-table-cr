import { STAFF } from "../data/mockData"
import { notifyOpsChanged } from "./opsEvents"

export type StaffRole = "server" | "bartender" | "cashier" | "manager"
export type StaffStatus = "active" | "suspended" | "terminated"

export interface StaffAccount {
  id: string
  name: string
  role: StaffRole
  pin: string
  status: StaffStatus
  phone?: string
}

const KEY = "cr-pat-staff-directory"

function createId(): string {
  try {
    return `s-${crypto.randomUUID()}`
  } catch {
    return `s-${Date.now()}`
  }
}

function seed(): StaffAccount[] {
  return STAFF.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    pin: s.pin,
    status: "active" as const,
  }))
}

export function loadStaffDirectory(): StaffAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const initial = seed()
      localStorage.setItem(KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as StaffAccount[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed()
    return parsed.map((s) => ({
      ...s,
      status: s.status ?? "active",
      pin: String(s.pin ?? ""),
    }))
  } catch {
    return seed()
  }
}

function saveStaffDirectory(list: StaffAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
  notifyOpsChanged()
}

export function listStaff(includeTerminated = true): StaffAccount[] {
  const list = loadStaffDirectory()
  if (includeTerminated) return list
  return list.filter((s) => s.status !== "terminated")
}

export function getStaffById(id: string): StaffAccount | null {
  return loadStaffDirectory().find((s) => s.id === id) ?? null
}

export function generateStaffPin(existing: StaffAccount[] = loadStaffDirectory()): string {
  for (let i = 0; i < 40; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000))
    if (!existing.some((s) => s.pin === pin && s.status !== "terminated")) return pin
  }
  return String(Date.now()).slice(-4)
}

export function authenticateStaffByPin(pin: string):
  | { ok: true; member: StaffAccount }
  | { ok: false; reason: "invalid" | "inactive" } {
  const normalized = pin.trim()
  if (normalized.length < 4) return { ok: false, reason: "invalid" }
  const member = loadStaffDirectory().find((s) => s.pin === normalized)
  if (!member) return { ok: false, reason: "invalid" }
  if (member.status !== "active") return { ok: false, reason: "inactive" }
  return { ok: true, member }
}

export function authenticateAdminByPin(pin: string):
  | { ok: true; member: StaffAccount }
  | { ok: false; reason: "invalid" | "inactive" } {
  const result = authenticateStaffByPin(pin)
  if (!result.ok) return result
  if (result.member.role !== "manager") return { ok: false, reason: "invalid" }
  return result
}

export function createStaff(input: {
  name: string
  role: StaffRole
  pin?: string
  phone?: string
}): { ok: true; member: StaffAccount } | { ok: false; reason: "name" | "pin" } {
  const name = input.name.trim()
  if (!name) return { ok: false, reason: "name" }
  const list = loadStaffDirectory()
  const pin = (input.pin ?? generateStaffPin(list)).replace(/\D/g, "").slice(0, 4)
  if (pin.length !== 4) return { ok: false, reason: "pin" }
  if (list.some((s) => s.pin === pin && s.status !== "terminated")) return { ok: false, reason: "pin" }

  const member: StaffAccount = {
    id: createId(),
    name,
    role: input.role,
    pin,
    status: "active",
    phone: input.phone?.trim() || undefined,
  }
  saveStaffDirectory([...list, member])
  return { ok: true, member }
}

export function updateStaff(
  id: string,
  patch: Partial<Pick<StaffAccount, "name" | "role" | "phone" | "status">>
): StaffAccount | null {
  const list = loadStaffDirectory()
  const index = list.findIndex((s) => s.id === id)
  if (index < 0) return null
  const next = { ...list[index], ...patch }
  if (patch.name != null) next.name = patch.name.trim()
  list[index] = next
  saveStaffDirectory(list)
  return next
}

export function resetStaffPin(id: string): { ok: true; pin: string } | { ok: false } {
  const list = loadStaffDirectory()
  const index = list.findIndex((s) => s.id === id)
  if (index < 0) return { ok: false }
  const pin = generateStaffPin(list.filter((s) => s.id !== id))
  list[index] = { ...list[index], pin }
  saveStaffDirectory(list)
  return { ok: true, pin }
}

export function countActiveManagers(excludeId?: string): number {
  return loadStaffDirectory().filter(
    (s) => s.role === "manager" && s.status === "active" && s.id !== excludeId
  ).length
}
