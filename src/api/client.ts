import { clearServerAuthSession, getServerAuthToken } from "../utils/serverAuthSession"

function getApiBase(): string {
  const base = import.meta.env.BASE_URL || "/"
  const normalized = base.endsWith("/") ? base : `${base}/`
  return `${normalized}api/v1`.replace(/([^:]\/)\/+/g, "$1")
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  if (options.auth !== false) {
    const token = getServerAuthToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  })

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; ok?: boolean }

  if (!response.ok) {
    if (response.status === 401) clearServerAuthSession()
    throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status)
  }

  return payload
}

export async function isApiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${getApiBase()}/auth/session`, {
      method: "GET",
      headers: { Authorization: "Bearer probe" },
      signal: controller.signal,
    })
    clearTimeout(timer)
    return response.status === 401 || response.status === 200
  } catch {
    return false
  }
}
