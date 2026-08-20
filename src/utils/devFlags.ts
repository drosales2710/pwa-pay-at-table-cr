/** Dev-only helpers for UI demos — tree-shaken from production builds when unused. */

const SIMULATE_GUESTS_KEY = "cr-pat-dev-simulate-guests"

/** Fake guest count used when the dev simulate toggle is on. */
export const DEV_SIMULATED_GUEST_COUNT = 2

export function isDevSimulateMultiGuest(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return sessionStorage.getItem(SIMULATE_GUESTS_KEY) === "true"
  } catch {
    return false
  }
}

export function setDevSimulateMultiGuest(enabled: boolean) {
  if (!import.meta.env.DEV) return
  try {
    if (enabled) sessionStorage.setItem(SIMULATE_GUESTS_KEY, "true")
    else sessionStorage.removeItem(SIMULATE_GUESTS_KEY)
  } catch {
    // ignore
  }
}

/** Scanned guest count for split/payment rules (real guests or dev simulation). */
export function getEffectiveGuestCount(actualGuestCount: number): number {
  if (import.meta.env.DEV && isDevSimulateMultiGuest()) {
    return Math.max(actualGuestCount, DEV_SIMULATED_GUEST_COUNT)
  }
  return actualGuestCount
}
