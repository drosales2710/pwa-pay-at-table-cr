import { useState, useEffect } from "react"
import { X, Minus, Plus, Trash2, ChefHat } from "lucide-react"
import type { CartItem } from "../types"
import { formatCRC, formatUSD } from "../utils/format"

interface CartDrawerProps {
  cart: CartItem[]
  open: boolean
  onClose: () => void
  onUpdateQty: (cartId: string, qty: number) => void
  onRemove: (cartId: string) => void
  onSendToKitchen: () => void
  onRequestBill: () => void
  sentOrders: CartItem[]
}

export default function CartDrawer({
  cart,
  open,
  onClose,
  onUpdateQty,
  onRemove,
  onSendToKitchen,
  onRequestBill,
  sentOrders,
}: CartDrawerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const sentTotal = sentOrders.reduce((s, i) => s + i.totalPrice * i.quantity, 0)
  const grandTotal = cartTotal + sentTotal
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        background: visible ? "rgba(28,25,23,0.45)" : "transparent",
        transition: "background 0.25s ease",
      }}
      onClick={handleBackdropClick}
    >
        <div
          className="w-full max-w-[430px] bg-card rounded-t-3xl overflow-hidden flex flex-col"
          style={{
            transform: visible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
            maxHeight: "92vh",
          }}
        >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0">
          <div>
            <h2
              className="text-foreground"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem" }}
            >
              Mi pedido <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>/ My Order</span>
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>
              {cartCount} {cartCount === 1 ? "artículo" : "artículos"} por enviar · {cartCount === 1 ? "item" : "items"} to send
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:opacity-70"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Items list */}
        <div className="overflow-y-auto flex-1 px-5">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground" style={{ fontSize: "0.9rem" }}>
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((item) => (
                <CartItemRow
                  key={item.cartId}
                  item={item}
                  onUpdateQty={onUpdateQty}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}

          {/* Sent orders summary */}
          {sentOrders.length > 0 && (
            <div className="mt-5 mb-2">
              <div className="border-t border-border pt-4">
                <p
                  className="text-muted-foreground mb-2"
                  style={{ fontSize: "0.78rem", fontWeight: 600 }}
                >
                  Ya en cocina <span style={{ opacity: 0.6, fontWeight: 400 }}>· In Kitchen</span>
                </p>
                {sentOrders.map((item) => (
                  <div key={item.cartId} className="flex justify-between py-1">
                    <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                      {formatCRC(item.totalPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pt-3 pb-3 sm:pt-4 sm:pb-4 border-t border-border safe-bottom">
          {/* Totals */}
          {cart.length > 0 && (
            <div className="bg-muted rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                  Este pedido
                </span>
                <span className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {formatCRC(cartTotal)}
                </span>
              </div>
              {sentOrders.length > 0 && (
                <>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                      Pedidos anteriores
                    </span>
                    <span className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      {formatCRC(sentTotal)}
                    </span>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 flex justify-between">
                    <span
                      className="text-foreground"
                      style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
                    >
                      Total acumulado
                    </span>
                    <div className="text-right">
                      <span
                        className="text-foreground block"
                        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}
                      >
                        {formatCRC(grandTotal)}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                        {formatUSD(grandTotal)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {sentOrders.length === 0 && (
                <div className="border-t border-border mt-2 pt-2 flex justify-between">
                  <span
                    className="text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    Total
                  </span>
                  <div className="text-right">
                    <span
                      className="text-foreground block"
                      style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1rem" }}
                    >
                      {formatCRC(cartTotal)}
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                      {formatUSD(cartTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTAs */}
          {cart.length > 0 && (
            <button
              onClick={onSendToKitchen}
              className="w-full bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-2.5 mb-2 sm:mb-3 active:scale-[0.98] transition-transform shadow-sm min-h-[52px] sm:min-h-[56px]"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}
            >
              <ChefHat size={20} />
              <div className="flex flex-col items-start leading-tight">
                <span>Enviar a cocina</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 400, opacity: 0.85 }}>Send to Kitchen</span>
              </div>
            </button>
          )}

          {grandTotal > 0 && (
            <button
              onClick={onRequestBill}
              className="w-full bg-muted text-foreground rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ minHeight: "48px", fontWeight: 700, fontSize: "0.88rem" }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span>Pedir la cuenta</span>
                <span className="text-muted-foreground" style={{ fontSize: "0.65rem", fontWeight: 400 }}>Request Bill</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cart Item Row ──────────────────────────────────────────────────────────────
interface CartItemRowProps {
  item: CartItem
  onUpdateQty: (cartId: string, qty: number) => void
  onRemove: (cartId: string) => void
}

function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-foreground leading-tight"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.9rem" }}
          >
            {item.name}
          </h4>
          <button
            onClick={() => onRemove(item.cartId)}
            className="text-muted-foreground active:text-status-red transition-colors flex-shrink-0 p-0.5"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {item.modifiers.length > 0 && (
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>
            {item.modifiers.join(" · ")}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-1 py-0.5">
            <button
              onClick={() =>
                item.quantity > 1
                  ? onUpdateQty(item.cartId, item.quantity - 1)
                  : onRemove(item.cartId)
              }
              className="w-7 h-7 flex items-center justify-center rounded active:scale-90 transition-transform"
            >
              <Minus size={12} className="text-foreground" />
            </button>
            <span
              className="text-foreground w-4 text-center"
              style={{ fontWeight: 700, fontSize: "0.85rem" }}
            >
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.cartId, item.quantity + 1)}
              className="w-7 h-7 flex items-center justify-center rounded active:scale-90 transition-transform"
            >
              <Plus size={12} className="text-foreground" />
            </button>
          </div>
          <span
            className="text-foreground"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem" }}
          >
            {formatCRC(item.totalPrice * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  )
}
