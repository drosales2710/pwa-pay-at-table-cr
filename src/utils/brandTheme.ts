import type { RestaurantBrand } from "../types"

const BRAND_CSS_VARS = [
  "--color-primary",
  "--color-primary-hover",
  "--color-primary-light",
  "--color-primary-foreground",
  "--color-primary-on-light",
  "--color-guest",
  "--color-guest-muted",
  "--color-accent",
  "--color-accent-foreground",
  "--color-phone-frame",
  "--color-primary-rgb",
] as const

const FOREGROUND_DARK = "#1C1917"
const FOREGROUND_LIGHT = "#FFFFFF"

/** WCAG 2.1 — minimum contrast for UI components (buttons, icons). */
export const WCAG_AA_UI = 3

/** WCAG 2.1 — minimum contrast for normal-sized text. */
export const WCAG_AA_TEXT = 4.5

export type BrandValidationCode =
  | "invalid_hex"
  | "low_button_contrast"
  | "low_badge_contrast"

export interface BrandValidationIssue {
  code: BrandValidationCode
  message: string
  ratio: number
  minimum: number
}

export interface BrandValidationResult {
  valid: boolean
  issues: BrandValidationIssue[]
  tokens: ResolvedBrandTokens
}

export interface ResolvedBrandTokens {
  primary: string
  primaryHover: string
  primaryLight: string
  primaryForeground: string
  primaryOnLight: string
  phoneFrame: string
  primaryRgb: string
}

type Rgb = { r: number; g: number; b: number }

