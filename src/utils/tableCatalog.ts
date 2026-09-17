import { MOCK_TABLES, type TableRecord } from "../data/mockData"
import { notifyOpsChanged } from "./opsEvents"

export interface TableSectionDef {
  id: string
  label: string
  labelEn: string
}

export interface CatalogTableEntry {
  id: string
  number: number
  seats: number
  sectionId: string
}

export interface TableCatalog {
  sections: TableSectionDef[]
  tables: CatalogTableEntry[]
}

const KEY = "cr-pat-table-catalog"

export const DEFAULT_TABLE_SECTIONS: TableSectionDef[] = [
  { id: "main", label: "Salón Principal", labelEn: "Main Hall" },
  { id: "bar", label: "Barra", labelEn: "Bar" },
  { id: "private", label: "Privado", labelEn: "Private" },
  { id: "terrace", label: "Terraza", labelEn: "Terrace" },
]

function slugSectionId(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "section"
}

function seedTables(): CatalogTableEntry[] {
  return MOCK_TABLES.map((t) => ({
    id: t.id,
    number: t.number,
    seats: t.seats,
    sectionId: t.section,
  }))
}

function seed(): TableCatalog {
  return { sections: [...DEFAULT_TABLE_SECTIONS], tables: seedTables() }
}

function mergeCatalog(parsed: TableCatalog): TableCatalog {
  const sections = parsed.sections?.length ? parsed.sections : DEFAULT_TABLE_SECTIONS
  const byNumber = new Map((parsed.tables ?? []).map((t) => [t.number, t]))
  const tables = seedTables().map((base) => {
    const saved = byNumber.get(base.number)
    if (!saved) return base
    return {
      ...base,
      seats: saved.seats > 0 ? saved.seats : base.seats,
      sectionId: saved.sectionId || base.sectionId,
    }
  })
  return { sections, tables }
}

export function loadTableCatalog(): TableCatalog {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const initial = seed()
      localStorage.setItem(KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as TableCatalog
    return mergeCatalog(parsed)
  } catch {
    return seed()
  }
}

function saveTableCatalog(catalog: TableCatalog) {
  try {
    localStorage.setItem(KEY, JSON.stringify(catalog))
  } catch {
    // ignore
  }
  notifyOpsChanged()
}

export function listTableSections(): TableSectionDef[] {
  return loadTableCatalog().sections
}

export function listCatalogTables(): CatalogTableEntry[] {
  return loadTableCatalog().tables
}

export function getCatalogTable(number: number): CatalogTableEntry | null {
  return loadTableCatalog().tables.find((t) => t.number === number) ?? null
}

export function getSectionLabel(sectionId: string, lang: "es" | "en" = "es"): string {
  const section = loadTableCatalog().sections.find((s) => s.id === sectionId)
  if (!section) return sectionId
  return lang === "es" ? section.label : section.labelEn
}

export function updateCatalogTable(
  number: number,
  patch: Partial<Pick<CatalogTableEntry, "seats" | "sectionId">>
): CatalogTableEntry | null {
  const catalog = loadTableCatalog()
  const index = catalog.tables.findIndex((t) => t.number === number)
  if (index < 0) return null
  const next = { ...catalog.tables[index], ...patch }
  if (patch.seats != null) next.seats = Math.max(1, Math.min(24, Math.round(patch.seats)))
  catalog.tables[index] = next
  saveTableCatalog(catalog)
  return next
}

export function addTableSection(label: string, labelEn?: string): TableSectionDef | null {
  const name = label.trim()
  if (!name) return null
  const catalog = loadTableCatalog()
  const id = `${slugSectionId(name)}-${Date.now().toString().slice(-4)}`
  if (catalog.sections.some((s) => s.label.toLowerCase() === name.toLowerCase())) {
    return catalog.sections.find((s) => s.label.toLowerCase() === name.toLowerCase()) ?? null
  }
  const section: TableSectionDef = {
    id,
    label: name,
    labelEn: (labelEn?.trim() || name),
  }
  catalog.sections.push(section)
  saveTableCatalog(catalog)
  return section
}

/** Admin QR grid: catalog layout + optional live session overlay for table #7. */
export function buildAdminTableCatalog(liveByNumber: Map<number, TableRecord>): Array<
  TableRecord & { sectionId: string }
> {
  const catalog = loadTableCatalog()
  return catalog.tables
    .map((entry) => {
      const fixture = MOCK_TABLES.find((m) => m.number === entry.number)
      const live = liveByNumber.get(entry.number)
      const base: TableRecord = fixture ?? {
        id: entry.id,
        number: entry.number,
        section: entry.sectionId,
        seats: entry.seats,
        status: "available",
        server: null,
        openedAt: null,
        guestCount: 0,
        billTotal: 0,
      }
      const merged = live ? { ...base, ...live } : base
      return {
        ...merged,
        id: entry.id,
        number: entry.number,
        seats: entry.seats,
        section: entry.sectionId,
        sectionId: entry.sectionId,
      }
    })
    .sort((a, b) => a.number - b.number)
}

export function applyCatalogToFloorTable(table: TableRecord): TableRecord {
  const entry = getCatalogTable(table.number)
  if (!entry) return table
  return {
    ...table,
    seats: entry.seats,
    section: entry.sectionId,
  }
}
