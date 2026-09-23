import type { IncomingMessage, ServerResponse } from "node:http"
import { authenticatePin, issueToken, revokeSession, touchDevice, verifyToken, getDeviceRecord } from "./auth.ts"
import { listDevices, registerDevice, setDeviceStatus } from "./devices.ts"
import { authorizeKdsAction, listAudit } from "./kdsActions.ts"
import { permissionsForRole } from "./permissions.ts"
import type { DeviceStatus } from "./types.ts"

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (chunks.length === 0) return {} as T
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(body))
}

function getAuthHeader(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  return typeof header === "string" ? header : null
}

function parseUrl(req: IncomingMessage) {
  const host = req.headers.host ?? "localhost"
  return new URL(req.url ?? "/", `http://${host}`)
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = parseUrl(req)
  if (!url.pathname.startsWith("/api/v1")) return false

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.end()
    return true
  }

  res.setHeader("Access-Control-Allow-Origin", "*")

  try {
    if (req.method === "POST" && url.pathname === "/api/v1/auth/login") {
      const body = await readJsonBody<{
        pin?: string
        restaurantId?: string
        deviceId?: string
        deviceLabel?: string
      }>(req)

      if (!body.pin || !body.restaurantId || !body.deviceId) {
        sendJson(res, 400, { ok: false, error: "Missing pin, restaurantId, or deviceId" })
        return true
      }

      const auth = authenticatePin(body.pin)
      if (!auth.ok) {
        sendJson(res, 401, {
          ok: false,
          error: auth.reason === "inactive" ? "Access disabled" : "Invalid PIN",
        })
        return true
      }

      registerDevice({
        restaurantId: body.restaurantId,
        deviceId: body.deviceId,
        label: body.deviceLabel ?? "Staff device",
        registeredByStaffId: auth.staff.id,
      })

      const issued = issueToken({
        staff: auth.staff,
        restaurantId: body.restaurantId,
        deviceId: body.deviceId,
      })

      const device = getDeviceRecord(body.deviceId, body.restaurantId)

      sendJson(res, 200, {
        ok: true,
        token: issued.token,
        expiresAt: issued.expiresAt,
        permissions: issued.permissions,
        staff: {
          id: auth.staff.id,
          name: auth.staff.name,
          role: auth.staff.role,
        },
        device: device
          ? { id: device.deviceId, status: device.status, label: device.label }
          : { id: body.deviceId, status: "pending", label: body.deviceLabel ?? "Staff device" },
      })
      return true
    }

    if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
      const auth = verifyToken(getAuthHeader(req))
      if (auth) revokeSession(auth.sessionId)
      sendJson(res, 200, { ok: true })
      return true
    }

    if (req.method === "GET" && url.pathname === "/api/v1/auth/session") {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      touchDevice(auth.deviceId, auth.restaurantId)
      const device = getDeviceRecord(auth.deviceId, auth.restaurantId)

      sendJson(res, 200, {
        ok: true,
        staff: { id: auth.staffId, name: auth.staffName, role: auth.role },
        restaurantId: auth.restaurantId,
        permissions: permissionsForRole(auth.role),
        expiresAt: new Date(auth.exp).toISOString(),
        device: device
          ? { id: device.deviceId, status: device.status, label: device.label, stationName: device.stationName }
          : null,
      })
      return true
    }

    if (req.method === "GET" && url.pathname === "/api/v1/devices") {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      const restaurantId = url.searchParams.get("restaurantId") ?? auth.restaurantId
      const devices = listDevices(restaurantId)
      sendJson(res, 200, { ok: true, devices })
      return true
    }

    if (req.method === "POST" && url.pathname === "/api/v1/devices/register") {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      const body = await readJsonBody<{
        restaurantId?: string
        deviceId?: string
        label?: string
        stationType?: "kitchen" | "bar"
        stationId?: string
        stationName?: string
      }>(req)

      const device = registerDevice({
        restaurantId: body.restaurantId ?? auth.restaurantId,
        deviceId: body.deviceId ?? auth.deviceId,
        label: body.label ?? "KDS device",
        stationType: body.stationType,
        stationId: body.stationId,
        stationName: body.stationName,
        registeredByStaffId: auth.staffId,
      })

      sendJson(res, 200, { ok: true, device })
      return true
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/v1/devices/")) {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      const deviceId = decodeURIComponent(url.pathname.replace("/api/v1/devices/", ""))
      const body = await readJsonBody<{ restaurantId?: string; status?: DeviceStatus }>(req)
      if (!body.status) {
        sendJson(res, 400, { ok: false, error: "Missing status" })
        return true
      }

      const result = setDeviceStatus({
        auth,
        deviceId,
        restaurantId: body.restaurantId ?? auth.restaurantId,
        status: body.status,
      })

      if ("error" in result) {
        sendJson(res, result.error === "forbidden" ? 403 : 404, { ok: false, error: result.error })
        return true
      }

      sendJson(res, 200, { ok: true, device: result })
      return true
    }

    if (req.method === "POST" && url.pathname === "/api/v1/kds/actions") {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      const body = await readJsonBody<{
        action?: "advance" | "bump" | "recall"
        ticketId?: string
        tableNumber?: number
        station?: "kitchen" | "bar"
        fromStatus?: string
        toStatus?: string
        stationId?: string
        stationName?: string
        managerPin?: string
      }>(req)

      if (!body.action || !body.ticketId || !body.station || !body.fromStatus || !body.toStatus) {
        sendJson(res, 400, { ok: false, error: "Missing action fields" })
        return true
      }

      const result = authorizeKdsAction({
        token: getAuthHeader(req) ?? "",
        action: body.action,
        ticketId: body.ticketId,
        tableNumber: body.tableNumber ?? 0,
        station: body.station,
        fromStatus: body.fromStatus,
        toStatus: body.toStatus,
        stationId: body.stationId,
        stationName: body.stationName,
        managerPin: body.managerPin,
      })

      if (!result.ok) {
        sendJson(res, result.code, { ok: false, error: result.error })
        return true
      }

      sendJson(res, 200, { ok: true, audit: result.audit })
      return true
    }

    if (req.method === "GET" && url.pathname === "/api/v1/kds/audit") {
      const auth = verifyToken(getAuthHeader(req))
      if (!auth) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" })
        return true
      }

      const station = url.searchParams.get("station") as "kitchen" | "bar" | null
      const limit = Number(url.searchParams.get("limit") ?? "50")
      const result = listAudit(auth, { station: station ?? undefined, limit })

      if (!result.ok) {
        sendJson(res, result.code, { ok: false, error: result.error })
        return true
      }

      sendJson(res, 200, { ok: true, entries: result.entries })
      return true
    }

    sendJson(res, 404, { ok: false, error: "Not found" })
    return true
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : "Server error" })
    return true
  }
}
