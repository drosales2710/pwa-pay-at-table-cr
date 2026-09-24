import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Outlet, useParams, useSearchParams } from "react-router-dom"
import type {
  CartItem,
  MenuItem,
  Restaurant,
  TableGuest,
  TableLifecycleStatus,
  TableBalance,
  SplitMethod,
  PaymentRecord,
  PaymentMethod,
} from "../types"
import { DEFAULT_RESTAURANT_ID } from "../data/restaurants"
import { applyRestaurantBrand, resetRestaurantBrand } from "../utils/brandTheme"
import { FLOOR_TABLES, type TableRecord, type GuardianOrder, type KDSTicket, type KDSStatus } from "../data/mockData"
import { getOrCreateGuestId, getGuestName, setGuestName as persistGuestName } from "../utils/guestSession"
import { shouldQueueForGuardian, evaluateOrderForGuardian } from "../utils/guardian"
import { createKdsTicketsFromCart, isItemKitchenStarted, pullCartItemFromTickets } from "../utils/kds"
import { ORDER_UNDO_WINDOW_MS, getItemOrderId, type GuestCancelReason, type StaffBillReason } from "../utils/order"
import { isReceiptCyclePaid, staffGuestId } from "../utils/billEdit"
import {
  sumItems,
  getGuestEqualShare,
  createSplitSnapshot,
  type SplitSnapshot,
} from "../utils/split"
import {
  getOldestUnpaidReceiptCycle,
  nextReceiptCycleAfterPayment,
  getOpenBillItems,
  buildItemSettlementMap,
  sumDueForUnitSelections,
  type ItemUnitSelection,
} from "../utils/billing"
import { getEffectiveGuestCount } from "../utils/devFlags"
import {
  createTableSessionId,
  isGuestMenuAccessValid,
  isTableSessionClosed,
  loadGuestMenuAccess,
  loadStoredTableSessions,
  revokeGuestMenuAccess,
  saveGuestMenuAccess,
  saveStoredTableSessions,
} from "../utils/tableSession"
import { recordClosedCheck, stampSessionWithOpenShift, getOpenStaffShift } from "../utils/staffSession"
import { countCovers } from "../utils/shiftStats"
import { getLiveRestaurant, getRestaurantFeatures, saveRestaurantOverlay, type RestaurantOverlay } from "../utils/restaurantConfig"
import { listAvailableMenuItems, loadMenuCatalog } from "../utils/menuCatalog"
import { applyCatalogToFloorTable } from "../utils/tableCatalog"
import { OPS_EVENT } from "../utils/opsEvents"

const CHECKOUT_LOCK_MS = 8 * 60 * 1000 // 8 minutes

export interface TableSession {
  tableId: string
  /** Unique id for this seating — changes when the table is reset after full payment. */
  sessionId: string
  lifecycle: TableLifecycleStatus
  closedAt: string | null
  cart: CartItem[]
  sentOrders: CartItem[]
  /** Last kitchen send batch number (not billing cycle). */
  sendBatch: number
  /** Next billing cycle assigned to newly added cart items. */
  receiptCycle: number
  guests: TableGuest[]
  payments: PaymentRecord[]
  splitSnapshot: SplitSnapshot | null
  checkoutLock: { guestId: string; expiresAt: string } | null
  /** Maps guardian orderId → optimistic cartIds for rollback on reject */
  pendingOrderLinks: Record<string, string[]>
  /** Staff member who owns this table during the current seating. */
  serverId: string | null
  serverName: string | null
}

interface SharedState {
  sessions: Record<string, TableSession>
  guardianQueue: GuardianOrder[]
  kdsTickets: KDSTicket[]
}

function emptySession(tableId: string): TableSession {
  return {
    tableId,
    sessionId: createTableSessionId(),
    lifecycle: "available",
    closedAt: null,
    cart: [],
    sentOrders: [],
    sendBatch: 0,
    receiptCycle: 1,
    guests: [],
    payments: [],
    splitSnapshot: null,
    checkoutLock: null,
    pendingOrderLinks: {},
    serverId: null,
    serverName: null,
  }
}

function unlinkFromGuardian(
  guardianQueue: GuardianOrder[],
  pendingOrderLinks: Record<string, string[]>,
  orderId: string,
  cartId: string,
  remainingSent: CartItem[]
): { pendingOrderLinks: Record<string, string[]>; guardianQueue: GuardianOrder[] } {
  const linkedIds = pendingOrderLinks[orderId]
  if (!linkedIds) return { pendingOrderLinks, guardianQueue }

  const nextLinks = linkedIds.filter((id) => id !== cartId)
  if (nextLinks.length === 0) {
    const { [orderId]: _, ...rest } = pendingOrderLinks
    return {
      pendingOrderLinks: rest,
      guardianQueue: guardianQueue.filter((q) => !(q.id === orderId && q.status === "pending")),
    }
  }

  const remainingItems = remainingSent.filter((i) => nextLinks.includes(i.cartId))
  return {
    pendingOrderLinks: { ...pendingOrderLinks, [orderId]: nextLinks },
    guardianQueue: guardianQueue.map((q) => {
      if (q.id !== orderId || q.status !== "pending") return q
      return {
        ...q,
        items: remainingItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          modifiers: i.modifiers,
          unitPrice: i.totalPrice,
        })),
        total: sumItems(remainingItems),
      }
    }),
  }
}

function withLifecycle(session: TableSession): TableSession {
  return { ...session, lifecycle: deriveLifecycle(session) }
}

