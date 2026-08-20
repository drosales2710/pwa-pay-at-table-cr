// ─────────────────────────────────────────────────────────────────────────────
// Currency formatting helpers — Costa Rican Colón (CRC / ₡) with proper digit
// grouping, e.g. formatCRC(12500) === "₡12,500"
// ─────────────────────────────────────────────────────────────────────────────
export function formatCRC(amount: number): string {
  return `₡${Math.round(amount).toLocaleString("en-US")}`
}

export function formatUSD(amountCRC: number, exchangeRate: number = 525): string {
  return `$${(amountCRC / exchangeRate).toFixed(2)}`
}
