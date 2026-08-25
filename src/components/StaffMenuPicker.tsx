import { useState, useRef, useEffect } from "react"
import { ChevronLeft, Star, ShoppingCart } from "lucide-react"
import { MENU_ITEMS, CATEGORIES, type CategoryId } from "../data/menuData"
import { formatCRC, formatUSD } from "../utils/format"
import type { MenuItem, Restaurant } from "../types"

interface StaffMenuPickerProps {
  restaurant: Restaurant
  tableNumber: number
  onClose: () => void
  onAddItem: (item: MenuItem) => void
}

export default function StaffMenuPicker({
  restaurant,
  tableNumber,
  onClose,
  onAddItem,
}: StaffMenuPickerProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("entradas")
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToCategory = (catId: CategoryId) => {
    setActiveCategory(catId)
    const el = categoryRefs.current[catId]
    const container = contentRef.current
    if (!el || !container) return
    const top = el.offsetTop - 8
    container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handleScroll = () => {
      let current: CategoryId = "entradas"
      const scrollPos = el.scrollTop + 80
      for (const cat of CATEGORIES) {
        const ref = categoryRefs.current[cat.id]
        if (ref && ref.offsetTop <= scrollPos) current = cat.id
      }
      setActiveCategory(current)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black/30">
      <div className="w-full max-w-[430px] h-full bg-background flex flex-col shadow-2xl">
        <header className="safe-top bg-card border-b border-border px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:scale-95 transition-transform"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1">
              <h2
                className="text-foreground"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
              >
                Menú
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                Mesa #{tableNumber} · {restaurant.name}
              </p>
            </div>
          </div>
          <div
            className="flex gap-1 overflow-x-auto no-scrollbar pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => scrollToCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                style={{ fontSize: "0.78rem", fontWeight: 600 }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 pb-8">
          {CATEGORIES.map((cat) => {
            const items = MENU_ITEMS.filter((i) => i.category === cat.id)
            return (
              <div
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el
                }}
              >
                <h3
                  className="text-foreground pt-5 pb-2"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
                >
                  {cat.emoji} {cat.label}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onAddItem(item)}
                      className="bg-card rounded-2xl border border-border overflow-hidden flex text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-muted m-2 rounded-xl overflow-hidden">
                        {!imgErrors[item.id] ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setImgErrors((p) => ({ ...p, [item.id]: true }))}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {cat.emoji}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-2.5 pr-3 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start gap-1.5">
                            <p
                              className="text-foreground leading-tight"
                              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.88rem" }}
                            >
                              {item.name}
                            </p>
                            {item.popular && (
                              <Star size={11} className="text-primary flex-shrink-0 mt-0.5" fill="currentColor" />
                            )}
                          </div>
                          <p
                            className="text-muted-foreground mt-0.5"
                            style={{
                              fontSize: "0.68rem",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span
                            className="text-foreground"
                            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}
                          >
                            {formatCRC(item.price)}
                            <span className="text-muted-foreground ml-1" style={{ fontWeight: 400, fontSize: "0.65rem" }}>
                              {formatUSD(item.price, restaurant.exchangeRate)}
                            </span>
                          </span>
                          <span
                            className="flex items-center gap-1 bg-muted text-foreground px-2.5 py-1 rounded-lg"
                            style={{ fontSize: "0.72rem", fontWeight: 700 }}
                          >
                            <ShoppingCart size={12} />
                            Agregar
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
