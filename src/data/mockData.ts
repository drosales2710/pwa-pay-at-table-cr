// ─────────────────────────────────────────────────────────────────────────────
// Shared mock data for all portals (Server UI, KDS, Admin, Floor Plan)
// ─────────────────────────────────────────────────────────────────────────────

const now = new Date()
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000)

// ── Tables ───────────────────────────────────────────────────────────────────
export type TableStatus = "available" | "open" | "processing" | "closed"
export type TableSection = string

export interface TableRecord {
  id: string
  number: number
  section: TableSection
  seats: number
  status: TableStatus
  server: string | null
  openedAt: Date | null
  guestCount: number
  billTotal: number
  hasGuardianPending?: boolean
}

/** Live floor catalog — single test table; GuestContext overlays session state. */
export const FLOOR_TABLES: TableRecord[] = [
  {
    id: "t7",
    number: 7,
    section: "main",
    seats: 4,
    status: "available",
    server: null,
    openedAt: null,
    guestCount: 0,
    billTotal: 0,
  },
]

/** Admin/demo fixtures — not used for live floor plan or KDS. */
export const MOCK_TABLES: TableRecord[] = [
  // Main dining
  { id: "t1", number: 1, section: "main", seats: 4, status: "open", server: "María García", openedAt: minsAgo(85), guestCount: 3, billTotal: 34500 },
  { id: "t2", number: 2, section: "main", seats: 2, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
  { id: "t3", number: 3, section: "main", seats: 4, status: "processing", server: "María García", openedAt: minsAgo(112), guestCount: 4, billTotal: 67800 },
  { id: "t4", number: 4, section: "main", seats: 6, status: "open", server: "María García", openedAt: minsAgo(34), guestCount: 5, billTotal: 28900, hasGuardianPending: true },
  { id: "t5", number: 5, section: "main", seats: 4, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
  { id: "t6", number: 6, section: "main", seats: 4, status: "open", server: "Carlos Jiménez", openedAt: minsAgo(58), guestCount: 2, billTotal: 19200 },
  { id: "t7", number: 7, section: "main", seats: 4, status: "open", server: "Carlos Jiménez", openedAt: minsAgo(27), guestCount: 4, billTotal: 12400, hasGuardianPending: true },
  { id: "t8", number: 8, section: "main", seats: 2, status: "closed", server: "Carlos Jiménez", openedAt: minsAgo(135), guestCount: 2, billTotal: 22100 },
  // Bar
  { id: "t9", number: 9, section: "bar", seats: 1, status: "open", server: "Ana Vargas", openedAt: minsAgo(45), guestCount: 1, billTotal: 9600 },
  { id: "t10", number: 10, section: "bar", seats: 1, status: "open", server: "Ana Vargas", openedAt: minsAgo(22), guestCount: 1, billTotal: 6400 },
  { id: "t11", number: 11, section: "bar", seats: 1, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
  { id: "t12", number: 12, section: "bar", seats: 1, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
  // Private dining
  { id: "t13", number: 13, section: "private", seats: 8, status: "open", server: "Carlos Jiménez", openedAt: minsAgo(90), guestCount: 7, billTotal: 124500 },
  { id: "t14", number: 14, section: "private", seats: 8, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
  // Terrace
  { id: "t15", number: 15, section: "terrace", seats: 4, status: "open", server: "Ana Vargas", openedAt: minsAgo(41), guestCount: 3, billTotal: 31200 },
  { id: "t16", number: 16, section: "terrace", seats: 4, status: "available", server: null, openedAt: null, guestCount: 0, billTotal: 0 },
]

// ── KDS Tickets ───────────────────────────────────────────────────────────────
export type KDSStatus = "pending" | "preparing" | "ready" | "delivered"
export type KDSStation = "kitchen" | "bar"

export interface KDSItem {
  id: string
  name: string
  quantity: number
  modifiers: string[]
  notes: string
}

export interface KDSTicket {
  id: string
  tableNumber: number
  round: number
  station: KDSStation
  status: KDSStatus
  priority: "normal" | "rush"
  createdAt: Date
  items: KDSItem[]
}

export const INITIAL_KDS_TICKETS: KDSTicket[] = [
  {
    id: "k001", tableNumber: 7, round: 2, station: "kitchen", status: "pending", priority: "normal",
    createdAt: minsAgo(3),
    items: [
      { id: "ki1", name: "Casado de Lomo", quantity: 2, modifiers: ["Bien cocido", "Bien cocido"], notes: "" },
      { id: "ki2", name: "Tilapia a la Plancha", quantity: 1, modifiers: ["Papa frita"], notes: "Sin mantequilla" },
    ],
  },
  {
    id: "k002", tableNumber: 4, round: 1, station: "kitchen", status: "preparing", priority: "rush",
    createdAt: minsAgo(11),
    items: [
      { id: "ki3", name: "Arroz con Mariscos", quantity: 2, modifiers: [], notes: "" },
      { id: "ki4", name: "Pollo a la Plancha", quantity: 1, modifiers: [], notes: "Alergia al cilantro" },
    ],
  },
  {
    id: "k003", tableNumber: 13, round: 2, station: "kitchen", status: "preparing", priority: "normal",
    createdAt: minsAgo(8),
    items: [
      { id: "ki5", name: "Casado de Lomo", quantity: 4, modifiers: ["Tres cuartos", "Bien cocido", "Vuelta y vuelta", "Bien cocido"], notes: "" },
      { id: "ki6", name: "Ceviche de Palmito", quantity: 3, modifiers: ["Sin picante", "Poco picante", "Bien picante 🌶️"], notes: "" },
    ],
  },
  {
    id: "k004", tableNumber: 1, round: 1, station: "kitchen", status: "ready", priority: "normal",
    createdAt: minsAgo(18),
    items: [
      { id: "ki7", name: "Chifrijo", quantity: 2, modifiers: [], notes: "" },
      { id: "ki8", name: "Patacones con Guacamole", quantity: 1, modifiers: ["Chicharrón", "Natilla"], notes: "" },
    ],
  },
  {
    id: "k005", tableNumber: 6, round: 1, station: "kitchen", status: "pending", priority: "normal",
    createdAt: minsAgo(2),
    items: [
      { id: "ki9", name: "Tilapia a la Plancha", quantity: 2, modifiers: ["Puré de papa", "Papa frita"], notes: "" },
    ],
  },
  // Bar tickets
  {
    id: "b001", tableNumber: 15, round: 1, station: "bar", status: "pending", priority: "normal",
    createdAt: minsAgo(4),
    items: [
      { id: "bi1", name: "Refresco Natural", quantity: 3, modifiers: ["Cas", "Maracuyá", "Mora"], notes: "" },
      { id: "bi2", name: "Agua Mineral", quantity: 2, modifiers: ["Con gas", "Sin gas"], notes: "" },
    ],
  },
  {
    id: "b002", tableNumber: 9, round: 2, station: "bar", status: "preparing", priority: "normal",
    createdAt: minsAgo(7),
    items: [
      { id: "bi3", name: "Cerveza Imperial", quantity: 4, modifiers: ["Botella", "Botella", "Lata", "Lata"], notes: "" },
    ],
  },
  {
    id: "b003", tableNumber: 4, round: 1, station: "bar", status: "ready", priority: "rush",
    createdAt: minsAgo(14),
    items: [
      { id: "bi4", name: "Limonada con Jengibre", quantity: 2, modifiers: [], notes: "" },
      { id: "bi5", name: "Cerveza Imperial", quantity: 5, modifiers: ["Botella"], notes: "" },
    ],
  },
]

// ── Staff ─────────────────────────────────────────────────────────────────────
export interface StaffMember {
  id: string
  name: string
  role: "server" | "bartender" | "cashier" | "manager"
  /** Personal 4-digit PIN for clock-in (demo fixtures). */
  pin: string
  tables: number[]
  tipsToday: number
  salesTotal: number
  avgRating: number
  covers: number
}

export const STAFF: StaffMember[] = [
  { id: "s1", name: "María García", role: "server", pin: "4821", tables: [1, 2, 3, 4], tipsToday: 18200, salesTotal: 176800, avgRating: 4.8, covers: 22 },
  { id: "s2", name: "Carlos Jiménez", role: "server", pin: "7392", tables: [5, 6, 7, 8, 13, 14], tipsToday: 21500, salesTotal: 198400, avgRating: 4.6, covers: 28 },
  { id: "s3", name: "Ana Vargas", role: "bartender", pin: "9156", tables: [9, 10, 11, 12, 15, 16], tipsToday: 14800, salesTotal: 124200, avgRating: 4.9, covers: 18 },
  { id: "s4", name: "Luis Mora", role: "manager", pin: "0000", tables: [], tipsToday: 0, salesTotal: 0, avgRating: 0, covers: 0 },
]

// ── Daily Sales (7-day) ───────────────────────────────────────────────────────
export interface DailySales {
  date: string
  revenue: number
  orders: number
  avgTicket: number
  tipPct: number
}

export const WEEKLY_SALES: DailySales[] = [
  { date: "Lun 28", revenue: 289500, orders: 47, avgTicket: 6159, tipPct: 12.3 },
  { date: "Mar 29", revenue: 312800, orders: 52, avgTicket: 6015, tipPct: 13.1 },
  { date: "Mié 30", revenue: 298600, orders: 49, avgTicket: 6094, tipPct: 11.8 },
  { date: "Jue 31", revenue: 334200, orders: 55, avgTicket: 6076, tipPct: 12.5 },
  { date: "Vie 1", revenue: 421800, orders: 68, avgTicket: 6203, tipPct: 14.2 },
  { date: "Sáb 2", revenue: 496300, orders: 79, avgTicket: 6282, tipPct: 15.8 },
  { date: "Hoy", revenue: 263400, orders: 41, avgTicket: 6424, tipPct: 13.9 },
]

export const TOP_ITEMS = [
  { name: "Casado de Lomo", orders: 142, revenue: 1349000 },
  { name: "Arroz con Mariscos", orders: 98, revenue: 1097600 },
  { name: "Cerveza Imperial", orders: 267, revenue: 854400 },
  { name: "Chifrijo", orders: 87, revenue: 452400 },
  { name: "Tres Leches", orders: 76, revenue: 319200 },
]

export const HOURLY_TODAY = [
  { hour: "11am", revenue: 12400 }, { hour: "12pm", revenue: 48200 },
  { hour: "1pm", revenue: 72800 }, { hour: "2pm", revenue: 65400 },
  { hour: "3pm", revenue: 28700 }, { hour: "4pm", revenue: 14200 },
  { hour: "5pm", revenue: 18900 }, { hour: "6pm", revenue: 52300 },
  { hour: "7pm", revenue: 31200 }, // current
]

// ── Guardian Queue (pending orders needing server approval) ───────────────────
export interface GuardianOrder {
  id: string
  tableId: string
  tableNumber: number
  submittedAt: Date
  submittedBy?: string
  items: Array<{ name: string; quantity: number; modifiers: string[]; unitPrice?: number }>
  total: number
  status: "pending" | "approved" | "rejected"
  reasons?: string[]
}

export const INITIAL_GUARDIAN_QUEUE: GuardianOrder[] = [
  {
    id: "gq1", tableId: "t4", tableNumber: 4, submittedAt: minsAgo(2),
    items: [
      { name: "Cerveza Imperial", quantity: 3, modifiers: ["Botella"] },
      { name: "Chifrijo", quantity: 1, modifiers: [] },
    ],
    total: 14800, status: "pending",
  },
  {
    id: "gq2", tableId: "t7", tableNumber: 7, submittedAt: minsAgo(1),
    items: [
      { name: "Arroz con Mariscos", quantity: 2, modifiers: [] },
      { name: "Limonada con Jengibre", quantity: 2, modifiers: [] },
    ],
    total: 28000, status: "pending",
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
export function elapsedMins(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 60000)
}
