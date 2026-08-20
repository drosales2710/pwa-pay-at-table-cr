const GUEST_ID_KEY = "cr-pat-guest-id"
const GUEST_NAME_KEY = "cr-pat-guest-name"

export function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY)
    if (existing) return existing
    const id = `guest-${crypto.randomUUID()}`
    localStorage.setItem(GUEST_ID_KEY, id)
    return id
  } catch {
    return `guest-${Date.now()}`
  }
}

export function getGuestName(): string | null {
  try {
    return localStorage.getItem(GUEST_NAME_KEY)
  } catch {
    return null
  }
}

export function setGuestName(name: string) {
  try {
    const trimmed = name.trim()
    if (trimmed) localStorage.setItem(GUEST_NAME_KEY, trimmed)
  } catch {
    // ignore
  }
}

export function clearGuestSession() {
  try {
    localStorage.removeItem(GUEST_ID_KEY)
    localStorage.removeItem(GUEST_NAME_KEY)
  } catch {
    // ignore
  }
}
