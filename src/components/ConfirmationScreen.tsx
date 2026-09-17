import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Star, ExternalLink, Wallet, Share2, UtensilsCrossed, ChevronLeft, Receipt } from "lucide-react"
import type { CartItem, TableBalance } from "../types"
import { formatCRC, formatUSD } from "../utils/format"
import { sumItems } from "../utils/split"

interface ConfirmationScreenProps {
  allItems: CartItem[]
  payAmount: number
  tipAmount: number
  tableBalance: TableBalance
  restaurantName: string
}

const ORDER_NUMBER = `LT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-007`

export default function ConfirmationScreen({
  allItems,
  payAmount,
  tipAmount,
  tableBalance,
  restaurantName,
}: ConfirmationScreenProps) {
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewSent, setReviewSent] = useState(false)
  const [walletSaved, setWalletSaved] = useState(false)

  const paymentTotal = payAmount + tipAmount
  const billTotal = sumItems(allItems)
  const hasRemaining = tableBalance.remaining > 0

  const handleStarClick = (star: number) => {
    setRating(star)
    if (star >= 4) {
      setTimeout(() => {
        setReviewSent(true)
      }, 800)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="flex flex-col min-h-full bg-confirm-green">
      {/* Hero success area */}
      <div className="flex flex-col items-center pt-16 pb-10 px-6 safe-top">
        <div className="check-circle w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-confirm-green">
              <path
                className="check-path"
                d="M7 17l6 6 12-12"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1
          className="text-white text-center"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.75rem" }}
        >
          ¡Pago exitoso!
        </h1>
        <p className="text-white/60 text-center" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
          Payment Successful
        </p>
        <p className="text-white/80 text-center mt-1.5" style={{ fontSize: "0.9rem" }}>
          Gracias por tu visita a {restaurantName}
        </p>
        <p className="text-white/55 text-center" style={{ fontSize: "0.72rem" }}>
          Thank you for dining with us
        </p>

        {/* Order number */}
        <div className="mt-4 bg-white/15 rounded-xl px-4 py-2">
          <span className="text-white" style={{ fontSize: "0.8rem", fontFamily: "Outfit, sans-serif", fontWeight: 700, letterSpacing: "0.05em" }}>
            Pedido {ORDER_NUMBER}
          </span>
        </div>

        {/* Amount paid */}
        <div className="mt-5 text-center">
          <p className="text-white/70" style={{ fontSize: "0.8rem" }}>Total pagado <span style={{ opacity: 0.7 }}>/ Amount Paid</span></p>
          <p
            className="text-white"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "2.2rem" }}
          >
            {formatCRC(paymentTotal)}
          </p>
          <p className="text-white/70" style={{ fontSize: "0.85rem" }}>
            {formatUSD(paymentTotal)}
          </p>
          {hasRemaining && (
            <p className="text-white/80 mt-2" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
              Restante en mesa: {formatCRC(tableBalance.remaining)}
            </p>
          )}
        </div>
      </div>

      {/* White card area */}
      <div
        className="flex-1 bg-background rounded-t-3xl px-5 pt-6 pb-10 safe-bottom"
        style={{ minHeight: "60vh" }}
      >
        {hasRemaining && (
          <button
            onClick={() => navigate("/checkout")}
            className="w-full mb-5 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-primary bg-primary/5 text-primary-on-light active:scale-[0.98] transition-transform"
            style={{ fontWeight: 700, fontSize: "0.88rem" }}
          >
            <Receipt size={18} />
            Ver cuenta · Pagar restante {formatCRC(tableBalance.remaining)}
          </button>
        )}

        {!hasRemaining ? (
          <div className="mb-5 rounded-2xl border border-border bg-muted px-4 py-3 text-center">
            <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              Cuenta pagada por completo · esta sesión ha finalizado.
            </p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.72rem" }}>
              Full tab paid — scan the table QR to order again.
            </p>
          </div>
        ) : (
          <button
            onClick={() => navigate("/menu")}
            className="w-full mb-5 flex items-center gap-2 py-2.5 text-muted-foreground active:opacity-70"
            style={{ fontSize: "0.82rem", fontWeight: 600 }}
          >
            <ChevronLeft size={16} />
            Volver al menú / Back to menu
          </button>
        )}
        {/* Receipt */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={15} className="text-muted-foreground" />
            <p
              className="text-muted-foreground"
              style={{ fontSize: "0.78rem", fontWeight: 700 }}
            >
              RESUMEN DE CONSUMO <span style={{ opacity: 0.65, fontWeight: 400 }}>/ Order Summary</span>
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {allItems.slice(0, 5).map((item, idx) => (
              <div
                key={item.cartId}
                className={`px-4 py-3 flex justify-between gap-2 ${
                  idx < Math.min(allItems.length, 5) - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-foreground" style={{ fontSize: "0.85rem" }}>
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                </span>
                <span
                  className="text-foreground flex-shrink-0"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  {formatCRC(item.totalPrice * item.quantity)}
                </span>
              </div>
            ))}
            {allItems.length > 5 && (
              <div className="px-4 py-2 border-t border-border">
                <p className="text-muted-foreground text-center" style={{ fontSize: "0.75rem" }}>
                  + {allItems.length - 5} artículos más
                </p>
              </div>
            )}
            <div className="bg-muted border-t border-border px-4 py-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>Total cuenta</span>
                <span className="text-foreground" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  {formatCRC(billTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>Este pago</span>
                <span className="text-foreground" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  {formatCRC(payAmount)}
                </span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>Propina</span>
                  <span className="text-foreground" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    {formatCRC(tipAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                  Pagado ahora
                </span>
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>
                  {formatCRC(paymentTotal)}
                </span>
              </div>
              {hasRemaining && (
                <div className="flex justify-between pt-1 border-t border-border/60">
                  <span className="text-primary" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    Restante en mesa
                  </span>
                  <span className="text-primary" style={{ fontSize: "0.78rem", fontWeight: 800 }}>
                    {formatCRC(tableBalance.remaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review booster */}
        <div className="mb-5 bg-card rounded-2xl border border-border p-4">
          {!reviewSent ? (
            <>
              <p
                className="text-foreground mb-1"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}
              >
                ¿Cómo fue tu experiencia? <span style={{ fontWeight: 400, fontSize: "0.75rem", opacity: 0.65 }}>/ How was your experience?</span>
              </p>
              <p className="text-muted-foreground mb-4" style={{ fontSize: "0.78rem" }}>
                Tu opinión nos ayuda a mejorar · Your feedback helps us improve
              </p>
              <div className="flex gap-2 justify-center mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform active:scale-110"
                    style={{ fontSize: "2.2rem" }}
                  >
                    <Star
                      size={36}
                      fill={displayRating >= star ? "currentColor" : "none"}
                      className={displayRating >= star ? "text-status-yellow" : "text-border"}
                    />
                  </button>
                ))}
              </div>
              {rating >= 4 && (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    ¡Nos alegra mucho! ¿Nos dejas una reseña?
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 bg-[#4285F4] text-white py-2.5 rounded-xl active:opacity-80 transition-opacity"
                      style={{ fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z" />
                      </svg>
                      Google
                      <ExternalLink size={11} />
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 bg-[#34E0A1] text-[#000000] py-2.5 rounded-xl active:opacity-80 transition-opacity"
                      style={{ fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      TripAdvisor
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              )}
              {rating > 0 && rating < 4 && (
                <div className="mt-2 text-center">
                  <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                    Lamentamos tu experiencia. ¿Podemos mejorar algo?
                  </p>
                  <button
                    className="mt-2 text-primary"
                    style={{ fontSize: "0.82rem", fontWeight: 700 }}
                  >
                    Enviar comentario
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-3">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={22}
                    fill={s <= rating ? "currentColor" : "none"}
                    className={s <= rating ? "text-status-yellow" : "text-border"}
                  />
                ))}
              </div>
              <p
                className="text-foreground text-center"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
              >
                ¡Gracias por tu calificación!
              </p>
              <p className="text-muted-foreground text-center mt-1" style={{ fontSize: "0.78rem" }}>
                Hemos abierto Google Reviews en tu navegador
              </p>
            </div>
          )}
        </div>

        {/* Wallet / Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setWalletSaved(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
              walletSaved
                ? "bg-confirm-green text-white border-confirm-green"
                : "bg-card border-border text-foreground"
            }`}
            style={{ minHeight: "52px", fontWeight: 700, fontSize: "0.85rem" }}
          >
            <Wallet size={17} />
            <div className="flex flex-col items-start leading-tight">
              <span>{walletSaved ? "¡Guardado!" : "Guardar en Wallet"}</span>
              <span style={{ fontSize: "0.65rem", opacity: 0.75 }}>{walletSaved ? "Saved!" : "Save to Wallet"}</span>
            </div>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-muted text-foreground border border-border active:scale-[0.98] transition-all"
            style={{ minHeight: "52px", fontWeight: 700, fontSize: "0.85rem" }}
          >
            <Share2 size={17} />
            <div className="flex flex-col items-start leading-tight">
              <span>Compartir</span>
              <span style={{ fontSize: "0.65rem", opacity: 0.65 }}>Share</span>
            </div>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-muted-foreground mt-6" style={{ fontSize: "0.72rem" }}>
          Recibo #{ORDER_NUMBER} · {new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  )
}
