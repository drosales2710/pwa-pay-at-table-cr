import type { MenuItem } from "../types"
import { MENU_ITEMS } from "../data/menuData"
import { notifyOpsChanged } from "./opsEvents"

export type CatalogItem = MenuItem & { available: boolean }

const KEY = "cr-pat-menu-catalog"

function seed(): CatalogItem[] {
  return MENU_ITEMS.map((m) => ({ ...m, available: true }))
}

export function loadMenuCatalog(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const initial = seed()
      localStorage.setItem(KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as CatalogItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed()
    return parsed.map((item) => ({ ...item, available: item.available !== false }))
  } catch {
    return seed()
  }
}

function saveMenuCatalog(items: CatalogItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
  notifyOpsChanged()
}

export function listAvailableMenuItems(): MenuItem[] {
  return loadMenuCatalog().filter((i) => i.available)
}

export function upsertMenuItem(item: CatalogItem): CatalogItem {
  const list = loadMenuCatalog()
  const index = list.findIndex((i) => i.id === item.id)
  if (index >= 0) list[index] = item
  else list.push(item)
  saveMenuCatalog(list)
  return item
}

export function setMenuItemAvailable(id: string, available: boolean): CatalogItem | null {
  const list = loadMenuCatalog()
  const index = list.findIndex((i) => i.id === id)
  if (index < 0) return null
  list[index] = { ...list[index], available }
  saveMenuCatalog(list)
  return list[index]
}

export function removeMenuItem(id: string): boolean {
  const list = loadMenuCatalog()
  const next = list.filter((i) => i.id !== id)
  if (next.length === list.length) return false
  saveMenuCatalog(next)
  return true
}

export function importMenuCsv(csv: string): { added: number; errors: number } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { added: 0, errors: 0 }
  const start = lines[0].toLowerCase().includes("name") ? 1 : 0
  let added = 0
  let errors = 0
  const list = loadMenuCatalog()

  for (const line of lines.slice(start)) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const [name, priceRaw, categoryRaw, description = ""] = cols
    const price = Number(priceRaw)
    const category = (categoryRaw || "platos") as MenuItem["category"]
    if (!name || !Number.isFinite(price) || !["entradas", "platos", "bebidas", "postres"].includes(category)) {
      errors += 1
      continue
    }
    const id = `csv-${Date.now()}-${added}`
    list.push({
      id,
      name,
      description,
      price: Math.round(price),
      category,
      image: "",
      available: true,
    })
    added += 1
  }

  if (added > 0) saveMenuCatalog(list)
  return { added, errors }
}

export function createMenuItemId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug ? `${slug}-${Date.now().toString().slice(-4)}` : `item-${Date.now()}`
}
