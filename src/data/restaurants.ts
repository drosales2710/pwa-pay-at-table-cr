import type { Restaurant } from "../types"

// ─────────────────────────────────────────────────────────────────────────────
// Mock multi-restaurant fixtures — keyed by ?restaurant= URL param.
// Each restaurant can independently enable/disable tax calculation (10% service
// + 13% IVA) via taxConfig.enabled. Rates are pinned per restaurant agreement;
// left OFF by default until each restaurant confirms how they want it applied.
// ─────────────────────────────────────────────────────────────────────────────

function makeTables(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `t${i + 1}`, number: i + 1 }))
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: "la-terraza",
    name: "La Terraza",
    tagline: "Cocina costarricense de autor",
    exchangeRate: 525,
    taxConfig: { enabled: false, serviceTaxRate: 10, ivaRate: 13 },
    guardianConfig: { mode: "smart", priceThresholdColones: 15000, quantityAnomalyEnabled: true },
    tables: makeTables(16),
    sinpe: { phone: "8888-4321", merchantName: "La Terraza S.A." },
  },
  {
    id: "soda-marisol",
    name: "Soda Marisol",
    tagline: "Comida casera, sabor de siempre",
    exchangeRate: 525,
    taxConfig: { enabled: true, serviceTaxRate: 10, ivaRate: 13 },
    guardianConfig: { mode: "smart", priceThresholdColones: 15000, quantityAnomalyEnabled: true },
    tables: makeTables(10),
    sinpe: { phone: "8777-2210", merchantName: "Soda Marisol" },
  },
  {
    id: "el-patio-azul",
    name: "El Patio Azul",
    tagline: "Mariscos frescos frente al mar",
    exchangeRate: 525,
    taxConfig: { enabled: true, serviceTaxRate: 10, ivaRate: 13 },
    guardianConfig: { mode: "smart", priceThresholdColones: 15000, quantityAnomalyEnabled: true },
    tables: makeTables(20),
    sinpe: { phone: "8666-9087", merchantName: "El Patio Azul Restaurante" },
  },
]

export const DEFAULT_RESTAURANT_ID = "la-terraza"

export function getRestaurantById(id: string | undefined | null): Restaurant {
  return RESTAURANTS.find((r) => r.id === id) ?? RESTAURANTS.find((r) => r.id === DEFAULT_RESTAURANT_ID)!
}
