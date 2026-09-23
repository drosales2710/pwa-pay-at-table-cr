import type { Permission } from "./permissions.ts"

export type StaffRole = "server" | "kitchen" | "bartender" | "cashier" | "manager"
export type StaffStatus = "active" | "suspended" | "terminated"
export type DeviceStatus = "pending" | "approved" | "revoked"
export type KdsStationType = "kitchen" | "bar"
export type KdsAuditAction = "advance" | "bump" | "recall"

export interface StaffRecord {
  id: string
  name: string
  role: StaffRole
  pin: string
  status: StaffStatus
}

export interface AuthSessionRecord {
  sessionId: string
  staffId: string
  restaurantId: string
  deviceId: string
  createdAt: string
  expiresAt: string
  revoked: boolean
}

export interface RegisteredDevice {
  deviceId: string
  restaurantId: string
  label: string
  stationType?: KdsStationType
  stationId?: string
  stationName?: string
  status: DeviceStatus
  registeredAt: string
  registeredByStaffId?: string
  approvedAt?: string
  approvedByStaffId?: string
  lastSeenAt: string
}

export interface KdsAuditRecord {
  id: string
  ticketId: string
  tableNumber: number
  station: KdsStationType
  action: KdsAuditAction
  fromStatus: string
  toStatus: string
  staffId: string
  staffName: string
  staffRole: StaffRole
  stationId?: string
  stationName?: string
  deviceId: string
  managerOverride?: boolean
  managerId?: string
  managerName?: string
  at: string
}

export interface ApiStore {
  staff: StaffRecord[]
  sessions: AuthSessionRecord[]
  devices: RegisteredDevice[]
  audit: KdsAuditRecord[]
}

export interface AuthTokenPayload {
  sessionId: string
  staffId: string
  staffName: string
  role: StaffRole
  restaurantId: string
  deviceId: string
  permissions: Permission[]
  exp: number
}
