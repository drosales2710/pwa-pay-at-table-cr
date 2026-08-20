import { useState } from "react"
import { Check, Eye, EyeOff, RefreshCw } from "lucide-react"

function Section({ title, titleEn, children }: { title: string; titleEn: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", marginBottom: "20px", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A" }}>
          {title} <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.78rem" }}>/ {titleEn}</span>
        </p>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  )
}

function Field({ label, labelEn, value, type = "text", onChange, secret }: {
  label: string; labelEn: string; value: string; type?: string; onChange: (v: string) => void; secret?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "5px" }}>
        {label} <span style={{ color: "#94A3B8", fontWeight: 400 }}>/ {labelEn}</span>
      </label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type={secret && !show ? "password" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.85rem", color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
        />
        {secret && (
          <button onClick={() => setShow((s) => !s)}
            style={{ padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", background: "#F8FAFC", cursor: "pointer", color: "#64748B" }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, labelEn, checked, onChange }: { label: string; labelEn: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F8FAFC" }}>
      <div>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{label}</p>
        <p style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{labelEn}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer", position: "relative",
          background: checked ? "#1E40AF" : "#E2E8F0", transition: "background 0.2s",
        }}
      >
        <span style={{ position: "absolute", top: "3px", left: checked ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "9px", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px #0002" }} />
      </button>
    </div>
  )
}

export default function SystemSettings() {
  const [saved, setSaved] = useState(false)
  const [rate, setRate] = useState("525")
  const [gateway, setGateway] = useState({ merchantId: "BAC-CR-882341", terminalId: "TERM-0042", apiKey: "sk_live_bac_xxxxxxxxxxxxxxxxxx" })
  const [dgt, setDgt] = useState({ enabled: true, haciendaUser: "admin@laterraza.cr", haciendaClave: "XXXXXXXXXX", rucFiscal: "3-101-888822" })
  const [features, setFeatures] = useState({ guardianMode: true, biometricPay: true, dualCurrency: true, emailReceipts: false, whatsappReceipts: true })
  const [restaurant, setRestaurant] = useState({ name: "La Terraza", address: "Escazú, San José, Costa Rica", phone: "+506 2222-3333", email: "info@laterraza.cr" })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Configuración <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Settings</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>Sistema, pagos y facturación electrónica</p>
        </div>
        <button
          onClick={handleSave}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", border: "none", background: saved ? "#059669" : "#1E40AF", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#fff", transition: "background 0.3s" }}>
          {saved ? <><Check size={15} /> Guardado / Saved</> : "Guardar cambios / Save"}
        </button>
      </div>

      {/* Restaurant info */}
      <Section title="Restaurante" titleEn="Restaurant Info">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <Field label="Nombre" labelEn="Name" value={restaurant.name} onChange={(v) => setRestaurant((r) => ({ ...r, name: v }))} />
          <Field label="Teléfono" labelEn="Phone" value={restaurant.phone} onChange={(v) => setRestaurant((r) => ({ ...r, phone: v }))} />
          <Field label="Dirección" labelEn="Address" value={restaurant.address} onChange={(v) => setRestaurant((r) => ({ ...r, address: v }))} />
          <Field label="Correo electrónico" labelEn="Email" value={restaurant.email} type="email" onChange={(v) => setRestaurant((r) => ({ ...r, email: v }))} />
        </div>
      </Section>

      {/* Payment gateway */}
      <Section title="Gateway BAC Credomatic" titleEn="Payment Gateway">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <Field label="Merchant ID" labelEn="Merchant ID" value={gateway.merchantId} onChange={(v) => setGateway((g) => ({ ...g, merchantId: v }))} />
          <Field label="Terminal ID" labelEn="Terminal ID" value={gateway.terminalId} onChange={(v) => setGateway((g) => ({ ...g, terminalId: v }))} />
        </div>
        <Field label="API Key (producción)" labelEn="Production API Key" value={gateway.apiKey} onChange={(v) => setGateway((g) => ({ ...g, apiKey: v }))} secret />
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", padding: "10px 14px", marginTop: "4px" }}>
          <p style={{ fontSize: "0.75rem", color: "#92400E" }}>⚠ Las credenciales de producción son sensibles. Contáctese con BAC para obtener acceso al ambiente real.</p>
        </div>
      </Section>

      {/* DGT / Hacienda */}
      <Section title="Facturación Electrónica (DGT)" titleEn="Electronic Invoicing — Hacienda">
        <Toggle label="Activar DGT XML v4.4" labelEn="Enable DGT XML v4.4" checked={dgt.enabled} onChange={(v) => setDgt((d) => ({ ...d, enabled: v }))} />
        {dgt.enabled && (
          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <Field label="Usuario Hacienda" labelEn="Hacienda Username" value={dgt.haciendaUser} onChange={(v) => setDgt((d) => ({ ...d, haciendaUser: v }))} />
            <Field label="RUC Fiscal" labelEn="Fiscal RUC" value={dgt.rucFiscal} onChange={(v) => setDgt((d) => ({ ...d, rucFiscal: v }))} />
            <Field label="Contraseña Hacienda" labelEn="Hacienda Password" value={dgt.haciendaClave} onChange={(v) => setDgt((d) => ({ ...d, haciendaClave: v }))} secret />
          </div>
        )}
      </Section>

      {/* Exchange rate */}
      <Section title="Tipo de cambio" titleEn="Exchange Rate">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "5px" }}>USD → CRC</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.9rem", color: "#64748B" }}>1 USD =</span>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                style={{ width: "90px", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.9rem", color: "#0F172A", outline: "none", textAlign: "right" }}
              />
              <span style={{ fontSize: "0.9rem", color: "#64748B" }}>₡ CRC</span>
            </div>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginTop: "16px" }}>
            <RefreshCw size={13} /> Sincronizar BCCR
          </button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "8px" }}>Fuente de referencia: Banco Central de Costa Rica (BCCR)</p>
      </Section>

      {/* Feature flags */}
      <Section title="Funcionalidades" titleEn="Feature Flags">
        <Toggle label="Guardian Mode (aprobación de pedidos)" labelEn="Order approval queue before KDS" checked={features.guardianMode} onChange={(v) => setFeatures((f) => ({ ...f, guardianMode: v }))} />
        <Toggle label="Pago biométrico (Apple/Google Pay)" labelEn="Biometric payment (Apple/Google Pay)" checked={features.biometricPay} onChange={(v) => setFeatures((f) => ({ ...f, biometricPay: v }))} />
        <Toggle label="Doble moneda CRC/USD" labelEn="Dual currency CRC/USD display" checked={features.dualCurrency} onChange={(v) => setFeatures((f) => ({ ...f, dualCurrency: v }))} />
        <Toggle label="Comprobante por WhatsApp" labelEn="WhatsApp receipt delivery" checked={features.whatsappReceipts} onChange={(v) => setFeatures((f) => ({ ...f, whatsappReceipts: v }))} />
        <Toggle label="Comprobante por correo" labelEn="Email receipt delivery" checked={features.emailReceipts} onChange={(v) => setFeatures((f) => ({ ...f, emailReceipts: v }))} />
      </Section>
    </div>
  )
}
