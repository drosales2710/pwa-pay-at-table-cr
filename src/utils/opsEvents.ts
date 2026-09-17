export const OPS_EVENT = "cr-pat-ops"

/** Notify guest/server/admin trees that catalog, staff, or restaurant settings changed. */
export function notifyOpsChanged() {
  try {
    window.dispatchEvent(new Event(OPS_EVENT))
  } catch {
    // ignore
  }
}
