import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
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
} from "../types"
import { getRestaurantById, DEFAULT_RESTAURANT_ID } from "../data/restaurants"
import { FLOOR_TABLES, type TableRecord, type GuardianOrder, type KDSTicket, type KDSStatus } from "../data/mockData"
import { MENU_ITEMS } from "../data/menuData"
import { getOrCreateGuestId, getGuestName, setGuestName as persistGuestName } from "../utils/guestSession"
import { shouldQueueForGuardian, evaluateOrderForGuardian } from "../utils/guardian"
import { createKdsTicketsFromCart } from "../utils/kds"
import { ORDER_UNDO_WINDOW_MS } from "../utils/order"
import {
  sumItems,
  getGuestEqualShare,
  sumGuestItems,
  createSplitSnapshot,
  type SplitSnapshot,
} from "../utils/split"
import {
  getOldestUnpaidReceiptCycle,
  nextReceiptCycleAfterPayment,
  getOpenBillItems,
} from "../utils/billing"
import { getEffectiveGuestCount } from "../utils/devFlags"

const STORAGE_KEY = "cr-pat-guest-session"
const CHECKOUT_LOCK_MS = 8 * 60 * 1000 // 8 minutes

export interface TableSession {
  tableId: string
  lifecycle: TableLifecycleStatus
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
}

interface SharedState {
  sessions: Record<string, TableSession>
  guardianQueue: GuardianOrder[]
  kdsTickets: KDSTicket[]
}

interface PersistedState {
  restaurantId: string
  tableId: string
}

