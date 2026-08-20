import type { CartItem, GuardianConfig, MenuItem } from "../types"

export interface GuardianEvaluation {
  requiresApproval: boolean
  reasons: string[]
}

const DEFAULT_CONFIG: GuardianConfig = {
  mode: "smart",
  priceThresholdColones: 15000,
  quantityAnomalyEnabled: true,
}

export function evaluateOrderForGuardian(
  cart: CartItem[],
  menuItems: MenuItem[],
  tableGuestCount: number,
  config: GuardianConfig = DEFAULT_CONFIG
): GuardianEvaluation {
  if (config.mode === "off") {
    return { requiresApproval: false, reasons: [] }
  }

  const reasons: string[] = []
  const menuById = new Map(menuItems.map((m) => [m.id, m]))

  for (const line of cart) {
    const menuItem = menuById.get(line.menuItemId)
    if (!menuItem) continue

    if (config.mode === "strict") {
      reasons.push(`Revisión requerida: ${line.name}`)
      continue
    }

    // Smart mode
    if (menuItem.isAlcoholic) {
      reasons.push(`Alcohol: ${line.name}`)
    }
    if (line.totalPrice >= config.priceThresholdColones) {
      reasons.push(`Artículo ≥ ₡${config.priceThresholdColones.toLocaleString("es-CR")}: ${line.name}`)
    }
    if (
      config.quantityAnomalyEnabled &&
      tableGuestCount > 0 &&
      line.quantity > Math.max(tableGuestCount * 2, 3)
    ) {
      reasons.push(`Cantidad inusual (${line.quantity}×): ${line.name}`)
    }
  }

  if (config.mode === "strict" && cart.length > 0 && reasons.length === 0) {
    reasons.push("Modo estricto: todas las órdenes requieren aprobación")
  }

  return {
    requiresApproval: reasons.length > 0,
    reasons: [...new Set(reasons)],
  }
}

/** Smart mode with no triggers → auto-approve (no guardian queue entry) */
export function shouldQueueForGuardian(
  cart: CartItem[],
  menuItems: MenuItem[],
  tableGuestCount: number,
  config: GuardianConfig
): boolean {
  if (config.mode === "off") return false
  if (config.mode === "strict") return cart.length > 0
  return evaluateOrderForGuardian(cart, menuItems, tableGuestCount, config).requiresApproval
}
