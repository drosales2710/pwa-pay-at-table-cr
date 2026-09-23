import type { ApiStore, StaffRecord } from "./types.ts"

export const SEED_STAFF: StaffRecord[] = [
  { id: "s1", name: "María García", role: "server", pin: "4821", status: "active" },
  { id: "s2", name: "Carlos Jiménez", role: "server", pin: "7392", status: "active" },
  { id: "s3", name: "Ana Vargas", role: "bartender", pin: "9156", status: "active" },
  { id: "s4", name: "Luis Mora", role: "manager", pin: "0000", status: "active" },
  { id: "s5", name: "Roberto Solís", role: "kitchen", pin: "2847", status: "active" },
  { id: "s6", name: "Elena Castro", role: "cashier", pin: "5638", status: "active" },
]

export function createSeedStore(): ApiStore {
  return {
    staff: SEED_STAFF.map((s) => ({ ...s })),
    sessions: [],
    devices: [],
    audit: [],
  }
}
