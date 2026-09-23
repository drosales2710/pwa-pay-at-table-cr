import type { AuthTokenPayload, DeviceStatus, KdsStationType, RegisteredDevice } from "./types.ts"
import { PERMISSIONS, hasPermission } from "./permissions.ts"
import { readStore, updateStore } from "./store.ts"

export function registerDevice(input: {
  restaurantId: string
  deviceId: string
  label: string
  stationType?: KdsStationType
  stationId?: string
  stationName?: string
  registeredByStaffId?: string
}): RegisteredDevice {
  let result: RegisteredDevice | null = null

  updateStore((store) => {
    const existing = store.devices.find(
      (d) => d.deviceId === input.deviceId && d.restaurantId === input.restaurantId
    )

    if (existing) {
      existing.label = input.label.trim() || existing.label
      existing.stationType = input.stationType ?? existing.stationType
      existing.stationId = input.stationId ?? existing.stationId
      existing.stationName = input.stationName ?? existing.stationName
      existing.lastSeenAt = new Date().toISOString()
      result = existing
      return
    }

    const device: RegisteredDevice = {
      deviceId: input.deviceId,
      restaurantId: input.restaurantId,
      label: input.label.trim() || "Dispositivo sin nombre",
      stationType: input.stationType,
      stationId: input.stationId,
      stationName: input.stationName,
      status: "pending",
      registeredAt: new Date().toISOString(),
      registeredByStaffId: input.registeredByStaffId,
      lastSeenAt: new Date().toISOString(),
    }
    store.devices.push(device)
    result = device
  })

  return result!
}

export function listDevices(restaurantId: string): RegisteredDevice[] {
  const store = readStore()
  return store.devices.filter((d) => d.restaurantId === restaurantId)
}

export function setDeviceStatus(input: {
  auth: AuthTokenPayload
  deviceId: string
  restaurantId: string
  status: DeviceStatus
}): RegisteredDevice | { error: string } {
  if (!hasPermission(input.auth.role, PERMISSIONS.DEVICES_MANAGE, input.auth.permissions)) {
    return { error: "forbidden" }
  }

  let updated: RegisteredDevice | null = null
  updateStore((store) => {
    const device = store.devices.find(
      (d) => d.deviceId === input.deviceId && d.restaurantId === input.restaurantId
    )
    if (!device) return
    device.status = input.status
    device.lastSeenAt = new Date().toISOString()
    if (input.status === "approved") {
      device.approvedAt = new Date().toISOString()
      device.approvedByStaffId = input.auth.staffId
    }
    updated = device
  })

  if (!updated) return { error: "not_found" }
  return updated
}

export function isDeviceApprovedForKds(
  auth: AuthTokenPayload,
  station: KdsStationType
): { ok: true } | { ok: false; reason: "pending" | "revoked" | "missing" } {
  if (auth.role === "manager") return { ok: true }

  const store = readStore()
  const device = store.devices.find(
    (d) => d.deviceId === auth.deviceId && d.restaurantId === auth.restaurantId
  )

  if (!device) return { ok: false, reason: "missing" }
  if (device.status === "pending") return { ok: false, reason: "pending" }
  if (device.status === "revoked") return { ok: false, reason: "revoked" }
  if (device.stationType && device.stationType !== station) return { ok: false, reason: "missing" }
  return { ok: true }
}
