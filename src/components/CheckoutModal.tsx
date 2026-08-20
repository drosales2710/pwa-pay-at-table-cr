import { useState, useEffect, useMemo } from "react"
import { X, FileText, Building2, Lock, ChevronDown, ChevronUp } from "lucide-react"
import type { InvoiceType, TaxConfig } from "../types"
import { formatCRC, formatUSD } from "../utils/format"
import { calculateTaxBreakdown } from "../utils/tax"

interface CheckoutModalProps {
  subtotal: number
  taxConfig: TaxConfig
  tipAmount: number
  total: number
  onClose: () => void
  onSuccess: () => void
}

type PaymentStep = "select" | "processing" | "done"
type PaymentMethod = "apple" | "google" | "card" | null

export default function CheckoutModal({
  subtotal,
  taxConfig,
  tipAmount,
  total,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<PaymentStep>("select")
  const [payMethod, setPayMethod] = useState<PaymentMethod>(null)
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("final")
  const [taxId, setTaxId] = useState("")
  const [showInvoice, setShowInvoice] = useState(false)

  const breakdown = useMemo(
    () => calculateTaxBreakdown(subtotal, taxConfig, tipAmount),
    [subtotal, taxConfig, tipAmount]
  )

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handlePay = (method: PaymentMethod) => {
    setPayMethod(method)
    setStep("processing")
    setTimeout(() => {
      setStep("done")
      setTimeout(() => {
        onSuccess()
      }, 600)
    }, 1800)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && step === "select") onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        background: visible ? "rgba(28,25,23,0.55)" : "transparent",
        transition: "background 0.25s ease",
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[430px] bg-card rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "90vh",
        }}
      >
        {step === "processing" && <ProcessingView method={payMethod} />}
        {step === "done" && <DoneView />}
        {step === "select" && (
          <>
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
                  Confirmar pago <span className="text-muted-foreground" style={{ fontWeight: 400, fontSize: "0.75rem" }}>/ Confirm Payment</span>
                </h2>
                <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>
                  Pago seguro · Secure Payment · SSL
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center bg-muted rounded-full active:opacity-70"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable */}
            <div className="overflow-y-auto flex-1 px-5">
              {/* Amount */}
              <div className="bg-muted rounded-2xl p-4 mb-5">
                <div className="space-y-1.5 mb-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Subtotal</span>
                    <span className="text-foreground" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                      {formatCRC(breakdown.subtotal)}
                    </span>
                  </div>
                  {taxConfig.enabled && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          Servicio ({taxConfig.serviceTaxRate}%)
                        </span>
                        <span className="text-foreground" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                          {formatCRC(breakdown.serviceTax)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          IVA ({taxConfig.ivaRate}%)
                        </span>
                        <span className="text-foreground" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                          {formatCRC(breakdown.iva)}
                        </span>
                      </div>
                    </>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Propina / Tip</span>
                      <span className="text-primary" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                        {formatCRC(tipAmount)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-3 text-center">
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: "0.78rem" }}>
                    Total a cobrar <span style={{ opacity: 0.65 }}>/ Amount Due</span>
                  </p>
                  <p
                    className="text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "2rem" }}
                  >
                    {formatCRC(total)}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                    {formatUSD(total)}
                  </p>
                </div>
              </div>

              {/* Invoice toggle */}
              <div className="mb-5">
                <button
                  onClick={() => setShowInvoice((p) => !p)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-muted-foreground" />
                    <span
                      className="text-foreground"
                      style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.9rem" }}
                    >
                      Tipo de factura
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>
                      {invoiceType === "final" ? "Consumidor Final" : "Factura Electrónica"}
                    </span>
                    {showInvoice ? (
                      <ChevronUp size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={16} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {showInvoice && (
                  <div className="mt-2 bg-card border border-border rounded-2xl p-4">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setInvoiceType("final")}
                        className={`flex-1 py-2.5 rounded-xl border transition-all ${
                          invoiceType === "final"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                        style={{ fontSize: "0.82rem", fontWeight: 600 }}
                      >
                        <span>Consumidor Final</span>
                        <span style={{ display: "block", fontSize: "0.65em", opacity: 0.7 }}>Final Consumer</span>
                      </button>
                      <button
                        onClick={() => setInvoiceType("empresa")}
                        className={`flex-1 py-2.5 rounded-xl border transition-all ${
                          invoiceType === "empresa"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                        style={{ fontSize: "0.82rem", fontWeight: 600 }}
                      >
                        <span>Empresa / Jurídica</span>
                        <span style={{ display: "block", fontSize: "0.65em", opacity: 0.7 }}>Company</span>
                      </button>
                    </div>

                    {invoiceType === "empresa" && (
                      <div>
                        <label
                          className="block text-foreground mb-2"
                          style={{ fontSize: "0.82rem", fontWeight: 600 }}
                        >
                          <Building2 size={13} className="inline mr-1.5 text-muted-foreground" />
                          Cédula Jurídica / Número de contribuyente
                        </label>
                        <input
                          type="text"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="Ej: 3-101-XXXXXX"
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                          style={{ fontSize: "0.88rem", fontFamily: "Outfit, sans-serif", fontWeight: 600, letterSpacing: "0.03em" }}
                        />
                        <p className="text-muted-foreground mt-1.5" style={{ fontSize: "0.7rem" }}>
                          La factura electrónica será enviada por correo electrónico
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <Lock size={12} className="text-muted-foreground" />
                <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  Pago seguro mediante biometría · Biometric payment · No card data stored
                </span>
              </div>

              {/* Payment methods */}
              <div className="flex flex-col gap-3 mb-4">
                {/* Apple Pay */}
                <button
                  onClick={() => handlePay("apple")}
                  className="w-full bg-foreground text-background rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm"
                  style={{ minHeight: "58px" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25" />
                  </svg>
                  <span
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                  >
                    Apple Pay
                  </span>
                </button>

                {/* Google Pay */}
                <button
                  onClick={() => handlePay("google")}
                  className="w-full bg-card border border-border rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm"
                  style={{ minHeight: "58px" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.59c-.24 1.37-1 2.53-2.12 3.31v2.77h3.43c2.01-1.85 3.1-4.58 3.1-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.43-2.77c-.96.66-2.2 1.06-3.85 1.06-2.96 0-5.47-2-6.37-4.68H2.07v2.86C3.88 20.28 7.64 23 12 23z" fill="#34A853" />
                    <path d="M5.63 13.95A6.35 6.35 0 0 1 5.3 12c0-.68.12-1.34.33-1.95V7.19H2.07A10.98 10.98 0 0 0 1 12c0 1.77.42 3.44 1.07 4.81l3.56-2.86z" fill="#FBBC05" />
                    <path d="M12 5.38c1.67 0 3.16.57 4.34 1.7l3.27-3.27C17.45 2.09 14.97 1 12 1 7.64 1 3.88 3.72 2.07 7.19l3.56 2.86C6.53 7.38 9.04 5.38 12 5.38z" fill="#EA4335" />
                  </svg>
                  <span
                    className="text-foreground"
                    style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
                  >
                    Google Pay
                  </span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    o pagar con tarjeta
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Card payment */}
                <button
                  onClick={() => handlePay("card")}
                  className="w-full bg-muted border border-border rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
                  style={{ minHeight: "54px" }}
                >
                  <span className="flex gap-1">
                    {["#1A1F71", "#FF5F00", "#EB001B"].map((color, i) => (
                      <span
                        key={i}
                        className="w-6 h-4 rounded flex-shrink-0"
                        style={{ background: color, borderRadius: "3px" }}
                      />
                    ))}
                  </span>
                  <span
                    className="text-foreground"
                    style={{ fontWeight: 600, fontSize: "0.9rem" }}
                  >
                    Débito / Crédito
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProcessingView({ method }: { method: PaymentMethod }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 min-h-[320px]">
      <div
        className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent spinner mb-6"
        style={{ borderTopColor: "transparent" }}
      />
      <p
        className="text-foreground text-center"
        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
      >
        Procesando pago...
        <span className="block text-muted-foreground" style={{ fontSize: "0.7rem", fontWeight: 400 }}>Processing Payment</span>
      </p>
      <p className="text-muted-foreground text-center mt-2" style={{ fontSize: "0.82rem" }}>
        {method === "apple"
          ? "Confirme con Face ID o Touch ID"
          : method === "google"
            ? "Confirme con su huella dactilar"
            : "Verificando datos de tarjeta"}
      </p>
    </div>
  )
}

function DoneView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 min-h-[320px]">
      <div className="w-16 h-16 rounded-full bg-status-green flex items-center justify-center check-circle mb-6">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            className="check-path"
            d="M8 16l6 6 10-10"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        className="text-foreground text-center"
        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
      >
        ¡Pago aprobado!
        <span className="block text-muted-foreground" style={{ fontSize: "0.72rem", fontWeight: 400 }}>Payment Approved</span>
      </p>
    </div>
  )
}
