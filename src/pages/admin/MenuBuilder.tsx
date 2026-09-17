import { useRef, useState } from "react"
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Upload, ImageIcon } from "lucide-react"
import { CATEGORIES } from "../../data/menuData"
import { formatCRC } from "../../utils/format"
import type { MenuItem } from "../../types"
import {
  createMenuItemId,
  importMenuCsv,
  loadMenuCatalog,
  removeMenuItem,
  setMenuItemAvailable,
  upsertMenuItem,
  type CatalogItem,
} from "../../utils/menuCatalog"
import { menuItemImageStyle } from "../../utils/menuImage"
import MenuItemEditModal from "../../components/admin/MenuItemEditModal"

const CABYS: Record<string, string> = {
  entradas: "5010001010000",
  platos: "5010001020000",
  bebidas: "5050011010000",
  postres: "5010001030000",
}

const emptyItem = (category: string): CatalogItem => ({
  id: "new",
  name: "",
  description: "",
  price: 0,
  category: category as MenuItem["category"],
  image: "",
  imageFocus: { x: 50, y: 50 },
  imageZoom: 1,
  available: true,
  modifierGroups: [],
})

export default function MenuBuilder() {
  const [selectedCat, setSelectedCat] = useState<string>(CATEGORIES[0].id)
  const [items, setItems] = useState<CatalogItem[]>(() => loadMenuCatalog())
  const [search, setSearch] = useState("")
  const [editItem, setEditItem] = useState<CatalogItem | null>(null)
  const [importMsg, setImportMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = () => setItems(loadMenuCatalog())

  const catItems = items
    .filter((m) => m.category === selectedCat)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))

  const toggleAvail = (id: string) => {
    const current = items.find((m) => m.id === id)
    if (!current) return
    setMenuItemAvailable(id, !current.available)
    reload()
  }

  const handleImport = (file: File) => {
    file.text().then((text) => {
      const result = importMenuCsv(text)
      reload()
      setImportMsg(`Importados ${result.added} · errores ${result.errors} / Added ${result.added} · errors ${result.errors}`)
      setTimeout(() => setImportMsg(""), 4000)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
            Constructor de Menú <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Menu Builder</span>
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>{items.length} artículos · {CATEGORIES.length} categorías</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}
          >
            <Upload size={15} /> Importar CSV / Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => setEditItem(emptyItem(selectedCat))}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}
          >
            <Plus size={15} /> Nuevo artículo / New Item
          </button>
        </div>
      </div>
      {importMsg && <p style={{ color: "#1E40AF", fontSize: "0.8rem", fontWeight: 600, marginBottom: "12px" }}>{importMsg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "20px" }}>
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "12px", height: "fit-content" }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8", padding: "4px 8px 8px", letterSpacing: "0.05em" }}>CATEGORÍAS</p>
          {CATEGORIES.map((cat) => {
            const count = items.filter((m) => m.category === cat.id).length
            const isActive = selectedCat === cat.id
            return (
              <button
                key={cat.id}
                type="button"
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

        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: "10px" }}>
            <Search size={16} color="#94A3B8" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículos / Search items..."
              style={{ border: "none", outline: "none", flex: 1, fontSize: "0.85rem", color: "#0F172A", background: "transparent" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 140px 80px 80px", gap: "12px", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {["", "Artículo / Item", "Precio / Price", "CABYS", "Estado", ""].map((h, i) => (
              <p key={i} style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em" }}>{h}</p>
            ))}
          </div>

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
              <ItemThumb item={item} />
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{item.name}</p>
                <p style={{ fontSize: "0.68rem", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>{item.description}</p>
                {(item.modifierGroups?.length ?? 0) > 0 && (
                  <p style={{ fontSize: "0.62rem", color: "#1E40AF", fontWeight: 600, marginTop: "2px" }}>
                    {item.modifierGroups!.length} grupo{item.modifierGroups!.length !== 1 ? "s" : ""} de opciones / option groups
                  </p>
                )}
              </div>
              <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#0F172A" }}>{formatCRC(item.price)}</p>
              <p style={{ fontSize: "0.72rem", color: "#64748B", fontFamily: "monospace" }}>{CABYS[item.category]}</p>
              <button
                type="button"
                onClick={() => toggleAvail(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", cursor: "pointer", color: item.available ? "#059669" : "#DC2626", padding: 0 }}
              >
                {item.available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>{item.available ? "Activo" : "Inactivo"}</span>
              </button>
              <div style={{ display: "flex", gap: "6px" }}>
                <button type="button" onClick={() => setEditItem(item)} style={{ padding: "5px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", color: "#64748B" }}>
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeMenuItem(item.id)
                    reload()
                  }}
                  style={{ padding: "5px", borderRadius: "7px", border: "1px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", color: "#DC2626" }}
                >
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

      {editItem && (
        <MenuItemEditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(updated) => {
            const saved = updated.id === "new"
              ? { ...updated, id: createMenuItemId(updated.name || "item") }
              : updated
            upsertMenuItem(saved)
            reload()
            setEditItem(null)
          }}
        />
      )}
    </div>
  )
}

function ItemThumb({ item }: { item: CatalogItem }) {
  const [failed, setFailed] = useState(false)
  const boxStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "#F1F5F9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94A3B8",
    overflow: "hidden" as const,
  }

  if (!item.image || failed) {
    return (
      <div style={boxStyle} title={item.name}>
        <ImageIcon size={16} />
      </div>
    )
  }

  return (
    <img
      src={item.image}
      alt={item.name}
      style={{ ...boxStyle, ...menuItemImageStyle(item) }}
      onError={() => setFailed(true)}
    />
  )
}