function parseHex(hex: string): Rgb | null {
  const normalized = hex.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null

  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`
}

function mixRgb(a: Rgb, b: Rgb, weight: number): Rgb {
  const w = Math.max(0, Math.min(1, weight))
  return {
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  }
}

function srgbChannel(value: number): number {
  const v = value / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance for sRGB hex colors. */
export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  const r = srgbChannel(rgb.r)
  const g = srgbChannel(rgb.g)
  const b = srgbChannel(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio between two hex colors (1–21). */
export function getContrastRatio(a: string, b: string): number | null {
  const lumA = getRelativeLuminance(a)
  const lumB = getRelativeLuminance(b)
  if (lumA === null || lumB === null) return null

  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface ForegroundPick {
  color: string
  ratio: number
  passes: boolean
}

/** Pick the candidate foreground with the best contrast on `background`. */
export function pickForegroundOn(
  background: string,
  minimumRatio = WCAG_AA_UI,
  candidates: readonly string[] = [FOREGROUND_LIGHT, FOREGROUND_DARK],
): ForegroundPick {
  let best: ForegroundPick = { color: FOREGROUND_LIGHT, ratio: 0, passes: false }

  for (const candidate of candidates) {
    const ratio = getContrastRatio(candidate, background) ?? 0
    const passes = ratio >= minimumRatio
    if (ratio > best.ratio) {
      best = { color: candidate, ratio, passes }
    }
    if (passes) break
  }

  return best
}

function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const factor = 1 - Math.max(0, Math.min(1, amount))
  return rgbToHex({ r: rgb.r * factor, g: rgb.g * factor, b: rgb.b * factor })
}

function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount))
}

/** Darken `color` until it meets `minimumRatio` against `background`. */
function ensureContrastOn(
  color: string,
  background: string,
  minimumRatio: number,
): string {
  let current = color
  for (let i = 0; i < 24; i++) {
    const ratio = getContrastRatio(current, background) ?? 0
    if (ratio >= minimumRatio) return current
    current = darken(current, 0.06)
  }
  return current
}

export function getRestaurantInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function resolveBrandTokens(brand: RestaurantBrand): ResolvedBrandTokens {
  const primary = brand.primaryColor.trim()
  const primaryLight = brand.primaryLight ?? lighten(primary, 0.92)
  const phoneFrame = mixRgb(parseHex(primaryLight) ?? { r: 237, g: 232, b: 225 }, { r: 229, g: 224, b: 218 }, 0.35)

  const foregroundPick = pickForegroundOn(primary, WCAG_AA_UI)
  const badgeRatio = getContrastRatio(primary, primaryLight) ?? 0
  const primaryOnLight =
    badgeRatio >= WCAG_AA_TEXT
      ? primary
      : ensureContrastOn(primary, primaryLight, WCAG_AA_TEXT)

  const rgb = parseHex(primary)

  return {
    primary,
    primaryHover: darken(primary, 0.06),
    primaryLight,
    primaryForeground: foregroundPick.color,
    primaryOnLight,
    phoneFrame: rgbToHex(phoneFrame),
    primaryRgb: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "249, 115, 22",
  }
}

/**
 * Validate a brand config before save (admin) or after load (runtime).
 * Does not require a logo — only checks color contrast pairs.
 */
export function validateRestaurantBrand(brand: RestaurantBrand): BrandValidationResult {
  const tokens = resolveBrandTokens(brand)
  const issues: BrandValidationIssue[] = []

  if (!parseHex(brand.primaryColor)) {
    issues.push({
      code: "invalid_hex",
      message: "Primary color must be a valid hex value (e.g. #F97316).",
      ratio: 0,
      minimum: WCAG_AA_UI,
    })
    return { valid: false, issues, tokens }
  }

  const buttonRatio = getContrastRatio(tokens.primaryForeground, tokens.primary) ?? 0
  if (buttonRatio < WCAG_AA_UI) {
    issues.push({
      code: "low_button_contrast",
      message: `Button text contrast is ${buttonRatio.toFixed(1)}:1 — minimum ${WCAG_AA_UI}:1 for UI components.`,
      ratio: buttonRatio,
      minimum: WCAG_AA_UI,
    })
  }

  const badgeRatio = getContrastRatio(tokens.primary, tokens.primaryLight) ?? 0
  if (badgeRatio < WCAG_AA_TEXT) {
    issues.push({
      code: "low_badge_contrast",
      message: `Accent text on light tint is ${badgeRatio.toFixed(1)}:1 — minimum ${WCAG_AA_TEXT}:1. A darker accent will be used on badges automatically.`,
      ratio: badgeRatio,
      minimum: WCAG_AA_TEXT,
    })
  }

  return { valid: issues.length === 0, issues, tokens }
}

/** Apply guest-facing brand tokens to :root. No-op when brand is omitted. */
export function applyRestaurantBrand(brand?: RestaurantBrand): void {
  if (!brand) return

  const { tokens, issues } = validateRestaurantBrand(brand)
  const root = document.documentElement

  root.style.setProperty("--color-primary", tokens.primary)
  root.style.setProperty("--color-primary-hover", tokens.primaryHover)
  root.style.setProperty("--color-primary-light", tokens.primaryLight)
  root.style.setProperty("--color-primary-foreground", tokens.primaryForeground)
  root.style.setProperty("--color-primary-on-light", tokens.primaryOnLight)
  root.style.setProperty("--color-guest", tokens.primary)
  root.style.setProperty("--color-guest-muted", tokens.primaryLight)
  root.style.setProperty("--color-accent", tokens.primary)
  root.style.setProperty("--color-accent-foreground", tokens.primaryForeground)
  root.style.setProperty("--color-phone-frame", tokens.phoneFrame)
  root.style.setProperty("--color-primary-rgb", tokens.primaryRgb)

  if (import.meta.env.DEV && issues.length > 0) {
    console.warn(
      `[brand] "${brand.primaryColor}" contrast issues:`,
      issues.map((i) => i.message),
    )
  }
}

/** Remove runtime overrides so index.css defaults apply again. */
export function resetRestaurantBrand(): void {
  const root = document.documentElement
  for (const key of BRAND_CSS_VARS) {
    root.style.removeProperty(key)
  }
}
