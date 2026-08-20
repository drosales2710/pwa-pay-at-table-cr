import type { TaxBreakdown, TaxConfig } from "../types"

// ─────────────────────────────────────────────────────────────────────────────
// Costa Rica tax calculation — 10% Ley 1802 service tax + 13% IVA.
// Per restaurant confirmation: BOTH taxes are computed independently on the
// item subtotal (base amount), not compounded on top of each other.
//
//   serviceTax = subtotal × (serviceTaxRate / 100)
//   iva        = subtotal × (ivaRate / 100)
//   total      = subtotal + serviceTax + iva + tip
//
// When taxConfig.enabled is false, serviceTax and iva are both 0 and total
// simply equals subtotal + tip (today's existing behavior is preserved).
// ─────────────────────────────────────────────────────────────────────────────
export function calculateTaxBreakdown(
  subtotal: number,
  taxConfig: TaxConfig,
  tip: number = 0
): TaxBreakdown {
  const serviceTax = taxConfig.enabled ? Math.round(subtotal * (taxConfig.serviceTaxRate / 100)) : 0
  const iva = taxConfig.enabled ? Math.round(subtotal * (taxConfig.ivaRate / 100)) : 0
  const total = subtotal + serviceTax + iva + tip

  return { subtotal, serviceTax, iva, tip, total }
}