function emptySession(tableId: string): TableSession {
  return {
    tableId,
    lifecycle: "available",
    cart: [],
    sentOrders: [],
    sendBatch: 0,
    receiptCycle: 1,
    guests: [],
    payments: [],
    splitSnapshot: null,
    checkoutLock: null,
    pendingOrderLinks: {},
  }
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function deriveLifecycle(session: TableSession): TableLifecycleStatus {
  const billTotal = sumItems(session.sentOrders) + sumItems(session.cart)
  const paidTotal = session.payments.reduce((s, p) => s + p.amount, 0)

  if (session.lifecycle === "closed") return "closed"
  if (billTotal > 0 && paidTotal >= billTotal) return "paid"
  if (session.payments.length > 0 || session.splitSnapshot) return "paying"
  if (session.sentOrders.length > 0 || session.cart.length > 0) return "ordering"
  if (session.guests.length > 0) return "seated"
  return "available"
}

interface GuestContextType {
  restaurant: Restaurant
  tableId: string
  guestId: string
  guestName: string | null
  guestIndex: number
  cart: CartItem[]
  sentOrders: CartItem[]
  sendBatch: number
  receiptCycle: number
  lifecycle: TableLifecycleStatus
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
  cancelSentOrder: (orderId: string) => { ok: true } | { ok: false; reason: "expired" | "kitchen_started" | "not_found" }
  handleModifierConfirm: (item: MenuItem, qty: number, modifiers: string[], unitPrice: number) => void
  lockSplitForCheckout: (method: SplitMethod, guestCount: number) => number
  recordPayment: (amount: number, tipAmount: number, method: SplitMethod) => void
  releaseCheckoutLock: () => void

  allTables: TableRecord[]
  guardianQueue: GuardianOrder[]
  approveGuardianOrder: (orderId: string) => void
  rejectGuardianOrder: (orderId: string) => void
  getTableSession: (tableId: string) => TableSession | null

  kdsTickets: KDSTicket[]
  advanceKdsTicket: (ticketId: string) => void
  bumpKdsTicket: (ticketId: string) => void
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

  const persisted = loadPersisted()
  const restaurantIdFromUrl = searchParams.get("restaurant")
  const tableIdFromUrl = searchParams.get("table") || params.tableId
  const resolvedRestaurantId = restaurantIdFromUrl || persisted?.restaurantId || DEFAULT_RESTAURANT_ID
  const restaurant = getRestaurantById(resolvedRestaurantId)
  const resolvedTableId = tableIdFromUrl || persisted?.tableId || "7"

  const [guestId] = useState(() => getOrCreateGuestId())
  const [guestName, setGuestNameState] = useState<string | null>(() => getGuestName())

  const [shared, setShared] = useState<SharedState>({
    sessions: {},
    guardianQueue: [],
    kdsTickets: [],
  })

  const currentSession = shared.sessions[resolvedTableId] ?? emptySession(resolvedTableId)
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

  useEffect(() => {
    savePersisted({ restaurantId: restaurant.id, tableId: resolvedTableId })
  }, [restaurant.id, resolvedTableId])

  const updateSession = useCallback((tableId: string, updater: (s: TableSession) => TableSession) => {
    setShared((prev) => {
      const s = prev.sessions[tableId] ?? emptySession(tableId)
      const updated = updater(s)
      const withLifecycle = { ...updated, lifecycle: deriveLifecycle(updated) }
      return {
        ...prev,
        sessions: { ...prev.sessions, [tableId]: withLifecycle },
      }
    })
  }, [])

  const joinTable = useCallback(
    (displayName?: string) => {
      const name = displayName?.trim() || guestName || null
      if (name) {
        persistGuestName(name)
        setGuestNameState(name)
      }

      updateSession(resolvedTableId, (s) => {
        const exists = s.guests.some((g) => g.guestId === guestId)
        if (exists) {
          return {
            ...s,
            guests: s.guests.map((g) =>
              g.guestId === guestId && name ? { ...g, displayName: name } : g
            ),
          }
        }
        const newGuest: TableGuest = {
          guestId,
          displayName: name || `Comensal ${s.guests.length + 1}`,
          joinedAt: new Date().toISOString(),
          index: s.guests.length,
        }
        return {
          ...s,
          guests: [...s.guests, newGuest],
          lifecycle: s.lifecycle === "available" ? "seated" : s.lifecycle,
        }
      })
    },
    [guestId, guestName, resolvedTableId, updateSession]
  )

  // Auto-join when navigating directly to menu
  useEffect(() => {
    if (resolvedTableId && tableIdFromUrl) {
      joinTable()
    }
  }, [resolvedTableId, tableIdFromUrl, joinTable])

  const addToCart = useCallback(
    (item: MenuItem, quantity: number, modifiers: string[], unitPrice: number) => {
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
    [currentSession.receiptCycle, guestId, resolvedTableId, updateSession]
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
    if (cart.length === 0) return

    const parsedTableNum = parseInt(resolvedTableId.toString().replace(/\D/g, "")) || 1
    const orderId = `gq-${Date.now()}`
    const orderTotal = sumItems(cart)
    const tableGuestCount = Math.max(currentSession.guests.length, 1)
    const evaluation = evaluateOrderForGuardian(
      cart,
      MENU_ITEMS,
      tableGuestCount,
      restaurant.guardianConfig
    )
    const needsGuardian = shouldQueueForGuardian(
      cart,
      MENU_ITEMS,
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
        : [...prev.kdsTickets, ...createKdsTicketsFromCart(cart, parsedTableNum, sendBatchNum, orderId)]

      return {
        ...prev,
        guardianQueue: newGuardianEntry
          ? [...prev.guardianQueue, newGuardianEntry]
          : prev.guardianQueue,
        kdsTickets,
        sessions: {
          ...prev.sessions,
          [resolvedTableId]: {
            ...session,
            cart: [],
            sentOrders: [...session.sentOrders, ...optimisticSentItems],
            sendBatch: sendBatchNum,
            lifecycle: "ordering",
            pendingOrderLinks: needsGuardian
              ? { ...session.pendingOrderLinks, [orderId]: linkedIds }
              : session.pendingOrderLinks,
          },
        },
      }
    })
    setCartOpen(false)
  }

  const cancelSentOrder = useCallback(
    (orderId: string): { ok: true } | { ok: false; reason: "expired" | "kitchen_started" | "not_found" } => {
      let result: { ok: true } | { ok: false; reason: "expired" | "kitchen_started" | "not_found" } = {
        ok: false,
        reason: "not_found",
      }

      setShared((prev) => {
        const session = prev.sessions[resolvedTableId] ?? emptySession(resolvedTableId)
        const batchItems = session.sentOrders.filter(
          (i) => i.orderId === orderId || i.cartId.startsWith(`${orderId}-`)
        )
        if (batchItems.length === 0) {
          result = { ok: false, reason: "not_found" }
          return prev
        }

        const sentAt = batchItems[0].sentAt
        if (!sentAt || Date.now() - new Date(sentAt).getTime() > ORDER_UNDO_WINDOW_MS) {
          result = { ok: false, reason: "expired" }
          return prev
        }

        const kdsForOrder = prev.kdsTickets.filter(
          (t) => t.id === `${orderId}-kitchen` || t.id === `${orderId}-bar`
        )
        if (kdsForOrder.some((t) => t.status !== "pending")) {
          result = { ok: false, reason: "kitchen_started" }
          return prev
        }

        const { [orderId]: _, ...restLinks } = session.pendingOrderLinks
        result = { ok: true }

        return {
          ...prev,
          guardianQueue: prev.guardianQueue.filter(
            (q) => !(q.id === orderId && q.status === "pending")
          ),
          kdsTickets: prev.kdsTickets.filter(
            (t) => t.id !== `${orderId}-kitchen` && t.id !== `${orderId}-bar`
          ),
          sessions: {
            ...prev.sessions,
            [resolvedTableId]: {
              ...session,
              sentOrders: session.sentOrders.filter(
                (i) => !batchItems.some((b) => b.cartId === i.cartId)
              ),
              pendingOrderLinks: restLinks,
            },
          },
        }
      })

      return result
    },
    [resolvedTableId]
  )

  const approveGuardianOrder = (orderId: string) => {
    setShared((prev) => {
      const order = prev.guardianQueue.find((q) => q.id === orderId)
      if (!order) return prev

      const session = prev.sessions[order.tableId] ?? emptySession(order.tableId)
      const linkedIds = session.pendingOrderLinks[orderId] ?? []
      const linkedItems = session.sentOrders.filter((i) => linkedIds.includes(i.cartId))
      const round = linkedItems[0]?.round ?? session.sendBatch
      const newTickets = createKdsTicketsFromCart(linkedItems, order.tableNumber, round, orderId)
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

  const lockSplitForCheckout = (method: SplitMethod, guestCount: number): number => {
    const openItems = getOpenBillItems(
      currentSession.sentOrders,
      currentSession.cart,
      currentSession.payments
    )
    const allItems = openItems
    const billTotal = sumItems(allItems)
    const paidTotal = currentSession.payments.reduce((s, p) => s + p.amount, 0)
    const remaining = Math.max(0, billTotal - paidTotal)
    const lockedSubtotal = currentSession.splitSnapshot?.lockedSubtotal ?? billTotal
    const splitBase = currentSession.splitSnapshot
      ? Math.max(0, lockedSubtotal - paidTotal)
      : remaining

    const scannedCount = getEffectiveGuestCount(currentSession.guests.length)
    const count = Math.min(Math.max(guestCount, 2), Math.max(scannedCount, 2))

    let amount = remaining
    if (method === "equal") {
      amount = getGuestEqualShare(splitBase, count, guestIndex)
    } else if (method === "myItems") {
      amount = sumGuestItems(allItems, guestId)
    }

    updateSession(resolvedTableId, (s) => ({
      ...s,
      lifecycle: "paying",
      splitSnapshot: s.splitSnapshot ?? createSplitSnapshot(method, lockedSubtotal, count),
      checkoutLock: {
        guestId,
        expiresAt: new Date(Date.now() + CHECKOUT_LOCK_MS).toISOString(),
      },
    }))

    return amount
  }

  const recordPayment = (amount: number, tip: number, method: SplitMethod) => {
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
      }
      const payments = [...s.payments, payment]
      const billTotal = sumItems(s.sentOrders) + sumItems(s.cart)
      const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0)
      const nextLifecycle: TableLifecycleStatus =
        paidTotal >= billTotal && billTotal > 0 ? "paid" : "paying"
      const nextReceiptCycle = nextReceiptCycleAfterPayment(s.payments, targetCycle, s.receiptCycle)

      return {
        ...s,
        payments,
        receiptCycle: nextReceiptCycle,
        lifecycle: nextLifecycle,
        checkoutLock: null,
        splitSnapshot: nextLifecycle === "paid" ? null : s.splitSnapshot,
      }
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

      return {
        ...t,
        status: statusMap[lifecycle],
        billTotal,
        hasGuardianPending: hasPending,
        guestCount: session?.guests.length ?? 0,
        openedAt: firstJoined ? new Date(firstJoined) : null,
        server: null,
      } as TableRecord
    })
  }, [shared])

  const getTableSession = (tableId: string) => shared.sessions[tableId] ?? null

  return (
    <GuestContext.Provider
      value={{
        restaurant,
        tableId: resolvedTableId,
        guestId,
        guestName,
        guestIndex,
        cart,
        sentOrders,
        sendBatch,
        receiptCycle,
        lifecycle,
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
        cancelSentOrder,
        handleModifierConfirm,
        lockSplitForCheckout,
        recordPayment,
        releaseCheckoutLock,
        allTables,
        guardianQueue: shared.guardianQueue,
        approveGuardianOrder,
        rejectGuardianOrder,
        getTableSession,
        kdsTickets: shared.kdsTickets,
        advanceKdsTicket,
        bumpKdsTicket,
      }}
    >
      <Outlet />
    </GuestContext.Provider>
  )
}
