import fs from "node:fs"
import path from "node:path"
import { createSeedStore, SEED_STAFF } from "./seed.ts"
import type { ApiStore, StaffRecord } from "./types.ts"

const DATA_DIR = path.resolve(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "restaurant-api.json")

let cache: ApiStore | null = null

function ensureDataFile(): ApiStore {
  if (cache) return cache

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial = createSeedStore()
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8")
    cache = initial
    return initial
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw) as ApiStore
    cache = mergeSeedStaff(parsed)
    persist(cache)
    return cache
  } catch {
    cache = createSeedStore()
    persist(cache)
    return cache
  }
}

function mergeSeedStaff(store: ApiStore): ApiStore {
  const existingIds = new Set(store.staff.map((s) => s.id))
  const missing = SEED_STAFF.filter((s) => !existingIds.has(s.id))
  if (missing.length === 0) return store
  return { ...store, staff: [...store.staff, ...missing] }
}

function persist(store: ApiStore) {
  cache = store
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8")
}

export function readStore(): ApiStore {
  return structuredClone(ensureDataFile())
}

export function updateStore(mutator: (store: ApiStore) => void): ApiStore {
  const store = ensureDataFile()
  mutator(store)
  persist(store)
  return structuredClone(store)
}

export function findStaffByPin(pin: string): StaffRecord | null {
  const store = ensureDataFile()
  return store.staff.find((s) => s.pin === pin.trim()) ?? null
}

export function findStaffById(id: string): StaffRecord | null {
  const store = ensureDataFile()
  return store.staff.find((s) => s.id === id) ?? null
}
