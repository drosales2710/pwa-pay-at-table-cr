import type { GuardianConfig, Restaurant, RestaurantBrand, TaxConfig } from "../types"
import { getRestaurantById } from "../data/restaurants"
import { notifyOpsChanged } from "./opsEvents"

export interface RestaurantContact {
  address: string
  phone: string
  email: string
}

export interface RestaurantFeatureFlags {
  biometricPay: boolean
  dualCurrency: boolean
  emailReceipts: boolean
  whatsappReceipts: boolean
}

export interface RestaurantOverlay {
  name?: string
  tagline?: string
  exchangeRate?: number
  taxConfig?: TaxConfig
  guardianConfig?: GuardianConfig
  brand?: RestaurantBrand
  sinpe?: Restaurant["sinpe"]
  contact?: RestaurantContact
  features?: RestaurantFeatureFlags
}

const KEY = "cr-pat-restaurant-overlays"

const DEFAULT_CONTACT: RestaurantContact = {
  address: "Escazú, San José, Costa Rica",
  phone: "+506 2222-3333",
  email: "info@laterraza.cr",
}

const DEFAULT_FEATURES: RestaurantFeatureFlags = {
  biometricPay: true,
  dualCurrency: true,
  emailReceipts: false,
  whatsappReceipts: true,
}

function loadAll(): Record<string, RestaurantOverlay> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, RestaurantOverlay>
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, RestaurantOverlay>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
  notifyOpsChanged()
}

export function loadRestaurantOverlay(restaurantId: string): RestaurantOverlay {
  return loadAll()[restaurantId] ?? {}
}

export function saveRestaurantOverlay(restaurantId: string, overlay: RestaurantOverlay) {
  const all = loadAll()
  all[restaurantId] = { ...all[restaurantId], ...overlay }
  saveAll(all)
}

export function getRestaurantContact(restaurantId: string): RestaurantContact {
  return { ...DEFAULT_CONTACT, ...loadRestaurantOverlay(restaurantId).contact }
}

export function getRestaurantFeatures(restaurantId: string): RestaurantFeatureFlags {
  return { ...DEFAULT_FEATURES, ...loadRestaurantOverlay(restaurantId).features }
}

export function getLiveRestaurant(id: string | undefined | null): Restaurant {
  const base = getRestaurantById(id)
  const overlay = loadRestaurantOverlay(base.id)
  return {
    ...base,
    name: overlay.name ?? base.name,
    tagline: overlay.tagline ?? base.tagline,
    exchangeRate: overlay.exchangeRate ?? base.exchangeRate,
    taxConfig: overlay.taxConfig ?? base.taxConfig,
    guardianConfig: overlay.guardianConfig ?? base.guardianConfig,
    brand: overlay.brand ?? base.brand,
    sinpe: overlay.sinpe ?? base.sinpe,
  }
}
