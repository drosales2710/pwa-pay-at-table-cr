import { useState, useEffect } from "react"
import { X, Minus, Plus } from "lucide-react"
import type { MenuItem, ModifierOption } from "../types"
import { formatCRC, formatUSD } from "../utils/format"

interface ModifierModalProps {
  item: MenuItem | null
  onClose: () => void
  onConfirm: (item: MenuItem, quantity: number, modifiers: string[], totalPrice: number) => void
}

export default function ModifierModal({ item, onClose, onConfirm }: ModifierModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [visible, setVisible] = useState(false)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (item) {
      setQuantity(1)
      setNotes("")
      setValidationError(null)
      const defaults: Record<string, string[]> = {}
      item.modifierGroups?.forEach((g) => {
        if (g.type === "single" && g.required && g.options.length > 0) {
          defaults[g.id] = [g.options[0].id]
        } else {
          defaults[g.id] = []
        }
      })
      setSelections(defaults)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [item])

  if (!item) return null

  const addonTotal = item.modifierGroups?.reduce((total, group) => {
    const sel = selections[group.id] || []
    return (
      total +
      group.options
        .filter((o) => sel.includes(o.id))
        .reduce((s, o) => s + o.priceAdd, 0)
    )
  }, 0) ?? 0

  const unitPrice = item.price + addonTotal
  const totalPrice = unitPrice * quantity

  const toggleSingle = (groupId: string, optionId: string, required: boolean) => {
    setSelections((p) => {
      const cur = p[groupId] || []
      if (cur.includes(optionId) && !required) {
        return { ...p, [groupId]: [] }
      }
      return { ...p, [groupId]: [optionId] }
    })
  }

  const toggleMultiple = (groupId: string, optionId: string) => {
    setSelections((p) => {
      const cur = p[groupId] || []
      return {
        ...p,
        [groupId]: cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId],
      }
    })
  }

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleConfirm = () => {
    const missingRequired = item.modifierGroups?.find(
      (g) => g.required && (!(selections[g.id]?.length))
    )
    if (missingRequired) {
      setValidationError(`Selecciona "${missingRequired.name}" / Select "${missingRequired.name}"`)
      return
    }
    setValidationError(null)
    const selectedLabels: string[] = []
    item.modifierGroups?.forEach((group) => {
      const sel = selections[group.id] || []
      group.options.forEach((opt) => {
        if (sel.includes(opt.id)) {
          const label = opt.priceAdd > 0 ? `${opt.name} (+${formatCRC(opt.priceAdd)})` : opt.name
          selectedLabels.push(label)
        }
      })
    })
    if (notes.trim()) selectedLabels.push(`Nota: ${notes.trim()}`)
    onConfirm(item, quantity, selectedLabels, unitPrice)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: visible ? "rgba(28,25,23,0.4)" : "transparent", transition: "background 0.25s ease" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[430px] bg-card rounded-t-3xl overflow-hidden"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-4 flex-shrink-0">
          <div className="flex-1 pr-3">
            <h2
              className="text-foreground leading-tight"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.2rem" }}
            >
              {item.name}
            </h2>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
              {item.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-muted rounded-full flex-shrink-0 mt-1 active:opacity-70"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable modifiers */}
        <div className="overflow-y-auto flex-1 px-5">
          {item.modifierGroups?.map((group) => (
            <div key={group.id} className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-foreground"
                  style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.95rem" }}
                >
                  {group.name}
                </span>
                {group.required && (
                  <span
                    className="bg-primary/10 text-primary-on-light px-2 py-0.5 rounded-full"
                    style={{ fontSize: "0.65rem", fontWeight: 700 }}
                  >
                    Requerido
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {group.options.map((opt: ModifierOption) => {
                  const selected = (selections[group.id] || []).includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() =>
                        group.type === "single"
                          ? toggleSingle(group.id, opt.id, group.required)
                          : toggleMultiple(group.id, opt.id)
                      }
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background"
                      }`}
                      style={{ minHeight: "48px" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex-shrink-0 transition-all ${
                            group.type === "single"
                              ? `w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary" : "border-border"}`
                              : `w-5 h-5 rounded-md border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-border"}`
                          }`}
                        >
                          {selected && group.type === "single" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                          {selected && group.type === "multiple" && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={selected ? "text-foreground" : "text-foreground"}
                          style={{ fontSize: "0.88rem", fontWeight: selected ? 600 : 400 }}
                        >
                          {opt.name}
                        </span>
                      </div>
                      {opt.priceAdd !== 0 && (
                        <span
                          className={selected ? "text-primary" : "text-muted-foreground"}
                          style={{ fontSize: "0.82rem", fontWeight: 600 }}
                        >
                          {opt.priceAdd > 0 ? "+" : ""}{formatCRC(opt.priceAdd)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Special notes */}
          <div className="mb-5">
            <label
              className="block text-foreground mb-2"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.95rem" }}
            >
              Notas especiales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, instrucciones especiales..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary transition-colors"
              style={{ fontSize: "0.88rem", minHeight: "72px" }}
            />
          </div>
        </div>

        {/* Footer: quantity + CTA */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-border bg-card safe-bottom">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-muted rounded-xl px-1 py-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-card shadow-sm active:scale-95 transition-transform"
                disabled={quantity <= 1}
              >
                <Minus size={16} className={quantity <= 1 ? "text-border" : "text-foreground"} />
              </button>
              <span
                className="text-foreground w-6 text-center"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-card shadow-sm active:scale-95 transition-transform"
              >
                <Plus size={16} className="text-foreground" />
              </button>
            </div>
            <div className="flex-1" />
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground rounded-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform shadow-sm"
            style={{ minHeight: "56px", fontFamily: "Outfit, sans-serif" }}
          >
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>Agregar al pedido</span>
            <div className="flex flex-col items-end">
              <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>{formatCRC(totalPrice)}</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>{formatUSD(totalPrice)}</span>
            </div>
          </button>
          {validationError && (
            <p className="text-red-600 text-center mt-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              {validationError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
