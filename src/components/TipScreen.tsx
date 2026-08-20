import { useState, useMemo } from "react"
import { ChevronLeft, Heart } from "lucide-react"
import type { TaxConfig } from "../types"
import { formatCRC, formatUSD } from "../utils/format"
import { calculateTaxBreakdown } from "../utils/tax"

interface TipScreenProps {
  payAmount: number
  taxConfig: TaxConfig
  tipAmount?: number
  onBack: () => void
  onContinue: (tipAmount: number) => void
}

const TIP_PRESETS = [
  { label: "10%", value: 10 },
  { label: "12%", value: 12 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
]

export default function TipScreen({
  payAmount,
  taxConfig,
  tipAmount: fixedTip,
  onBack,
  onContinue,
}: TipScreenProps) {
  const [selectedPercent, setSelectedPercent] = useState<number | null>(15)
  const [customTip, setCustomTip] = useState("")
  const [mode, setMode] = useState<"percent" | "custom" | "none">("percent")
  const readOnly = fixedTip !== undefined

  const getTipAmount = (): number => {
    if (readOnly) return fixedTip
    if (mode === "none") return 0
    if (mode === "custom") {
      const v = parseInt(customTip.replace(/\D/g, ""), 10)
      return isNaN(v) ? 0 : v
    }
    if (mode === "percent" && selectedPercent !== null) {
      return Math.round(payAmount * (selectedPercent / 100))
    }
    return 0
  }

  const tipAmount = getTipAmount()
  const breakdown = useMemo(
    () => calculateTaxBreakdown(payAmount, taxConfig, tipAmount),
    [payAmount, taxConfig, tipAmount]
  )

  return (
    <div className="flex flex-col h-full bg-background screen-fade">
      <header className="safe-top bg-card border-b border-border px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:opacity-70"
          >
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1
              className="text-foreground"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.15rem" }}
            >
              Propina <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>/ Tip</span>
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              100% va directo a nuestro equipo · Goes to our team
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-36 px-4">
        <div className="mt-6 bg-card rounded-2xl border border-border p-5 text-center">
          <p className="text-muted-foreground mb-1" style={{ fontSize: "0.8rem" }}>
            Subtotal a pagar <span style={{ opacity: 0.65 }}>/ Amount Due</span>
          </p>
          <p
            className="text-foreground"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "2rem" }}
          >
            {formatCRC(payAmount)}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
            {formatUSD(payAmount)}
          </p>
        </div>

        {!readOnly && (
          <>
            <div className="mt-5 flex items-center gap-3 bg-secondary rounded-2xl px-4 py-3.5">
              <Heart size={18} className="text-primary flex-shrink-0" fill="#F97316" />
              <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                Tu propina hace una gran diferencia para nuestro equipo. ¡Muchas gracias!
              </p>
            </div>

            <div className="mt-5">
              <p className="text-muted-foreground mb-3" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                PORCENTAJE DE PROPINA
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TIP_PRESETS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setMode("percent")
                      setSelectedPercent(value)
                    }}
                    className={`flex flex-col items-center justify-center py-3.5 rounded-2xl border transition-all active:scale-95 ${
                      mode === "percent" && selectedPercent === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                    style={{ minHeight: "72px" }}
                  >
                    <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem" }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        marginTop: "2px",
                        opacity: mode === "percent" && selectedPercent === value ? 1 : 0.6,
                      }}
                    >
                      {formatCRC(Math.round(payAmount * (value / 100)))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setMode("custom")}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all ${
                  mode === "custom" ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    mode === "custom" ? "border-primary" : "border-border"
                  }`}
                >
                  {mode === "custom" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.92rem" }}>
                  Monto personalizado
                </span>
              </button>
              {mode === "custom" && (
                <div className="mt-2 relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                  >
                    ₡
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-card border border-primary rounded-xl pl-9 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                  />
                </div>
              )}
            </div>

            <div className="mt-3">
              <button
                onClick={() => setMode("none")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left ${
                  mode === "none" ? "border-border bg-muted" : "border-border bg-card"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    mode === "none" ? "border-muted-foreground" : "border-border"
                  }`}
                >
                  {mode === "none" && <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />}
                </div>
                <span className="text-muted-foreground" style={{ fontSize: "0.88rem", fontWeight: 500 }}>
                  Sin propina <span style={{ opacity: 0.65, fontSize: "0.85em" }}>/ No Tip</span>
                </span>
              </button>
            </div>
          </>
        )}

        <div className="mt-5 bg-card rounded-2xl border border-border p-4">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>Subtotal</span>
            <span className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              {formatCRC(breakdown.subtotal)}
            </span>
          </div>
          {taxConfig.enabled && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                  Servicio ({taxConfig.serviceTaxRate}%) <span style={{ opacity: 0.65 }}>/ Service</span>
                </span>
                <span className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {formatCRC(breakdown.serviceTax)}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                  IVA ({taxConfig.ivaRate}%)
                </span>
                <span className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {formatCRC(breakdown.iva)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between mb-2 pb-2 border-b border-border">
            <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
              Propina {!readOnly && mode === "percent" && selectedPercent ? `(${selectedPercent}%)` : ""}
            </span>
            <span
              className={tipAmount > 0 ? "text-primary" : "text-muted-foreground"}
              style={{ fontSize: "0.82rem", fontWeight: 600 }}
            >
              {tipAmount > 0 ? formatCRC(tipAmount) : "—"}
            </span>
          </div>
          <div className="flex justify-between pt-2.5">
            <span className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem" }}>
              Total a pagar
            </span>
            <div className="text-right">
              <p className="text-foreground" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>
                {formatCRC(breakdown.total)}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {formatUSD(breakdown.total)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 safe-bottom z-40">
          <button
            onClick={() => onContinue(tipAmount)}
            className="w-full bg-primary text-primary-foreground rounded-2xl flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-transform"
            style={{ minHeight: "58px", fontFamily: "Outfit, sans-serif" }}
          >
            <div className="flex flex-col items-start leading-tight">
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Continuar al pago</span>
              <span style={{ fontSize: "0.65rem", opacity: 0.82 }}>Continue to Payment</span>
            </div>
            <div className="text-right">
              <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>{formatCRC(breakdown.total)}</span>
              <p style={{ fontSize: "0.7rem", opacity: 0.85 }}>{formatUSD(breakdown.total)}</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
