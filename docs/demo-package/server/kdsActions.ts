import { authenticatePin, verifyToken } from "./auth.ts"
import { isDeviceApprovedForKds } from "./devices.ts"
import { PERMISSIONS, hasPermission, permissionForKdsAction } from "./permissions.ts"
import { findStaffById, readStore, updateStore } from "./store.ts"
import type { AuthTokenPayload, KdsAuditAction, KdsAuditRecord } from "./types.ts"

export interface AuthorizeKdsActionInput {
  token: string
  action: KdsAuditAction
  ticketId: string
  tableNumber: number
  station: "kitchen" | "bar"
  fromStatus: string
  toStatus: string
  stationId?: string
  stationName?: string
  managerPin?: string
}

export function authorizeKdsAction(input: AuthorizeKdsActionInput):
  | { ok: true; audit: KdsAuditRecord }
  | { ok: false; error: string; code: number } {
  const auth = verifyToken(input.token)
  if (!auth) return { ok: false, error: "Unauthorized", code: 401 }

  const permission = permissionForKdsAction(input.action, input.station)
  if (!hasPermission(auth.role, permission, auth.permissions)) {
    return { ok: false, error: "Forbidden", code: 403 }
  }

  if (input.action === "recall") {
    const managerAuth = input.managerPin ? authenticatePin(input.managerPin) : null
    if (!managerAuth?.ok || managerAuth.staff.role !== "manager") {
      return { ok: false, error: "Manager PIN required", code: 403 }
    }
  } else {
    const deviceCheck = isDeviceApprovedForKds(auth, input.station)
    if (!deviceCheck.ok) {
      const message =
        deviceCheck.reason === "pending"
          ? "Device pending approval"
          : deviceCheck.reason === "revoked"
            ? "Device revoked"
            : "Device not registered"
      return { ok: false, error: message, code: 403 }
    }
  }

  const staff = findStaffById(auth.staffId)
  if (!staff) return { ok: false, error: "Staff not found", code: 401 }

  let managerOverride = false
  let managerId: string | undefined
  let managerName: string | undefined

  if (input.action === "recall" && input.managerPin) {
    const manager = authenticatePin(input.managerPin)
    if (manager.ok) {
      managerOverride = true
      managerId = manager.staff.id
      managerName = manager.staff.name
    }
  }

  const audit: KdsAuditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ticketId: input.ticketId,
    tableNumber: input.tableNumber,
    station: input.station,
    action: input.action,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    staffId: staff.id,
    staffName: staff.name,
    staffRole: staff.role,
    stationId: input.stationId,
    stationName: input.stationName,
    deviceId: auth.deviceId,
    managerOverride,
    managerId,
    managerName,
    at: new Date().toISOString(),
  }

  updateStore((store) => {
    store.audit.push(audit)
    if (store.audit.length > 500) store.audit = store.audit.slice(-500)
  })

  return { ok: true, audit }
}

export function listAudit(auth: AuthTokenPayload, options?: { station?: "kitchen" | "bar"; limit?: number }) {
  const canViewKitchen = hasPermission(auth.role, PERMISSIONS.KDS_KITCHEN_VIEW, auth.permissions)
  const canViewBar = hasPermission(auth.role, PERMISSIONS.KDS_BAR_VIEW, auth.permissions)
  const canViewAdmin = hasPermission(auth.role, PERMISSIONS.ADMIN_ACCESS, auth.permissions)

  if (options?.station === "kitchen" && !canViewKitchen && !canViewAdmin) {
    return { ok: false as const, error: "Forbidden", code: 403 }
  }
  if (options?.station === "bar" && !canViewBar && !canViewAdmin) {
    return { ok: false as const, error: "Forbidden", code: 403 }
  }
  if (!options?.station && !canViewKitchen && !canViewBar && !canViewAdmin) {
    return { ok: false as const, error: "Forbidden", code: 403 }
  }

  const store = readStore()
  const limit = options?.limit ?? 50
  const entries = store.audit
    .filter((e) => (options?.station ? e.station === options.station : true))
    .slice(-limit)
    .reverse()

  return { ok: true as const, entries }
}
