import { useState, useRef, useEffect } from "react"
import { ShoppingCart, Star, ChevronDown } from "lucide-react"
import PortalSwitcher from "./PortalSwitcher"
import RestaurantLogo from "./RestaurantLogo"
import { CATEGORIES } from "../data/menuData"
import { formatCRC, formatUSD } from "../utils/format"
import { menuItemImageStyle } from "../utils/menuImage"
import type { CartItem, MenuItem, Restaurant, TableGuest } from "../types"
import type { CategoryId } from "../data/menuData"

interface MenuScreenProps {
  restaurant: Restaurant
  tableId: string
  guestName: string | null
  guests: TableGuest[]
  cart: CartItem[]
  onAddItem: (item: MenuItem) => void
  onOpenCart: () => void
  onViewOrders: () => void
  sentOrders: CartItem[]
  /** Remaining balance after payments (sent + cart). */
  openTotal: number
  previewMode?: boolean
  menuItems: MenuItem[]
  showUsd?: boolean
}

export default function MenuScreen({
  restaurant,
  tableId,
  guestName,
  guests,
  cart,
  onAddItem,
  onOpenCart,
  onViewOrders,
  sentOrders,
  openTotal,
  previewMode = false,
  menuItems,
  showUsd = true,
}: MenuScreenProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("entradas")
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tabsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isManualScrollRef = useRef(false)
  const manualScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const hasSentOrders = sentOrders.length > 0
  const floatingAmount = cartCount > 0 ? cartTotal : openTotal
  const scrollToCategory = (catId: CategoryId) => {
    setActiveCategory(catId)
    const el = categoryRefs.current[catId]
    const container = contentRef.current
    if (!el) return

    // Prevent the scroll-tracking listener below from fighting this
    // programmatic scroll and snapping activeCategory back.
    isManualScrollRef.current = true
    if (manualScrollTimeoutRef.current) clearTimeout(manualScrollTimeoutRef.current)
    manualScrollTimeoutRef.current = setTimeout(() => {
      isManualScrollRef.current = false
    }, 700)

    // If the intended container is actually scrollable (its content overflows
    // its own box), scroll it directly. Otherwise (e.g. the page/window ended
    // up being the real scrolling element due to a layout quirk), fall back
    // to scrolling the window using the element's viewport position.
    const containerScrollable = !!container && container.scrollHeight > container.clientHeight + 1

    if (container && containerScrollable) {
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const relativeTop = elRect.top - containerRect.top + container.scrollTop
      // Adjust topOffset to account for the sticky header height (~150px)
      const topOffset = Math.max(relativeTop - 10, 0)
      container.scrollTo({ top: topOffset, behavior: "smooth" })
    } else {
      const elRect = el.getBoundingClientRect()
      const headerOffset = 150
      const targetY = window.scrollY + elRect.top - headerOffset
      window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" })
    }
  }


  // Track active category on scroll
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handleScroll = () => {
      if (isManualScrollRef.current) return
      let current: CategoryId = "entradas"
      // We use a slightly different offset to detect the current section
      const scrollPos = el.scrollTop + 100 
      
      for (const cat of CATEGORIES) {
        const ref = categoryRefs.current[cat.id]
        if (ref && ref.offsetTop <= scrollPos) {
          current = cat.id as CategoryId
        }
      }
      setActiveCategory(current)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])


  // Scroll active tab into view
  useEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return
    const activeTab = tabs.querySelector(`[data-cat="${activeCategory}"]`) as HTMLElement
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [activeCategory])

  return (
    <div className="flex flex-col flex-1 bg-background overflow-hidden h-full">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="safe-top bg-card border-b border-border sticky top-0 z-30 flex-shrink-0">
        <div className="px-4 pt-2 pb-0 sm:pt-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <RestaurantLogo restaurant={restaurant} size="sm" className="shadow-none" />
                <h1
                  className="text-foreground tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                >
                  {restaurant.name}
                </h1>
              </div>
              <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>
                {restaurant.tagline}
              </p>
              {guestName && (
                <span
                  className="inline-flex items-center mt-1.5 bg-primary/10 text-primary-on-light px-2.5 py-0.5 rounded-full"
                  style={{ fontSize: "0.72rem", fontWeight: 700 }}
                >
                  Hola, {guestName}
                </span>
              )}
              {!guestName && guests.length > 0 && (
                <span className="text-muted-foreground mt-1" style={{ fontSize: "0.68rem" }}>
                  {guests.length} {guests.length === 1 ? "comensal" : "comensales"} en la mesa
                </span>
              )}
            </div>
              <div className="flex flex-col items-end gap-2">
                {!previewMode && <PortalSwitcher />}

                <button
                  onClick={cartCount > 0 && !previewMode ? onOpenCart : onViewOrders}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <div className="relative">
                    <ShoppingCart size={16} />
                    {(cartCount > 0 || hasSentOrders) && (
                      <span
                        className="absolute -top-1.5 -right-1.5 bg-white text-primary w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ fontSize: "0.55rem", fontWeight: 800, border: "1px solid currentColor" }}
                      >
                        {cartCount > 0 ? cartCount : sentOrders.reduce((s, i) => s + i.quantity, 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>
                      Mis Pedidos
                    </span>
                    <span style={{ fontSize: "0.55rem", opacity: 0.8 }}>
                      My Orders
                    </span>
                  </div>
                  <ChevronDown size={14} className="opacity-70" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span
                      className="bg-muted text-foreground px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full"
                      style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.75rem" }}
                    >
                      Mesa #{tableId}
                    </span>
                    <span className="text-muted-foreground mt-0.5" style={{ fontSize: "0.68rem" }}>
                      1 USD = ₡{restaurant.exchangeRate}
                    </span>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Category tabs */}
        <div
          ref={tabsRef}
          className="flex gap-1 px-4 pt-2 pb-2 sm:pt-3 sm:pb-3 overflow-x-auto no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => scrollToCategory(cat.id as CategoryId)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}
              style={{ fontSize: "0.82rem", fontWeight: 600, minHeight: "36px" }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              {activeCategory === cat.id && (
                <span style={{ fontSize: "0.65rem", opacity: 0.75 }}>{cat.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pb-32 relative"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {CATEGORIES.map((cat) => {
          const items = menuItems.filter((i) => i.category === cat.id)
          return (
            <div
              key={cat.id}
              ref={(el) => {
                categoryRefs.current[cat.id] = el
              }}
            >
              <div className="px-4 pt-6 pb-3">
                <div className="flex items-baseline gap-2">
                  <h2
                    className="text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                  >
                    {cat.emoji} {cat.label}
                  </h2>
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    {cat.sublabel}
                  </span>
                </div>
              </div>
              <div className="px-4 flex flex-col gap-3">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    exchangeRate={restaurant.exchangeRate}
                    imgError={imgErrors[item.id] || false}
                    onImgError={() => setImgErrors((p) => ({ ...p, [item.id]: true }))}
                    onAdd={() => onAddItem(item)}
                    cartQty={cart
                      .filter((c) => c.menuItemId === item.id)
                      .reduce((s, c) => s + c.quantity, 0)}
                    previewMode={previewMode}
                    showUsd={showUsd}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>

      {/* ── Floating cart button ──────────────────────────────────────── */}
      {(cartCount > 0 || hasSentOrders) && (
        <div className="absolute bottom-0 left-0 w-full px-4 pb-4 safe-bottom z-40 pointer-events-none">
          <button
            onClick={cartCount > 0 && !previewMode ? onOpenCart : onViewOrders}
            className="pointer-events-auto w-full flex items-center justify-between bg-primary text-primary-foreground px-5 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
            style={{ minHeight: "58px", fontFamily: "Outfit, sans-serif" }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart size={22} />
                {(cartCount > 0 || hasSentOrders) && (
                  <span
                    className="absolute -top-2 -right-2 bg-white text-primary w-5 h-5 rounded-full flex items-center justify-center badge-pop"
                    style={{ fontSize: "0.65rem", fontWeight: 800 }}
                  >
                    {cartCount > 0 ? cartCount : sentOrders.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: "1rem", display: "block" }}>
                  {previewMode ? "Ver pedidos de la mesa" : cartCount > 0 ? "Ver carrito" : "Ver mi orden"}
                </span>
                <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>
                  {previewMode ? "Staff preview" : cartCount > 0 ? "View Cart" : "View My Order"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                {formatCRC(floatingAmount)}
              </span>
              {showUsd && (
                <span style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                  {formatUSD(floatingAmount, restaurant.exchangeRate)}
                </span>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Menu Item Card ─────────────────────────────────────────────────────────────
interface MenuItemCardProps {
  item: MenuItem
  exchangeRate: number
  imgError: boolean
  onImgError: () => void
  onAdd: () => void
  cartQty: number
  previewMode?: boolean
  showUsd?: boolean
}

function MenuItemCard({ item, exchangeRate, imgError, onImgError, onAdd, cartQty, previewMode = false, showUsd = true }: MenuItemCardProps) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border flex gap-0 shadow-sm">
      {/* Image */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-muted self-center m-2 sm:m-3 rounded-xl overflow-hidden">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            style={menuItemImageStyle(item)}
            onError={onImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {item.category === "entradas"
              ? "🥗"
              : item.category === "platos"
                ? "🍽️"
                : item.category === "bebidas"
                  ? "🥤"
                  : "🍮"}
          </div>
        )}
        {item.popular && (
          <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <Star size={9} fill="white" />
            <span style={{ fontSize: "0.6rem", fontWeight: 700 }}>Popular</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 py-3 pr-3 flex flex-col justify-between">
        <div>
          <h3
            className="text-foreground leading-tight"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.95rem" }}
          >
            {item.name}
          </h3>
          <p
            className="text-muted-foreground mt-1 leading-snug"
            style={{ fontSize: "0.72rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <span
              className="text-foreground"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}
            >
              {formatCRC(item.price)}
            </span>
            {showUsd && (
              <span className="text-muted-foreground ml-1.5" style={{ fontSize: "0.72rem" }}>
                {formatUSD(item.price, exchangeRate)}
              </span>
            )}
          </div>

          {!previewMode ? (
            <button
              onClick={onAdd}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-xl transition-all active:scale-95 ${
                cartQty > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
              style={{ minHeight: "36px", fontWeight: 700, fontSize: "0.82rem" }}
            >
              {cartQty > 0 ? (
                <>
                  <ShoppingCart size={14} />
                  <span>{cartQty}</span>
                </>
              ) : (
                <span style={{ lineHeight: 1 }}>+ Agregar <span style={{ fontSize: "0.65em", opacity: 0.75, display: "block" }}>Add</span></span>
              )}
            </button>
          ) : cartQty > 0 ? (
            <span className="text-caption text-muted-foreground font-semibold">{cartQty} en carrito</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
