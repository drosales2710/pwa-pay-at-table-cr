import { useRef, useState, type CSSProperties, type RefObject } from "react"
import { Plus, Trash2, Upload, X, Check, ImageIcon, GripVertical } from "lucide-react"
import type { ModifierGroup, ModifierOption } from "../../types"
import { menuItemImageStyle } from "../../utils/menuImage"
import type { CatalogItem } from "../../utils/menuCatalog"

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#64748B",
  marginBottom: "5px",
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "0.85rem",
  color: "#0F172A",
  outline: "none",
  boxSizing: "border-box",
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function makeId(prefix: string, label: string) {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
  return `${prefix}-${slug || "item"}-${Date.now().toString().slice(-4)}`
}

function parseSignedAmount(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === "-") return 0
  const negative = trimmed.startsWith("-")
  const digits = trimmed.replace(/[^\d]/g, "")
  if (!digits) return 0
  return negative ? -Number(digits) : Number(digits)
}

function signedAmountDisplay(value: number) {
  if (value === 0) return ""
  return value < 0 ? String(value) : String(value)
}

export default function MenuItemEditModal({
  item,
  onClose,
  onSave,
}: {
  item: CatalogItem
  onClose: () => void
  onSave: (updated: CatalogItem) => void
}) {
  const [form, setForm] = useState<CatalogItem>({
    ...item,
    modifierGroups: item.modifierGroups ? [...item.modifierGroups] : [],
    imageFocus: item.imageFocus ?? { x: 50, y: 50 },
    imageZoom: item.imageZoom ?? 1,
  })
  const [priceInput, setPriceInput] = useState(item.price > 0 ? String(item.price) : "")
  const [imageError, setImageError] = useState("")
  const imageFileRef = useRef<HTMLInputElement>(null)

  const handlePriceChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    setPriceInput(digits)
    setForm((f) => ({ ...f, price: digits === "" ? 0 : Number(digits) }))
  }

  const handleImageFile = (file: File) => {
    setImageError("")
    if (!file.type.startsWith("image/")) {
      setImageError("Selecciona una imagen / Select an image file")
      return
    }
    if (file.size > 512_000) {
      setImageError("Máx. 500 KB / Max 500 KB — usa una URL externa / use an external URL")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        setForm((f) => ({
          ...f,
          image: result,
          imageFocus: f.imageFocus ?? { x: 50, y: 50 },
          imageZoom: f.imageZoom ?? 1,
        }))
      }
    }
    reader.readAsDataURL(file)
  }

  const updateGroups = (groups: ModifierGroup[]) => {
    setForm((f) => ({ ...f, modifierGroups: groups }))
  }

  const addGroup = () => {
    const group: ModifierGroup = {
      id: makeId("grp", "grupo"),
      name: "Nueva opción / New option",
      type: "single",
      required: false,
      options: [{ id: makeId("opt", "opcion"), name: "Opción 1", priceAdd: 0 }],
    }
    updateGroups([...(form.modifierGroups ?? []), group])
  }

  const save = () => {
    const cleanedGroups = (form.modifierGroups ?? [])
      .map((g) => ({
        ...g,
        name: g.name.trim(),
        options: g.options.filter((o) => o.name.trim()),
      }))
      .filter((g) => g.name && g.options.length > 0)
    onSave({ ...form, modifierGroups: cleanedGroups.length > 0 ? cleanedGroups : undefined })
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", width: "560px", maxWidth: "100%", maxHeight: "calc(100svh - 32px)", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#0F172A" }}>
            {form.id === "new" ? "Nuevo artículo / New Item" : "Editar artículo / Edit Item"}
          </p>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={20} />
          </button>
        </div>

        <ImageCropSection
          image={form.image}
          focus={form.imageFocus ?? { x: 50, y: 50 }}
          zoom={form.imageZoom ?? 1}
          imageError={imageError}
          onImageError={setImageError}
          onImageChange={(image) => setForm((f) => ({ ...f, image }))}
          onFocusChange={(imageFocus) => setForm((f) => ({ ...f, imageFocus }))}
          onZoomChange={(imageZoom) => setForm((f) => ({ ...f, imageZoom }))}
          onUpload={handleImageFile}
          imageFileRef={imageFileRef}
        />

        {[
          { label: "Nombre / Name", key: "name" as const },
          { label: "Descripción / Description", key: "description" as const },
        ].map(({ label, key }) => (
          <div key={key} style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Precio CRC / Price</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748B", fontSize: "0.85rem", fontWeight: 600 }}>₡</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "28px" }}
            />
          </div>
        </div>

        <ModifierGroupsSection
          groups={form.modifierGroups ?? []}
          onChange={updateGroups}
          onAdd={addGroup}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
            Cancelar / Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!form.name.trim() || form.price <= 0}
            style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#1E40AF", cursor: !form.name.trim() || form.price <= 0 ? "default" : "pointer", opacity: !form.name.trim() || form.price <= 0 ? 0.45 : 1, fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Check size={15} /> Guardar / Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ImageCropSection({
  image,
  focus,
  zoom,
  imageError,
  onImageError,
  onImageChange,
  onFocusChange,
  onZoomChange,
  onUpload,
  imageFileRef,
}: {
  image: string
  focus: { x: number; y: number }
  zoom: number
  imageError: string
  onImageError: (msg: string) => void
  onImageChange: (url: string) => void
  onFocusChange: (focus: { x: number; y: number }) => void
  onZoomChange: (zoom: number) => void
  onUpload: (file: File) => void
  imageFileRef: RefObject<HTMLInputElement | null>
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const pickFocus = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    onFocusChange({
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    })
  }

  const previewItem = { imageFocus: focus, imageZoom: zoom }

  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>Imagen / Image</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
        <div>
          <p style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: "6px" }}>Editor — arrastra / drag</p>
          <div
            ref={frameRef}
            onPointerDown={(e) => {
              dragging.current = true
              frameRef.current?.setPointerCapture(e.pointerId)
              pickFocus(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              pickFocus(e.clientX, e.clientY)
            }}
            onPointerUp={() => {
              dragging.current = false
            }}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: "12px",
              border: "2px dashed #CBD5E1",
              background: "#F8FAFC",
              overflow: "hidden",
              position: "relative",
              cursor: image ? "grab" : "default",
              touchAction: "none",
            }}
          >
            {image ? (
              <>
                <img src={image} alt="" style={menuItemImageStyle(previewItem)} draggable={false} />
                <div
                  style={{
                    position: "absolute",
                    left: `${focus.x}%`,
                    top: `${focus.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 2px #1E40AF",
                    pointerEvents: "none",
                  }}
                />
              </>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}>
                <ImageIcon size={28} />
              </div>
            )}
          </div>
        </div>
        <div>
          <p style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: "6px" }}>Vista menú / Menu preview</p>
          <div style={{ width: "96px", height: "96px", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden", background: "#F1F5F9" }}>
            {image ? <img src={image} alt="" style={menuItemImageStyle(previewItem)} /> : null}
          </div>
        </div>
      </div>

      {image && (
        <div style={{ marginBottom: "10px" }}>
          <label style={{ ...labelStyle, marginBottom: "4px" }}>
            Zoom <span style={{ fontWeight: 400, color: "#94A3B8" }}>({Math.round(zoom * 100)}%)</span>
          </label>
          <input
            type="range"
            min={100}
            max={200}
            step={5}
            value={Math.round(zoom * 100)}
            onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
            style={{ width: "100%" }}
          />
        </div>
      )}

      <input
        type="url"
        placeholder="https://…"
        value={image.startsWith("data:") ? "" : image}
        onChange={(e) => {
          onImageError("")
          onImageChange(e.target.value.trim())
        }}
        style={{ ...inputStyle, fontSize: "0.82rem", marginBottom: "8px" }}
      />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => imageFileRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}
        >
          <Upload size={13} /> Subir / Upload
        </button>
        {image && (
          <button
            type="button"
            onClick={() => {
              onImageChange("")
              onFocusChange({ x: 50, y: 50 })
              onZoomChange(1)
            }}
            style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid #FEE2E2", background: "#FEF2F2", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#DC2626" }}
          >
            Quitar / Remove
          </button>
        )}
      </div>
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ""
        }}
      />
      {image.startsWith("data:") && (
        <p style={{ fontSize: "0.68rem", color: "#059669", marginTop: "6px" }}>Imagen cargada / Image uploaded</p>
      )}
      {imageError && <p style={{ fontSize: "0.68rem", color: "#DC2626", marginTop: "6px" }}>{imageError}</p>}
    </div>
  )
}

function ModifierGroupsSection({
  groups,
  onChange,
  onAdd,
}: {
  groups: ModifierGroup[]
  onChange: (groups: ModifierGroup[]) => void
  onAdd: () => void
}) {
  const updateGroup = (index: number, patch: Partial<ModifierGroup>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index))
  }

  const updateOption = (groupIndex: number, optionIndex: number, patch: Partial<ModifierOption>) => {
    const next = [...groups]
    const options = [...next[groupIndex].options]
    options[optionIndex] = { ...options[optionIndex], ...patch }
    next[groupIndex] = { ...next[groupIndex], options }
    onChange(next)
  }

  const addOption = (groupIndex: number) => {
    const next = [...groups]
    next[groupIndex] = {
      ...next[groupIndex],
      options: [
        ...next[groupIndex].options,
        { id: makeId("opt", "opcion"), name: `Opción ${next[groupIndex].options.length + 1}`, priceAdd: 0 },
      ],
    }
    onChange(next)
  }

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const next = [...groups]
    next[groupIndex] = {
      ...next[groupIndex],
      options: next[groupIndex].options.filter((_, i) => i !== optionIndex),
    }
    onChange(next)
  }

  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>
          Opciones del artículo / Item options
        </label>
        <button
          type="button"
          onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "8px", border: "1px solid #DBEAFE", background: "#EFF6FF", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#1E40AF" }}
        >
          <Plus size={13} /> Grupo / Group
        </button>
      </div>
      <p style={{ fontSize: "0.68rem", color: "#94A3B8", marginBottom: "12px" }}>
        Una selección = menú desplegable · Varias = multi-select (como Ceviche o Patacones). / Single = dropdown · Multiple = multi-select.
      </p>

      {groups.length === 0 ? (
        <div style={{ padding: "16px", borderRadius: "10px", border: "1px dashed #E2E8F0", color: "#94A3B8", fontSize: "0.78rem", textAlign: "center" }}>
          Sin opciones — agrega un grupo si el plato lleva variantes. / No options yet.
        </div>
      ) : (
        groups.map((group, gi) => (
          <div key={group.id} style={{ border: "1px solid #E2E8F0", borderRadius: "12px", padding: "12px", marginBottom: "10px", background: "#FAFBFC" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
              <GripVertical size={16} color="#CBD5E1" style={{ marginTop: "8px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ ...labelStyle, fontSize: "0.68rem" }}>Nombre del grupo / Group name</label>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                  style={{ ...inputStyle, fontSize: "0.82rem" }}
                />
              </div>
              <button type="button" onClick={() => removeGroup(gi)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#DC2626", padding: "4px", marginTop: "18px" }}>
                <Trash2 size={15} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div>
                <label style={{ ...labelStyle, fontSize: "0.68rem" }}>Tipo / Type</label>
                <select
                  value={group.type}
                  onChange={(e) => updateGroup(gi, { type: e.target.value as ModifierGroup["type"] })}
                  style={{ ...inputStyle, fontSize: "0.82rem" }}
                >
                  <option value="single">Una selección / Single (dropdown)</option>
                  <option value="multiple">Varias / Multiple (multi-select)</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", fontWeight: 600, color: "#475569", cursor: "pointer", paddingBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(e) => updateGroup(gi, { required: e.target.checked })}
                  />
                  Obligatorio / Required
                </label>
              </div>
            </div>

            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em", marginBottom: "6px" }}>OPCIONES / CHOICES</p>
            {group.options.map((opt, oi) => (
              <OptionRow
                key={opt.id}
                option={opt}
                onNameChange={(name) => updateOption(gi, oi, { name })}
                onPriceChange={(priceAdd) => updateOption(gi, oi, { priceAdd })}
                onRemove={() => removeOption(gi, oi)}
                canRemove={group.options.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={() => addOption(gi)}
              style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "4px", padding: "6px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#1E40AF" }}
            >
              <Plus size={12} /> Agregar opción / Add choice
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function OptionRow({
  option,
  onNameChange,
  onPriceChange,
  onRemove,
  canRemove,
}: {
  option: ModifierOption
  onNameChange: (name: string) => void
  onPriceChange: (priceAdd: number) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [priceInput, setPriceInput] = useState(signedAmountDisplay(option.priceAdd))

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 28px", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
      <input
        type="text"
        value={option.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Nombre / Name"
        style={{ ...inputStyle, fontSize: "0.78rem", padding: "7px 10px" }}
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="+₡0"
        value={priceInput}
        onChange={(e) => {
          setPriceInput(e.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, ""))
          onPriceChange(parseSignedAmount(e.target.value))
        }}
        style={{ ...inputStyle, fontSize: "0.78rem", padding: "7px 8px", textAlign: "right" }}
        title="Extra en colones (negativo = descuento) / Extra CRC (negative = discount)"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        style={{ border: "none", background: "transparent", cursor: canRemove ? "pointer" : "default", color: canRemove ? "#DC2626" : "#E2E8F0", padding: "2px" }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
