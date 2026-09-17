import { useMemo, useState } from "react"
import { Download, Printer, Users, Edit2, X, Check, Plus } from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import type { TableRecord } from "../../data/mockData"
import {
  addTableSection,
  buildAdminTableCatalog,
  getSectionLabel,
  listTableSections,
  updateCatalogTable,
  type TableSectionDef,
} from "../../utils/tableCatalog"

function qrImageUrl(data: string, size = 180) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export default function TableQRGenerator() {
  const { allTables, restaurant } = useGuest()
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [editTable, setEditTable] = useState<(TableRecord & { sectionId: string }) | null>(null)
  const [tick, setTick] = useState(0)

  const sections = useMemo(() => listTableSections(), [tick])
  const liveByNumber = useMemo(() => {
    const map = new Map<number, TableRecord>()
    for (const t of allTables) map.set(t.number, t)
    return map
  }, [allTables])

  const catalog = useMemo(() => buildAdminTableCatalog(liveByNumber), [liveByNumber, tick])

  const filtered =
    selectedSection === "all" ? catalog : catalog.filter((t) => t.sectionId === selectedSection)

  const guestOrigin = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "")

  const refresh = () => setTick((n) => n + 1)

  const handlePrint = () => window.print()

  const downloadPng = (url: string, number: number) => {
    const a = document.createElement("a")
    a.href = qrImageUrl(url, 400)
    a.download = `mesa-${number}-qr.png`
    a.target = "_blank"
    a.rel = "noreferrer"
    a.click()
  }

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Mesas & QR <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Tables & QR Codes</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
            Catálogo de {catalog.length} mesas. Edita asientos y sección; solo la Mesa #7 está en el piso en vivo. / Edit seats & section; only table #7 is live on the floor.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}
        >
          <Printer size={15} /> Imprimir / Print
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todas / All" }, ...sections].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setSelectedSection(sec.id)}
            style={{
              padding: "7px 14px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: selectedSection === sec.id ? "#1E40AF" : "#E2E8F0",
              background: selectedSection === sec.id ? "#EFF6FF" : "#fff",
              color: selectedSection === sec.id ? "#1E40AF" : "#475569",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
        {filtered.map((table) => {
          const isLive = liveByNumber.has(table.number)
          const statusColor =
            table.status === "available" ? "#059669" : table.status === "open" ? "#DC2626" : table.status === "processing" ? "#D97706" : "#94A3B8"
          const statusLabel = { available: "Libre", open: "Ocupada", processing: "Pagando", closed: "Cerrada" }[table.status]
          const qrUrl = `${guestOrigin}#/m/${table.number}?restaurant=${restaurant.id}`
          return (
            <div key={table.id} style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <div style={{ background: "#F8FAFC", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
                <img src={qrImageUrl(qrUrl)} alt={`QR mesa ${table.number}`} width={100} height={100} style={{ imageRendering: "pixelated" }} />
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#0F172A" }}>
                    Mesa #{table.number}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setEditTable(table)}
                      title="Editar mesa / Edit table"
                      style={{ padding: "4px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#64748B", display: "flex" }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: statusColor, background: statusColor + "18", padding: "2px 7px", borderRadius: "20px" }}>
                      {isLive ? statusLabel : "Catálogo"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
                  <Users size={11} color="#94A3B8" />
                  <span style={{ fontSize: "0.7rem", color: "#64748B" }}>
                    {table.seats} asientos · {getSectionLabel(table.sectionId)}
                  </span>
                </div>
                <p style={{ fontSize: "0.6rem", color: "#94A3B8", fontFamily: "monospace", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {qrUrl}
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => downloadPng(qrUrl, table.number)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}
                  >
                    <Download size={12} /> PNG
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}
                  >
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editTable && (
        <TableEditModal
          table={editTable}
          sections={sections}
          onClose={() => setEditTable(null)}
          onSaved={() => {
            refresh()
            setEditTable(null)
          }}
        />
      )}
    </div>
  )
}

function TableEditModal({
  table,
  sections,
  onClose,
  onSaved,
}: {
  table: TableRecord & { sectionId: string }
  sections: TableSectionDef[]
  onClose: () => void
  onSaved: () => void
}) {
  const [seatsInput, setSeatsInput] = useState(String(table.seats))
  const [sectionId, setSectionId] = useState(table.sectionId)
  const [newSectionEs, setNewSectionEs] = useState("")
  const [newSectionEn, setNewSectionEn] = useState("")
  const [localSections, setLocalSections] = useState(sections)
  const [error, setError] = useState("")

  const seats = Number(seatsInput.replace(/\D/g, "")) || 0

  const handleAddSection = () => {
    const created = addTableSection(newSectionEs, newSectionEn || undefined)
    if (!created) {
      setError("Nombre de sección requerido / Section name required")
      return
    }
    setLocalSections(listTableSections())
    setSectionId(created.id)
    setNewSectionEs("")
    setNewSectionEn("")
    setError("")
  }

  const handleSave = () => {
    if (seats < 1 || seats > 24) {
      setError("Asientos entre 1 y 24 / Seats must be 1–24")
      return
    }
    if (!sectionId) {
      setError("Selecciona una sección / Select a section")
      return
    }
    updateCatalogTable(table.number, { seats, sectionId })
    onSaved()
  }

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "#0F172A",
    outline: "none",
    boxSizing: "border-box" as const,
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", width: "440px", maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#0F172A" }}>
            Editar Mesa #{table.number} <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "0.85rem" }}>/ Edit table</span>
          </p>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "0.72rem", color: "#64748B", marginBottom: "16px" }}>
          El código QR apunta a <span style={{ fontFamily: "monospace" }}>#/m/{table.number}</span> — no cambia al editar. / QR URL stays the same.
        </p>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "5px" }}>
            Asientos / Seats
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="4"
            value={seatsInput}
            onChange={(e) => setSeatsInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "5px" }}>
            Sección / Section
          </label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} style={inputStyle}>
            {localSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} / {s.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: "12px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: "14px" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748B", marginBottom: "8px" }}>
            Nueva sección / New section
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", color: "#94A3B8", marginBottom: "4px" }}>Nombre ES</label>
              <input
                type="text"
                value={newSectionEs}
                onChange={(e) => setNewSectionEs(e.target.value)}
                placeholder="Jardín"
                style={{ ...inputStyle, fontSize: "0.82rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", color: "#94A3B8", marginBottom: "4px" }}>Name EN</label>
              <input
                type="text"
                value={newSectionEn}
                onChange={(e) => setNewSectionEn(e.target.value)}
                placeholder="Garden"
                style={{ ...inputStyle, fontSize: "0.82rem" }}
              />
            </div>
            <button
              type="button"
              onClick={handleAddSection}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "9px 12px", borderRadius: "8px", border: "none", background: "#EFF6FF", color: "#1E40AF", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, height: "38px" }}
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
        </div>

        {error && <p style={{ color: "#DC2626", fontSize: "0.78rem", fontWeight: 600, marginBottom: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
            Cancelar / Cancel
          </button>
          <button type="button" onClick={handleSave} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Check size={15} /> Guardar / Save
          </button>
        </div>
      </div>
    </div>
  )
}
