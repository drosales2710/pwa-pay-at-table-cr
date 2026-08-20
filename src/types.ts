export interface ModifierOption {
  id: string
  name: string
  priceAdd: number
}

export interface ModifierGroup {
  id: string
  name: string
  type: "single" | "multiple"
  required: boolean
  options: ModifierOption[]
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number // in CRC
  category: "entradas" | "platos" | "bebidas" | "postres"
  image: string
  popular?: boolean
  isAlcoholic?: boolean
  modifierGroups?: ModifierGroup[]
}

export interface CartItem {
  cartId: string
  menuItemId: string
  name: string
  basePrice: number
  totalPrice: number // basePrice + modifier addons, per unit
  quantity: number
  modifiers: string[]
  /** Kitchen send batch (increments each send-to-kitchen). */
  round: number
  status: "cart" | "sent"
  orderedBy: string // guestId
  /** Billing / invoice cycle — shared until first payment, then advances. */
  receiptCycle: number
  /** Set when sent to kitchen — used for undo window */
  sentAt?: string
  orderId?: string
}

export type TableLifecycleStatus =
  | "available"
  | "seated"
  | "ordering"
  | "paying"
  | "paid"
  | "closed"

export type GuardianMode = "strict" | "smart" | "off"

export interface GuardianConfig {
  mode: GuardianMode
  priceThresholdColones: number
  quantityAnomalyEnabled: boolean
}

export interface TableGuest {
  guestId: string
  displayName: string
  joinedAt: string
  index: number // 0-based join order for equal split
}

export interface PaymentRecord {
  id: string
  guestId: string
  guestName: string
  amount: number
  tipAmount: number
  splitMethod: SplitMethod
  paidAt: string
  receiptCycle: number
}

export interface TableBalance {
  billTotal: number
  paidTotal: number
  remaining: number
  paidGuestCount: number
  activeGuestCount: number
  tipPoolRemainder: number
}

export type SplitMethod = "full" | "equal" | "myItems" | "custom" | null

export type Screen =
  | "menu"
  | "orderHistory"
  | "splitCheck"
  | "tip"
  | "checkout"
  | "confirmation"

export type InvoiceType = "final" | "empresa"

// ─────────────────────────────────────────────────────────────────────────────
// Tax configuration & breakdown (Costa Rica: 10% Ley 1802 service tax, 13% IVA)
// Both taxes are calculated independently on the item subtotal (not compounded).
// ─────────────────────────────────────────────────────────────────────────────
export interface TaxConfig {
  enabled: boolean
  serviceTaxRate: number // e.g. 10 for 10%
  ivaRate: number // e.g. 13 for 13%
}

export interface TaxBreakdown {
  subtotal: number
  serviceTax: number
  iva: number
  tip: number
  total: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant / Table fixtures (mock, multi-tenant ready)
// ─────────────────────────────────────────────────────────────────────────────
export interface RestaurantTable {
  id: string
  number: number
}

export interface Restaurant {
  id: string
  name: string
  tagline: string
  exchangeRate: number
  taxConfig: TaxConfig
  guardianConfig: GuardianConfig
  tables: RestaurantTable[]
  sinpe: {
    phone: string
    merchantName: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order — unified order/session object
// ─────────────────────────────────────────────────────────────────────────────
export interface Order {
  id: string
  restaurantId: string
  tableId: string
  items: CartItem[]
  round: number
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────
export type PaymentMethod = "apple" | "google" | "card" | "sinpe" | null

export interface CardDetails {
  number: string
  expiry: string
  cvv: string
  name: string
}

export interface SinpePayment {
  phone: string
  referenceNumber: string // 12-digit transaction reference
}
