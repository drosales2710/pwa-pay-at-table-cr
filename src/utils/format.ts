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

/** Compact CRC for tight UI (floor stats, charts). ₡176800 → ₡177K */
export function formatCRCShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `₡${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `₡${(n / 1000).toFixed(0)}K`
  return `₡${Math.round(n)}`
}

const CR_TZ = "America/Costa_Rica"

/** Wall-clock time in Costa Rica, e.g. "11:00 a. m." */
export function formatTimeCR(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CR_TZ,
  })
}

/** Elapsed duration as "8h 45m". */
export function formatDuration(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60_000))
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return `${hours}h ${mins}m`
}

/** Calendar date key in Costa Rica (YYYY-MM-DD). */
export function dateKeyCR(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  return date.toLocaleDateString("en-CA", { timeZone: CR_TZ })
}