function deriveLifecycle(session: TableSession): TableLifecycleStatus {
  if (session.closedAt || session.lifecycle === "closed") return "closed"

  const billTotal = sumItems(session.sentOrders) + sumItems(session.cart)
  const paidTotal = session.payments.reduce((s, p) => s + p.amount, 0)

  if (session.payments.length > 0 || session.splitSnapshot) return "paying"
  if (session.sentOrders.length > 0 || session.cart.length > 0) return "ordering"
  if (session.guests.length > 0) return "seated"
  return "available"
}

function hydrateSession(raw: TableSession): TableSession {
  const base: TableSession = {
    ...emptySession(raw.tableId),
    ...raw,
    sessionId: raw.sessionId ?? createTableSessionId(),
    closedAt: raw.closedAt ?? null,
    serverId: raw.serverId ?? null,
    serverName: raw.serverName ?? null,
  }
  return {
    ...base,
    lifecycle: base.closedAt ? "closed" : deriveLifecycle(base),
  }
}

function loadInitialSessions(): Record<string, TableSession> {
  const stored = loadStoredTableSessions()
  const sessions: Record<string, TableSession> = {}
  for (const [tableId, raw] of Object.entries(stored)) {
    sessions[tableId] = hydrateSession(raw as TableSession)
  }
  return sessions
}

function persistSessions(sessions: Record<string, TableSession>) {
  saveStoredTableSessions(sessions)
}

function maybeRecordClosedCheck(session: TableSession) {
  if (!session.closedAt || session.payments.length === 0) return
  recordClosedCheck({
    tableId: session.tableId,
    sessionId: session.sessionId,
    closedAt: session.closedAt,
    sales: session.payments.reduce((s, p) => s + p.amount, 0),
    tips: session.payments.reduce((s, p) => s + p.tipAmount, 0),
    covers: countCovers(session.guests),
    payments: session.payments.map((p) => ({
      amount: p.amount,
      tipAmount: p.tipAmount,
      paidAt: p.paidAt,
    })),
  })
}

interface GuestContextType {
  restaurant: Restaurant
  menuItems: MenuItem[]
  showUsd: boolean
  tableId: string
  guestId: string
  guestName: string | null
  guestIndex: number
  cart: CartItem[]
  sentOrders: CartItem[]
  sendBatch: number
  receiptCycle: number
  lifecycle: TableLifecycleStatus
  sessionClosed: boolean
  menuAccessGranted: boolean
  grantMenuAccess: () => void
  enterTableAsGuest: (displayName?: string) => void
  resetTableForNewParty: () => void
  guests: TableGuest[]
  payments: PaymentRecord[]
  tableBalance: TableBalance
  splitSnapshot: SplitSnapshot | null
  cartOpen: boolean
  modifierItem: MenuItem | null
  payAmount: number
  tipAmount: number
  setCartOpen: (v: boolean) => void
  setModifierItem: (item: MenuItem | null) => void
  setPayAmount: (n: number) => void
  setTipAmount: (n: number) => void
  joinTable: (displayName?: string) => void
  addToCart: (item: MenuItem, quantity: number, modifiers: string[], unitPrice: number) => void
  updateCartQty: (cartId: string, qty: number) => void
  removeFromCart: (cartId: string) => void
  sendToKitchen: () => void
  cancelSentItem: (cartId: string) => { ok: true } | { ok: false; reason: GuestCancelReason }
  handleModifierConfirm: (item: MenuItem, qty: number, modifiers: string[], unitPrice: number) => void
  lockSplitForCheckout: (method: SplitMethod, guestCount: number, unitSelections?: ItemUnitSelection[]) => number
  recordPayment: (
    amount: number,
    tipAmount: number,
    method: SplitMethod,
    unitSelections?: ItemUnitSelection[],
    tender?: PaymentMethod
  ) => void
  releaseCheckoutLock: () => void

  allTables: TableRecord[]
  guardianQueue: GuardianOrder[]
  approveGuardianOrder: (orderId: string) => void
  rejectGuardianOrder: (orderId: string) => void
  getTableSession: (tableId: string) => TableSession | null

  kdsTickets: KDSTicket[]
  advanceKdsTicket: (ticketId: string) => void
  bumpKdsTicket: (ticketId: string) => void
  recallKdsTicket: (ticketId: string) => void

  staffSendToKitchen: (
    tableId: string,
    items: Array<Pick<CartItem, "menuItemId" | "name" | "basePrice" | "totalPrice" | "quantity" | "modifiers">>,
    options?: { notes?: string; orderedBy?: string }
  ) => { ok: true } | { ok: false; reason: "empty" }
  staffVoidItem: (tableId: string, cartId: string) => { ok: true } | { ok: false; reason: StaffBillReason }
  staffRemoveCartItem: (tableId: string, cartId: string) => { ok: true } | { ok: false; reason: "not_found" }
  listTableSessions: () => TableSession[]
  staffPresentBill: (
    tableId: string
  ) =>
    | { ok: true }
    | { ok: false; reason: "empty" | "cart_pending" | "guardian_pending" | "already_paid" | "already_paying" }
  staffClearTable: (tableId: string) => { ok: true } | { ok: false; reason: "unpaid" | "guardian_pending" }
  grantStaffMenuPreview: (tableId: string) => void
  saveRestaurantSettings: (overlay: RestaurantOverlay) => void
}

const GuestContext = createContext<GuestContextType | null>(null)

export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error("useGuest must be used within GuestProvider")
  return ctx
}

