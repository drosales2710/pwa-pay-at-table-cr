import type { KdsAuditAction, StaffRole } from "./types.ts"

export const PERMISSIONS = {
  SERVER_ACCESS: "server.access",
  KDS_KITCHEN_VIEW: "kds.kitchen.view",
  KDS_KITCHEN_ACT: "kds.kitchen.act",
  KDS_BAR_VIEW: "kds.bar.view",
  KDS_BAR_ACT: "kds.bar.act",
  KDS_CASHIER: "kds.cashier",
  ADMIN_ACCESS: "admin.access",
  DEVICES_MANAGE: "devices.manage",
  KDS_RECALL: "kds.recall",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  server: [PERMISSIONS.SERVER_ACCESS],
  kitchen: [PERMISSIONS.KDS_KITCHEN_VIEW, PERMISSIONS.KDS_KITCHEN_ACT],
  bartender: [PERMISSIONS.KDS_BAR_VIEW, PERMISSIONS.KDS_BAR_ACT],
  cashier: [PERMISSIONS.KDS_CASHIER],
  manager: [
    PERMISSIONS.SERVER_ACCESS,
    PERMISSIONS.KDS_KITCHEN_VIEW,
    PERMISSIONS.KDS_KITCHEN_ACT,
    PERMISSIONS.KDS_BAR_VIEW,
    PERMISSIONS.KDS_BAR_ACT,
    PERMISSIONS.KDS_CASHIER,
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.DEVICES_MANAGE,
    PERMISSIONS.KDS_RECALL,
  ],
}

export function permissionsForRole(role: StaffRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function hasPermission(role: StaffRole, permission: Permission, granted: Permission[]): boolean {
  return granted.includes(permission) || ROLE_PERMISSIONS[role].includes(permission)
}

export function permissionForKdsAction(action: KdsAuditAction, station: "kitchen" | "bar"): Permission {
  if (action === "recall") return PERMISSIONS.KDS_RECALL
  if (station === "kitchen") return PERMISSIONS.KDS_KITCHEN_ACT
  return PERMISSIONS.KDS_BAR_ACT
}
