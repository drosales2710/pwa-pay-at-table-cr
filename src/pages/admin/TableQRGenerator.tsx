import { useState } from "react"
import { Download, Printer, QrCode, Users, Plus, Grid3x3 } from "lucide-react"
import { MOCK_TABLES } from "../../data/mockData"

function MockQR({ tableId, size = 80 }: { tableId: string; size?: number }) {
  const seed = tableId.charCodeAt(tableId.length - 1)
  const cells = Array.from({ length: 7 * 7 }, (_, i) => {
    const r = Math.floor(i / 7)
    const c = i % 7
    if ((r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3)) return true
    return ((seed * (i + 1) * 37) % 3) !== 0
  })
  const cell = size / 7
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {cells.map((filled, i) =>
        filled ? (
          <rect
            key={i}
            x={(i % 7) * cell + 1}
            y={Math.floor(i / 7) * cell + 1}
            width={cell - 2}
            height={cell - 2}
            fill="#0F172A"
          />
        ) : null
      )}
    </svg>
  )
}

const SECTIONS = [
  { id: "main",    label: "Salón Principal", labelEn: "Main Hall" },
  { id: "bar",     label: "Barra",           labelEn: "Bar" },
  { id: "private", label: "Privado",         labelEn: "Private" },
  { id: "terrace", label: "Terraza",         labelEn: "Terrace" },
]

export default function TableQRGenerator() {
  const [selectedSection, setSelectedSection] = useState<string | "all">("all")
  const [printAll, setPrintAll] = useState(false)

  const filtered = selectedSection === "all"
    ? MOCK_TABLES
    : MOCK_TABLES.filter((t) => t.section === selectedSection)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Mesas & QR <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Tables & QR Codes</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
            {MOCK_TABLES.length} mesas · Cada QR enlaza al menú digital del comensal
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
            <Plus size={15} /> Agregar mesa
          </button>
          <button
            onClick={() => setPrintAll(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
            <Printer size={15} /> Imprimir todos / Print All
          </button>
        </div>
      </div>

      {/* Section filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todas / All" }, ...SECTIONS].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setSelectedSection(sec.id)}
            style={{
              padding: "7px 14px", borderRadius: "20px", border: "1px solid",
              borderColor: selectedSection === sec.id ? "#1E40AF" : "#E2E8F0",
              background: selectedSection === sec.id ? "#EFF6FF" : "#fff",
              color: selectedSection === sec.id ? "#1E40AF" : "#475569",
              fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
        {filtered.map((table) => {
          const statusColor = table.status === "available" ? "#059669" : table.status === "open" ? "#DC2626" : table.status === "processing" ? "#D97706" : "#94A3B8"
          const statusLabel = { available: "Libre", open: "Ocupada", processing: "Pagando", closed: "Cerrada" }[table.status]
          const qrUrl = `${window.location.origin}/#/m/${table.number}`
          return (
            <div key={table.id} style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
              {/* QR area */}
              <div style={{ background: "#F8FAFC", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
                <MockQR tableId={table.id} size={100} />
              </div>
              {/* Info */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#0F172A" }}>
                    Mesa #{table.number}
                  </p>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: statusColor, background: statusColor + "18", padding: "2px 7px", borderRadius: "20px" }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
                  <Users size={11} color="#94A3B8" />
                  <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{table.seats} asientos · {SECTIONS.find((s) => s.id === table.section)?.label}</span>
                </div>
                <p style={{ fontSize: "0.6rem", color: "#94A3B8", fontFamily: "monospace", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {qrUrl}
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}>
                    <Download size={12} /> PNG
                  </button>
                  <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}>
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Print all toast */}
      {printAll && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#1E40AF", color: "#fff", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 8px 30px #1E40AF44", zIndex: 200 }}
          onClick={() => setPrintAll(false)}>
          <Grid3x3 size={18} />
          <div>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem" }}>PDF generado / PDF Generated</p>
            <p style={{ fontSize: "0.72rem", opacity: 0.8 }}>16 QR codes listos para imprimir</p>
          </div>
        </div>
      )}
    </div>
  )
}
