import { useState } from "react"
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Upload, X, Check } from "lucide-react"
import { CATEGORIES, MENU_ITEMS } from "../../data/menuData"
import { formatCRC } from "../../utils/format"
import type { MenuItem } from "../../types"

const CABYS: Record<string, string> = {
  entradas: "5010001010000",
  platos: "5010001020000",
  bebidas: "5050011010000",
  postres: "5010001030000",
}

export default function MenuBuilder() {
  const [selectedCat, setSelectedCat] = useState<string>(CATEGORIES[0].id)
  const [items, setItems] = useState<(MenuItem & { available: boolean })[]>(
    MENU_ITEMS.map((m) => ({ ...m, available: true }))
  )
  const [search, setSearch] = useState("")
  const [editItem, setEditItem] = useState<(MenuItem & { available: boolean }) | null>(null)

  const catItems = items
    .filter((m) => m.category === selectedCat)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  const toggleAvail = (id: string) => {
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, available: !m.available } : m))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Constructor de Menú <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Menu Builder</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>{items.length} artículos · {CATEGORIES.length} categorías</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
            <Upload size={15} /> Importar CSV / Import CSV
          </button>
          <button
            onClick={() => setEditItem({ id: "new", name: "", description: "", price: 0, category: selectedCat as MenuItem["category"], image: "", available: true, modifierGroups: [] })}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
            <Plus size={15} /> Nuevo artículo / New Item
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "20px" }}>
        {/* Category sidebar */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "12px", height: "fit-content" }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8", padding: "4px 8px 8px", letterSpacing: "0.05em" }}>CATEGORÍAS</p>
          {CATEGORIES.map((cat) => {
            const count = items.filter((m) => m.category === cat.id).length
            const isActive = selectedCat === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 10px", borderRadius: "10px", border: "none", cursor: "pointer",
                  background: isActive ? "#EFF6FF" : "transparent",
                  color: isActive ? "#1E40AF" : "#475569",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{cat.emoji}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 700, lineHeight: 1 }}>{cat.label}</p>
                  <p style={{ fontSize: "0.62rem", opacity: 0.7 }}>{cat.sublabel}</p>
                </div>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, background: isActive ? "#DBEAFE" : "#F1F5F9", color: isActive ? "#1E40AF" : "#64748B", padding: "1px 6px", borderRadius: "20px" }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Items table */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
          {/* Search bar */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px" }}>
            <Search size={16} color="#94A3B8" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículos / Search items..."
              style={{ border: "none", outline: "none", flex: 1, fontSize: "0.85rem", color: "#0F172A", background: "transparent" }}
            />
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 140px 80px 80px", gap: "12px", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {["", "Artículo / Item", "Precio / Price", "CABYS", "Estado", ""].map((h, i) => (
              <p key={i} style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em" }}>{h}</p>
            ))}
          </div>

          {/* Items */}
          {catItems.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "grid", gridTemplateColumns: "40px 1fr 120px 140px 80px 80px", gap: "12px",
                padding: "12px 16px", borderBottom: i < catItems.length - 1 ? "1px solid #F1F5F9" : "none",
                alignItems: "center",
                opacity: item.available ? 1 : 0.5,
              }}
            >
              <img src={item.image} alt={item.name} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{item.name}</p>
                <p style={{ fontSize: "0.68rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{item.description}</p>
              </div>
              <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" }}>{formatCRC(item.price)}</p>
              <p style={{ fontSize: "0.72rem", color: "#64748B", fontFamily: "monospace" }}>{CABYS[item.category]}</p>
              <button
                onClick={() => toggleAvail(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", cursor: "pointer", color: item.available ? "#059669" : "#DC2626", padding: 0 }}
              >
                {item.available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>{item.available ? "Activo" : "Inactivo"}</span>
              </button>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setEditItem(item)}
                  style={{ padding: "5px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#64748B" }}>
                  <Edit2 size={13} />
                </button>
                <button style={{ padding: "5px", borderRadius: "7px", border: "1px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", color: "#DC2626" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {catItems.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: "0.85rem" }}>
              Sin artículos en esta categoría / No items in this category
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (
        <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={(updated) => {
          setItems((prev) => prev.map((m) => m.id === updated.id ? updated : m))
          setEditItem(null)
        }} />
      )}
    </div>
  )
}

function EditModal({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem & { available: boolean }
  onClose: () => void
  onSave: (updated: MenuItem & { available: boolean }) => void
}) {
  const [form, setForm] = useState({ ...item })
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", width: "420px", maxWidth: "calc(100vw - 32px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#0F172A" }}>
            {form.id === "new" ? "Nuevo artículo / New Item" : "Editar artículo / Edit Item"}
          </p>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={20} />
          </button>
        </div>
        {[
          { label: "Nombre / Name", key: "name", type: "text" },
          { label: "Descripción / Description", key: "description", type: "text" },
          { label: "Precio CRC / Price", key: "price", type: "number" },
        ].map(({ label, key, type }) => (
          <div key={key} style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "5px" }}>{label}</label>
            <input
              type={type}
              value={(form as Record<string, unknown>)[key] as string | number}
              onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.85rem", color: "#0F172A", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
            Cancelar / Cancel
          </button>
          <button onClick={() => onSave(form)}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Check size={15} /> Guardar / Save
          </button>
        </div>
      </div>
    </div>
  )
}
