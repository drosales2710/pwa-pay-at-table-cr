import { createHmac, randomUUID } from "node:crypto"
import { permissionsForRole, type Permission } from "./permissions.ts"
import { findStaffById, findStaffByPin, readStore, updateStore } from "./store.ts"
import type { AuthTokenPayload, RegisteredDevice, StaffRecord } from "./types.ts"

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const SECRET = process.env.API_SECRET || "cr-pat-dev-secret-change-in-production"

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("base64url")
}

export function issueToken(input: {
  staff: StaffRecord
  restaurantId: string
  deviceId: string
}): { token: string; expiresAt: string; permissions: Permission[]; sessionId: string } {
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  const permissions = permissionsForRole(input.staff.role)

  updateStore((store) => {
    store.sessions.push({
      sessionId,
      staffId: input.staff.id,
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      createdAt: new Date().toISOString(),
      expiresAt,
      revoked: false,
    })
  })

  const payload: AuthTokenPayload = {
    sessionId,
    staffId: input.staff.id,
    staffName: input.staff.name,
    role: input.staff.role,
    restaurantId: input.restaurantId,
    deviceId: input.deviceId,
    permissions,
    exp: new Date(expiresAt).getTime(),
  }

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return { token: `${body}.${sign(body)}`, expiresAt, permissions, sessionId }
}

export function verifyToken(token: string | null | undefined): AuthTokenPayload | null {
  if (!token) return null
  const trimmed = token.startsWith("Bearer ") ? token.slice(7) : token
  const [body, signature] = trimmed.split(".")
  if (!body || !signature || sign(body) !== signature) return null

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload
    if (!payload.exp || payload.exp < Date.now()) return null

    const store = readStore()
    const session = store.sessions.find((s) => s.sessionId === payload.sessionId)
    if (!session || session.revoked) return null

    const staff = findStaffById(payload.staffId)
    if (!staff || staff.status !== "active") return null

    return payload
  } catch {
    return null
  }
}

export function authenticatePin(pin: string):
  | { ok: true; staff: StaffRecord }
  | { ok: false; reason: "invalid" | "inactive" } {
  const staff = findStaffByPin(pin)
  if (!staff) return { ok: false, reason: "invalid" }
  if (staff.status !== "active") return { ok: false, reason: "inactive" }
  return { ok: true, staff }
}

export function revokeSession(sessionId: string) {
  updateStore((store) => {
    const session = store.sessions.find((s) => s.sessionId === sessionId)
    if (session) session.revoked = true
  })
}

export function touchDevice(deviceId: string, restaurantId: string) {
  updateStore((store) => {
    const device = store.devices.find((d) => d.deviceId === deviceId && d.restaurantId === restaurantId)
    if (device) device.lastSeenAt = new Date().toISOString()
  })
}

export function getDeviceRecord(deviceId: string, restaurantId: string): RegisteredDevice | null {
  const store = readStore()
  return store.devices.find((d) => d.deviceId === deviceId && d.restaurantId === restaurantId) ?? null
}