export function GuestProvider() {
  const params = useParams<{ tableId?: string }>()
  const [searchParams] = useSearchParams()

  const persisted = loadGuestMenuAccess()
  const restaurantIdFromUrl = searchParams.get("restaurant")
  const tableIdFromUrl = searchParams.get("table") || params.tableId
  const resolvedRestaurantId = restaurantIdFromUrl || persisted?.restaurantId || DEFAULT_RESTAURANT_ID
  const [opsTick, setOpsTick] = useState(0)
  const restaurant = useMemo(
    () => getLiveRestaurant(resolvedRestaurantId),
    [resolvedRestaurantId, opsTick]
  )
  const menuItems = useMemo(() => listAvailableMenuItems(), [opsTick])
  const showUsd = getRestaurantFeatures(restaurant.id).dualCurrency

  useEffect(() => {
    const bump = () => setOpsTick((n) => n + 1)
    window.addEventListener(OPS_EVENT, bump)
    return () => window.removeEventListener(OPS_EVENT, bump)
  }, [])
  const resolvedTableId = tableIdFromUrl || persisted?.tableId || "7"

  const [guestId] = useState(() => getOrCreateGuestId())
  const [guestName, setGuestNameState] = useState<string | null>(() => getGuestName())

  const [shared, setShared] = useState<SharedState>(() => ({
    sessions: loadInitialSessions(),
    guardianQueue: [],
    kdsTickets: [],
  }))

  const placeholderSessions = useRef<Record<string, TableSession>>({})
  const getPlaceholderSession = useCallback((tableId: string) => {
    if (!placeholderSessions.current[tableId]) {
      placeholderSessions.current[tableId] = emptySession(tableId)
    }
    return placeholderSessions.current[tableId]
  }, [])

  const currentSession = shared.sessions[resolvedTableId] ?? getPlaceholderSession(resolvedTableId)
  const lifecycle = deriveLifecycle(currentSession)
  const guestRecord = currentSession.guests.find((g) => g.guestId === guestId)
  const guestIndex = guestRecord?.index ?? 0

  const cart = currentSession.cart
  const sentOrders = currentSession.sentOrders
  const sendBatch = currentSession.sendBatch
  const receiptCycle = currentSession.receiptCycle

  const [cartOpen, setCartOpen] = useState(false)
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [menuAccessTick, setMenuAccessTick] = useState(0)

  useEffect(() => {
    const stored = shared.sessions[resolvedTableId]
    if (!stored) return

    const access = loadGuestMenuAccess()
    if (
      access?.menuAccess &&
      access.restaurantId === restaurant.id &&
      access.tableId === resolvedTableId &&
      access.tableSessionId === stored.sessionId
    ) {
      return
    }
    // Session rotated — drop stale menu token; guest must scan QR again.
    if (access?.tableSessionId && access.tableSessionId !== stored.sessionId) {
      revokeGuestMenuAccess()
      setMenuAccessTick((n) => n + 1)
    }
  }, [restaurant.id, resolvedTableId, shared.sessions[resolvedTableId]?.sessionId])

  useEffect(() => {
    applyRestaurantBrand(restaurant.brand)
    return () => resetRestaurantBrand()
  }, [restaurant.id, restaurant.brand?.primaryColor])

  const updateSession = useCallback((tableId: string, updater: (s: TableSession) => TableSession) => {
    setShared((prev) => {
      const s = prev.sessions[tableId] ?? emptySession(tableId)
      const updated = updater(s)
      const withLifecycle: TableSession = updated.closedAt
        ? { ...updated, lifecycle: "closed" }
        : { ...updated, lifecycle: deriveLifecycle(updated) }
      const nextSessions = { ...prev.sessions, [tableId]: withLifecycle }
      persistSessions(nextSessions)
      return {
        ...prev,
        sessions: nextSessions,
      }
    })
  }, [])

  const resetTableForNewParty = useCallback(() => {
    setShared((prev) => {
      const previous = prev.sessions[resolvedTableId]
      if (previous) maybeRecordClosedCheck(previous)
      const nextSessions = {
        ...prev.sessions,
        [resolvedTableId]: emptySession(resolvedTableId),
      }
      persistSessions(nextSessions)
      return {
        ...prev,
        sessions: nextSessions,
        guardianQueue: prev.guardianQueue.filter((q) => q.tableId !== resolvedTableId),
      }
    })
  }, [resolvedTableId])

  const staffClearTable = useCallback(
    (tableId: string): { ok: true } | { ok: false; reason: "unpaid" | "guardian_pending" } => {
      const hasPending = shared.guardianQueue.some(
        (q) => q.tableId === tableId && q.status === "pending"
      )
      if (hasPending) return { ok: false, reason: "guardian_pending" }

      const session = shared.sessions[tableId] ?? emptySession(tableId)
      const billTotal = sumItems(session.sentOrders) + sumItems(session.cart)
      const paidTotal = session.payments.reduce((s, p) => s + p.amount, 0)
      const remaining = Math.max(0, billTotal - paidTotal)
      if (billTotal > 0 && remaining > 0) return { ok: false, reason: "unpaid" }

      setShared((prev) => {
        const previous = prev.sessions[tableId]
        if (previous) maybeRecordClosedCheck(previous)
        const nextSessions = {
          ...prev.sessions,
          [tableId]: emptySession(tableId),
        }
        persistSessions(nextSessions)
        return {
          ...prev,
          sessions: nextSessions,
          guardianQueue: prev.guardianQueue.filter((q) => q.tableId !== tableId),
        }
      })
      return { ok: true }
    },
    [shared.guardianQueue, shared.sessions]
  )

  const staffPresentBill = useCallback(
    (
      tableId: string
    ):
      | { ok: true }
      | { ok: false; reason: "empty" | "cart_pending" | "guardian_pending" | "already_paid" | "already_paying" } => {
      const hasPending = shared.guardianQueue.some(
        (q) => q.tableId === tableId && q.status === "pending"
      )
      if (hasPending) return { ok: false, reason: "guardian_pending" }

      const session = shared.sessions[tableId] ?? emptySession(tableId)
      if (session.cart.length > 0) return { ok: false, reason: "cart_pending" }
      if (session.sentOrders.length === 0) return { ok: false, reason: "empty" }

      const billTotal = sumItems(session.sentOrders)
      const paidTotal = session.payments.reduce((s, p) => s + p.amount, 0)
      const remaining = Math.max(0, billTotal - paidTotal)
      if (billTotal > 0 && remaining === 0) return { ok: false, reason: "already_paid" }
      if (session.lifecycle === "paying" || session.splitSnapshot) {
        return { ok: false, reason: "already_paying" }
      }

      const guestCount = Math.max(
        session.guests.filter((g) => !g.guestId.startsWith("staff-")).length,
        1
      )

      updateSession(tableId, (s) => ({
        ...stampSessionWithOpenShift(s),
        lifecycle: "paying",
        splitSnapshot: s.splitSnapshot ?? createSplitSnapshot("full", billTotal, guestCount),
      }))
      return { ok: true }
    },
    [shared.guardianQueue, shared.sessions, updateSession]
  )

  const grantStaffMenuPreview = useCallback(
    (tableId: string) => {
      setShared((prev) => {
        const session = prev.sessions[tableId] ?? emptySession(tableId)
        saveGuestMenuAccess({
          restaurantId: restaurant.id,
          tableId,
          tableSessionId: session.sessionId,
          menuAccess: true,
        })
        return prev
      })
      setMenuAccessTick((n) => n + 1)
    },
    [restaurant.id]
  )

  const saveRestaurantSettings = useCallback((overlay: RestaurantOverlay) => {
    saveRestaurantOverlay(restaurant.id, overlay)
    setOpsTick((n) => n + 1)
  }, [restaurant.id])

  const grantMenuAccess = useCallback(() => {
    setShared((prev) => {
      const existing = prev.sessions[resolvedTableId]
      const session = existing ?? emptySession(resolvedTableId)
      saveGuestMenuAccess({
        restaurantId: restaurant.id,
        tableId: resolvedTableId,
        tableSessionId: session.sessionId,
        menuAccess: true,
      })
      if (existing) return prev
      const nextSessions = { ...prev.sessions, [resolvedTableId]: session }
      persistSessions(nextSessions)
      return { ...prev, sessions: nextSessions }
    })
    setMenuAccessTick((n) => n + 1)
  }, [restaurant.id, resolvedTableId])

  const enterTableAsGuest = useCallback(
    (displayName?: string) => {
      const name = displayName?.trim() || guestName || null
      if (name) {
        persistGuestName(name)
        setGuestNameState(name)
      }

      setShared((prev) => {
        const base = prev.sessions[resolvedTableId] ?? emptySession(resolvedTableId)
        const stamped = stampSessionWithOpenShift(base)
        const exists = stamped.guests.some((g) => g.guestId === guestId)
        const withGuest = exists
          ? {
              ...stamped,
              guests: stamped.guests.map((g) =>
                g.guestId === guestId && name ? { ...g, displayName: name } : g
              ),
            }
          : {
              ...stamped,
              guests: [
                ...stamped.guests,
                {
                  guestId,
                  displayName: name || `Comensal ${stamped.guests.length + 1}`,
                  joinedAt: new Date().toISOString(),
                  index: stamped.guests.length,
                },
              ],
              lifecycle: stamped.lifecycle === "available" ? ("seated" as const) : stamped.lifecycle,
            }
        const updated = withLifecycle(withGuest)
        const nextSessions = { ...prev.sessions, [resolvedTableId]: updated }
        persistSessions(nextSessions)
        saveGuestMenuAccess({
          restaurantId: restaurant.id,
          tableId: resolvedTableId,
          tableSessionId: updated.sessionId,
          menuAccess: true,
        })
        return { ...prev, sessions: nextSessions }
      })
      setMenuAccessTick((n) => n + 1)
    },
    [guestId, guestName, restaurant.id, resolvedTableId]
  )

  const joinTable = useCallback(
    (displayName?: string) => {
      const name = displayName?.trim() || guestName || null
      if (name) {
        persistGuestName(name)
        setGuestNameState(name)
      }

      updateSession(resolvedTableId, (s) => {
        const stamped = stampSessionWithOpenShift(s)
        const exists = stamped.guests.some((g) => g.guestId === guestId)
        if (exists) {
          return {
            ...stamped,
            guests: stamped.guests.map((g) =>
              g.guestId === guestId && name ? { ...g, displayName: name } : g
            ),
          }
        }
        const newGuest: TableGuest = {
          guestId,
          displayName: name || `Comensal ${stamped.guests.length + 1}`,
          joinedAt: new Date().toISOString(),
          index: stamped.guests.length,
        }
        return {
          ...stamped,
          guests: [...stamped.guests, newGuest],
          lifecycle: stamped.lifecycle === "available" ? "seated" : stamped.lifecycle,
        }
      })
    },
    [guestId, guestName, resolvedTableId, updateSession]
  )

  // Re-join returning guests who still have an active session (e.g. after partial payment).
  useEffect(() => {
    const access = loadGuestMenuAccess()
    if (
      !resolvedTableId ||
      !access?.menuAccess ||
      isTableSessionClosed(currentSession)
    ) {
      return
    }
    if (!isGuestMenuAccessValid(access, restaurant.id, resolvedTableId, currentSession.sessionId)) {
      return
    }
    joinTable()
  }, [resolvedTableId, restaurant.id, currentSession.sessionId, currentSession.closedAt, joinTable])

  const sessionClosed = isTableSessionClosed(currentSession)
  const menuAccessGranted = useMemo(
    () =>
      isGuestMenuAccessValid(
        loadGuestMenuAccess(),
        restaurant.id,
        resolvedTableId,
        currentSession.sessionId
      ),
    [restaurant.id, resolvedTableId, currentSession.sessionId, sessionClosed, menuAccessTick]
  )

  const assertCanOrder = useCallback(() => {
    if (sessionClosed) return false
    if (!menuAccessGranted) return false
    return true
  }, [sessionClosed, menuAccessGranted])

  const addToCart = useCallback(
    (item: MenuItem, quantity: number, modifiers: string[], unitPrice: number) => {
      if (!assertCanOrder()) return

      const newItem: CartItem = {
        cartId: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        basePrice: item.price,
        totalPrice: unitPrice,
        quantity,
        modifiers,
        round: 0,
        status: "cart",
        orderedBy: guestId,
        receiptCycle: currentSession.receiptCycle,
      }
      updateSession(resolvedTableId, (s) => {
        const existing = s.cart.find(
          (c) =>
            c.menuItemId === item.id &&
            c.orderedBy === guestId &&
            JSON.stringify(c.modifiers) === JSON.stringify(modifiers) &&
            c.totalPrice === unitPrice
        )
        const newCart = existing
          ? s.cart.map((c) =>
              c.cartId === existing.cartId ? { ...c, quantity: c.quantity + quantity } : c
            )
          : [...s.cart, newItem]
        return { ...s, cart: newCart, lifecycle: "ordering" }
      })
    },
    [currentSession.receiptCycle, guestId, resolvedTableId, updateSession, assertCanOrder]
  )

  const handleModifierConfirm = (item: MenuItem, qty: number, modifiers: string[], unitPrice: number) => {
    addToCart(item, qty, modifiers, unitPrice)
    setModifierItem(null)
    setTimeout(() => setCartOpen(true), 50)
  }

  const updateCartQty = (cartId: string, qty: number) => {
    updateSession(resolvedTableId, (s) => ({
      ...s,
      cart: s.cart.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)),
    }))
  }

  const removeFromCart = (cartId: string) => {
    updateSession(resolvedTableId, (s) => ({
      ...s,
      cart: s.cart.filter((i) => i.cartId !== cartId),
    }))
  }

  const sendToKitchen = () => {
    if (!assertCanOrder() || cart.length === 0) return

    const parsedTableNum = parseInt(resolvedTableId.toString().replace(/\D/g, "")) || 1
    const orderId = `gq-${Date.now()}`
    const orderTotal = sumItems(cart)
    const tableGuestCount = Math.max(currentSession.guests.length, 1)
    const catalog = loadMenuCatalog()
    const evaluation = evaluateOrderForGuardian(
      cart,
      catalog,
      tableGuestCount,
      restaurant.guardianConfig
    )
    const needsGuardian = shouldQueueForGuardian(
      cart,
      catalog,
      tableGuestCount,
      restaurant.guardianConfig
    )

    const sentAt = new Date().toISOString()
    const sendBatchNum = currentSession.sendBatch + 1

    const optimisticSentItems: CartItem[] = cart.map((c, idx) => ({
      ...c,
      cartId: `${orderId}-${idx}`,
      orderId,
      sentAt,
      round: sendBatchNum,
      status: "sent" as const,
      source: "guest",
    }))
    const linkedIds = optimisticSentItems.map((c) => c.cartId)

    setShared((prev) => {
      const session = prev.sessions[resolvedTableId] ?? emptySession(resolvedTableId)
      const newGuardianEntry: GuardianOrder | null = needsGuardian
        ? {
            id: orderId,
            tableId: resolvedTableId,
            tableNumber: parsedTableNum,
            submittedAt: new Date(),
            submittedBy: guestRecord?.displayName ?? guestName ?? undefined,
            items: cart.map((c) => ({
              name: c.name,
              quantity: c.quantity,
              modifiers: c.modifiers,
              unitPrice: c.totalPrice,
            })),
            total: orderTotal,
            status: "pending",
            reasons: evaluation.reasons,
          }
        : null

      const kdsTickets = needsGuardian
        ? prev.kdsTickets
        : [...prev.kdsTickets, ...createKdsTicketsFromCart(optimisticSentItems, parsedTableNum, sendBatchNum, orderId, loadMenuCatalog())]

      return {
        ...prev,
        guardianQueue: newGuardianEntry
          ? [...prev.guardianQueue, newGuardianEntry]
          : prev.guardianQueue,
        kdsTickets,
        sessions: (() => {
          const nextSessions = {
            ...prev.sessions,
            [resolvedTableId]: {
              ...session,
              cart: [],
              sentOrders: [...session.sentOrders, ...optimisticSentItems],
              sendBatch: sendBatchNum,
              lifecycle: "ordering" as const,
              pendingOrderLinks: needsGuardian
                ? { ...session.pendingOrderLinks, [orderId]: linkedIds }
                : session.pendingOrderLinks,
            },
          }
          persistSessions(nextSessions)
          return nextSessions
        })(),
      }
    })
    setCartOpen(false)
  }

  const cancelSentItem = useCallback(
    (cartId: string): { ok: true } | { ok: false; reason: GuestCancelReason } => {
      let result: { ok: true } | { ok: false; reason: GuestCancelReason } = {
        ok: false,
        reason: "not_found",
      }

      setShared((prev) => {
        const session = prev.sessions[resolvedTableId] ?? emptySession(resolvedTableId)
        const item = session.sentOrders.find((i) => i.cartId === cartId)
        if (!item) {
          result = { ok: false, reason: "not_found" }
          return prev
        }

        if (!item.sentAt || Date.now() - new Date(item.sentAt).getTime() > ORDER_UNDO_WINDOW_MS) {
          result = { ok: false, reason: "expired" }
          return prev
        }

        if (isItemKitchenStarted(prev.kdsTickets, cartId)) {
          result = { ok: false, reason: "kitchen_started" }
          return prev
        }

        const remaining = session.sentOrders.filter((i) => i.cartId !== cartId)
        const orderId = item.orderId ?? getItemOrderId(item)
        const { pendingOrderLinks, guardianQueue } = unlinkFromGuardian(
          prev.guardianQueue,
          session.pendingOrderLinks,
          orderId,
          cartId,
          remaining
        )
        result = { ok: true }

        return {
          ...prev,
          guardianQueue,
          kdsTickets: pullCartItemFromTickets(prev.kdsTickets, cartId),
          sessions: {
            ...prev.sessions,
            [resolvedTableId]: withLifecycle({
              ...session,
              sentOrders: remaining,
              pendingOrderLinks,
            }),
          },
        }
      })

      return result
    },
    [resolvedTableId]
  )

  const staffSendToKitchen = useCallback(
    (
      tableId: string,
      items: Array<Pick<CartItem, "menuItemId" | "name" | "basePrice" | "totalPrice" | "quantity" | "modifiers">>,
      options?: { notes?: string; orderedBy?: string }
    ): { ok: true } | { ok: false; reason: "empty" } => {
      if (items.length === 0) return { ok: false, reason: "empty" }

      const parsedTableNum = parseInt(tableId.toString().replace(/\D/g, "")) || 1
      const orderId = `gq-${Date.now()}`
      const sentAt = new Date().toISOString()
      const notes = options?.notes?.trim() ?? ""
      const preferredGuestId = options?.orderedBy

      setShared((prev) => {
        const session = prev.sessions[tableId] ?? emptySession(tableId)
        const sendBatchNum = session.sendBatch + 1
        const orderedBy =
          preferredGuestId ||
          session.guests.find((g) => g.guestId.startsWith("staff-"))?.guestId ||
          staffGuestId(tableId)

        let guests = session.guests
        if (!guests.some((g) => g.guestId === orderedBy)) {
          guests = [
            ...guests,
            {
              guestId: orderedBy,
                  displayName: orderedBy.startsWith("staff-")
                    ? getOpenStaffShift()?.staffName ?? "Mesero"
                    : `Comensal ${guests.length + 1}`,
              joinedAt: sentAt,
              index: guests.length,
            },
          ]
        }

        const sentItems: CartItem[] = items.map((item, idx) => ({
          cartId: `${orderId}-${idx}`,
          menuItemId: item.menuItemId,
          name: item.name,
          basePrice: item.basePrice,
          totalPrice: item.totalPrice,
          quantity: item.quantity,
          modifiers: item.modifiers,
          round: sendBatchNum,
          status: "sent" as const,
          orderedBy,
          receiptCycle: session.receiptCycle,
          sentAt,
          orderId,
          source: "staff",
        }))

        const nextSession = withLifecycle(
          stampSessionWithOpenShift({
            ...session,
            guests,
            cart: session.cart,
            sentOrders: [...session.sentOrders, ...sentItems],
            sendBatch: sendBatchNum,
          })
        )

        const nextSessions = {
          ...prev.sessions,
          [tableId]: nextSession,
        }
        persistSessions(nextSessions)

        return {
          ...prev,
          kdsTickets: [
            ...prev.kdsTickets,
            ...createKdsTicketsFromCart(sentItems, parsedTableNum, sendBatchNum, orderId, loadMenuCatalog(), notes),
          ],
          sessions: nextSessions,
        }
      })

      return { ok: true }
    },
    []
  )

  const staffVoidItem = useCallback(
    (tableId: string, cartId: string): { ok: true } | { ok: false; reason: StaffBillReason } => {
      let result: { ok: true } | { ok: false; reason: StaffBillReason } = { ok: false, reason: "not_found" }

      setShared((prev) => {
        const session = prev.sessions[tableId] ?? emptySession(tableId)
        const item = session.sentOrders.find((i) => i.cartId === cartId)
        if (!item) {
          result = { ok: false, reason: "not_found" }
          return prev
        }
        if (isReceiptCyclePaid(item, session.sentOrders, session.cart, session.payments)) {
          result = { ok: false, reason: "paid" }
          return prev
        }

        const remaining = session.sentOrders.filter((i) => i.cartId !== cartId)
        const orderId = item.orderId ?? getItemOrderId(item)
        const { pendingOrderLinks, guardianQueue } = unlinkFromGuardian(
          prev.guardianQueue,
          session.pendingOrderLinks,
          orderId,
          cartId,
          remaining
        )
        result = { ok: true }

        return {
          ...prev,
          guardianQueue,
          kdsTickets: pullCartItemFromTickets(prev.kdsTickets, cartId),
          sessions: {
            ...prev.sessions,
            [tableId]: withLifecycle({
              ...session,
              sentOrders: remaining,
              pendingOrderLinks,
            }),
          },
        }
      })

      return result
    },
    []
  )

  const staffRemoveCartItem = useCallback(
    (tableId: string, cartId: string): { ok: true } | { ok: false; reason: "not_found" } => {
      let result: { ok: true } | { ok: false; reason: "not_found" } = { ok: false, reason: "not_found" }
      setShared((prev) => {
        const session = prev.sessions[tableId] ?? emptySession(tableId)
        if (!session.cart.some((i) => i.cartId === cartId)) {
          result = { ok: false, reason: "not_found" }
          return prev
        }
        result = { ok: true }
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [tableId]: withLifecycle({
              ...session,
              cart: session.cart.filter((i) => i.cartId !== cartId),
            }),
          },
        }
      })
      return result
    },
    []
  )

  const approveGuardianOrder = (orderId: string) => {
    setShared((prev) => {
      const order = prev.guardianQueue.find((q) => q.id === orderId)
      if (!order) return prev

      const session = prev.sessions[order.tableId] ?? emptySession(order.tableId)
      const linkedIds = session.pendingOrderLinks[orderId] ?? []
      const linkedItems = session.sentOrders.filter((i) => linkedIds.includes(i.cartId))
      const round = linkedItems[0]?.round ?? session.sendBatch
      const newTickets = createKdsTicketsFromCart(linkedItems, order.tableNumber, round, orderId, loadMenuCatalog())
      const { [orderId]: _, ...restLinks } = session.pendingOrderLinks

      return {
        ...prev,
        guardianQueue: prev.guardianQueue.map((q) =>
          q.id === orderId ? { ...q, status: "approved" as const } : q
        ),
        kdsTickets: [...prev.kdsTickets, ...newTickets],
        sessions: {
          ...prev.sessions,
          [order.tableId]: {
            ...session,
            pendingOrderLinks: restLinks,
          },
        },
      }
    })
  }

  const rejectGuardianOrder = (orderId: string) => {
    setShared((prev) => {
      const order = prev.guardianQueue.find((q) => q.id === orderId)
      if (!order) return prev

      const session = prev.sessions[order.tableId] ?? emptySession(order.tableId)
      const linkedIds = session.pendingOrderLinks[orderId] ?? []
      const { [orderId]: _, ...restLinks } = session.pendingOrderLinks

      return {
        ...prev,
        guardianQueue: prev.guardianQueue.map((q) =>
          q.id === orderId ? { ...q, status: "rejected" as const } : q
        ),
        sessions: {
          ...prev.sessions,
          [order.tableId]: {
            ...session,
            sentOrders: session.sentOrders.filter((i) => !linkedIds.includes(i.cartId)),
            pendingOrderLinks: restLinks,
          },
        },
      }
    })
  }

  const advanceKdsTicket = (ticketId: string) => {
    setShared((prev) => ({
      ...prev,
      kdsTickets: prev.kdsTickets.map((t) => {
        if (t.id !== ticketId) return t
        const next: Record<KDSStatus, KDSStatus> = {
          pending: "preparing",
          preparing: "ready",
          ready: "delivered",
          delivered: "delivered",
        }
        return { ...t, status: next[t.status] }
      }),
    }))
  }

  const bumpKdsTicket = (ticketId: string) => {
    setShared((prev) => ({
      ...prev,
      kdsTickets: prev.kdsTickets.map((t) =>
        t.id === ticketId ? { ...t, status: "delivered" as const } : t
      ),
    }))
  }

  const recallKdsTicket = (ticketId: string) => {
    setShared((prev) => ({
      ...prev,
      kdsTickets: prev.kdsTickets.map((t) => {
        if (t.id !== ticketId) return t
        const back: Partial<Record<KDSStatus, KDSStatus>> = {
          delivered: "ready",
          ready: "preparing",
          preparing: "pending",
        }
        const previous = back[t.status]
        if (!previous) return t
        return { ...t, status: previous }
      }),
    }))
  }

  const lockSplitForCheckout = (
    method: SplitMethod,
    guestCount: number,
    unitSelections?: ItemUnitSelection[]
  ): number => {
    const openItems = getOpenBillItems(
      currentSession.sentOrders,
      currentSession.cart,
      currentSession.payments
    )
    const billTotal = sumItems(openItems)
    const paidTotal = currentSession.payments.reduce((s, p) => s + p.amount, 0)
    const remaining = Math.max(0, billTotal - paidTotal)
    const settlement = buildItemSettlementMap(
      currentSession.sentOrders,
      currentSession.cart,
      currentSession.payments
    )

    const scannedCount = getEffectiveGuestCount(currentSession.guests.length)
    const count = Math.min(Math.max(guestCount, 2), Math.max(scannedCount, 2))

    let amount = remaining
    if (method === "equal") {
      amount = getGuestEqualShare(remaining, count, guestIndex)
    } else if (method === "myItems" && unitSelections?.some((s) => s.units > 0)) {
      amount = sumDueForUnitSelections(settlement, openItems, unitSelections)
    }

    amount = Math.min(Math.max(0, amount), remaining)

    updateSession(resolvedTableId, (s) => ({
      ...s,
      lifecycle: "paying",
      splitSnapshot:
        s.splitSnapshot ??
        createSplitSnapshot(method, remaining, count),
      checkoutLock: {
        guestId,
        expiresAt: new Date(Date.now() + CHECKOUT_LOCK_MS).toISOString(),
      },
    }))

    return amount
  }

  const recordPayment = (
    amount: number,
    tip: number,
    method: SplitMethod,
    unitSelections?: ItemUnitSelection[],
    tender?: PaymentMethod
  ) => {
    updateSession(resolvedTableId, (s) => {
      const targetCycle = getOldestUnpaidReceiptCycle(s.sentOrders, s.cart, s.payments)
      const payment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        guestId,
        guestName: guestRecord?.displayName ?? "Comensal",
        amount,
        tipAmount: tip,
        splitMethod: method,
        paidAt: new Date().toISOString(),
        receiptCycle: targetCycle,
        ...(tender ? { tender } : {}),
        ...(method === "myItems" && unitSelections?.some((sel) => sel.units > 0)
          ? { itemSelections: unitSelections.filter((sel) => sel.units > 0) }
          : {}),
      }
      const payments = [...s.payments, payment]
      const billTotal = sumItems(s.sentOrders) + sumItems(s.cart)
      const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0)
      const remaining = Math.max(0, billTotal - paidTotal)
      const isTabFullyPaid = billTotal > 0 && remaining === 0
      const nextReceiptCycle = nextReceiptCycleAfterPayment(s.payments, targetCycle, s.receiptCycle)

      if (isTabFullyPaid) {
        revokeGuestMenuAccess()
      }

      const next: TableSession = {
        ...stampSessionWithOpenShift(s),
        payments,
        receiptCycle: nextReceiptCycle,
        lifecycle: isTabFullyPaid ? "closed" : "paying",
        closedAt: isTabFullyPaid ? new Date().toISOString() : s.closedAt,
        checkoutLock: null,
        splitSnapshot: isTabFullyPaid ? null : s.splitSnapshot,
      }

      if (isTabFullyPaid) maybeRecordClosedCheck(next)
      return next
    })
  }

  const releaseCheckoutLock = useCallback(() => {
    updateSession(resolvedTableId, (s) => ({
      ...s,
      checkoutLock: s.checkoutLock?.guestId === guestId ? null : s.checkoutLock,
    }))
  }, [updateSession, resolvedTableId, guestId])

  const tableBalance = useMemo((): TableBalance => {
    const billTotal = sumItems(currentSession.sentOrders) + sumItems(currentSession.cart)
    const paidTotal = currentSession.payments.reduce((s, p) => s + p.amount, 0)
    const paidGuestIds = new Set(currentSession.payments.map((p) => p.guestId))
    const locked = currentSession.splitSnapshot?.lockedSubtotal ?? billTotal
    const shares =
      currentSession.splitSnapshot?.equalShares ??
      Array.from({ length: Math.max(currentSession.guests.length, 1) }, () =>
        Math.floor(locked / Math.max(currentSession.guests.length, 1))
      )
    const tipPoolRemainder = shares.reduce((s, sh, i) => {
      const base = Math.floor(locked / shares.length)
      return i === shares.length - 1 ? s : s
    }, 0)

    return {
      billTotal,
      paidTotal,
      remaining: Math.max(0, billTotal - paidTotal),
      paidGuestCount: paidGuestIds.size,
      activeGuestCount: currentSession.guests.length,
      tipPoolRemainder,
    }
  }, [currentSession])

  const allTables = useMemo(() => {
    const statusMap: Record<TableLifecycleStatus, TableRecord["status"]> = {
      available: "available",
      seated: "open",
      ordering: "open",
      paying: "processing",
      paid: "closed",
      closed: "closed",
    }

    return FLOOR_TABLES.map((t) => {
      const session = shared.sessions[t.number.toString()]
      const billTotal = session ? sumItems(session.sentOrders) + sumItems(session.cart) : 0
      const hasPending = shared.guardianQueue.some(
        (q) => q.tableId === t.number.toString() && q.status === "pending"
      )
      const lifecycle = session ? deriveLifecycle(session) : "available"
      const firstJoined = session?.guests[0]?.joinedAt

      return applyCatalogToFloorTable({
        ...t,
        status: statusMap[lifecycle],
        billTotal,
        hasGuardianPending: hasPending,
        guestCount: session?.guests.length ?? 0,
        openedAt: firstJoined ? new Date(firstJoined) : null,
        server: session?.serverName ?? t.server,
      } as TableRecord)
    })
  }, [shared, opsTick])

  const getTableSession = (tableId: string) => shared.sessions[tableId] ?? null
  const listTableSessions = useCallback(() => Object.values(shared.sessions), [shared.sessions])

  return (
    <GuestContext.Provider
      value={{
        restaurant,
        menuItems,
        showUsd,
        tableId: resolvedTableId,
        guestId,
        guestName,
        guestIndex,
        cart,
        sentOrders,
        sendBatch,
        receiptCycle,
        lifecycle,
        sessionClosed,
        menuAccessGranted,
        grantMenuAccess,
        enterTableAsGuest,
        resetTableForNewParty,
        guests: currentSession.guests,
        payments: currentSession.payments,
        tableBalance,
        splitSnapshot: currentSession.splitSnapshot,
        cartOpen,
        modifierItem,
        payAmount,
        tipAmount,
        setCartOpen,
        setModifierItem,
        setPayAmount,
        setTipAmount,
        joinTable,
        addToCart,
        updateCartQty,
        removeFromCart,
        sendToKitchen,
        cancelSentItem,
        handleModifierConfirm,
        lockSplitForCheckout,
        recordPayment,
        releaseCheckoutLock,
        allTables,
        guardianQueue: shared.guardianQueue,
        approveGuardianOrder,
        rejectGuardianOrder,
        getTableSession,
        listTableSessions,
        kdsTickets: shared.kdsTickets,
        advanceKdsTicket,
        bumpKdsTicket,
        recallKdsTicket,
        staffSendToKitchen,
        staffVoidItem,
        staffRemoveCartItem,
        staffPresentBill,
        staffClearTable,
        grantStaffMenuPreview,
        saveRestaurantSettings,
      }}
    >
      <Outlet />
    </GuestContext.Provider>
  )
}
