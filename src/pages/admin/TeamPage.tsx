import { useMemo, useState, type CSSProperties } from "react"
import { Plus, RefreshCw, ShieldOff, PauseCircle, CheckCircle2, X } from "lucide-react"
import {
  countActiveManagers,
  createStaff,
  listStaff,
  resetStaffPin,
  updateStaff,
  type StaffAccount,
  type StaffRole,
  type StaffStatus,
} from "../../utils/staffDirectory"
import { STAFF_ROLE_LABELS, forceEndStaffShift, getOpenStaffShift } from "../../utils/staffSession"

const ROLE_OPTIONS: StaffRole[] = ["server", "bartender", "cashier", "manager"]

const STATUS_LABEL: Record<StaffStatus, { es: string; en: string; color: string }> = {
  active: { es: "Activo", en: "Active", color: "#059669" },
  suspended: { es: "Suspendido", en: "Suspended", color: "#D97706" },
  terminated: { es: "Terminado", en: "Terminated", color: "#DC2626" },
}

export default function TeamPage() {
  const [tick, setTick] = useState(0)
  const staff = useMemo(() => listStaff(true), [tick])
  const [name, setName] = useState("")
  const [role, setRole] = useState<StaffRole>("server")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [revealedPin, setRevealedPin] = useState<{ name: string; pin: string; title: string } | null>(null)

  const refresh = () => setTick((n) => n + 1)

  const handleCreate = () => {
    const result = createStaff({ name, role, phone })
    if (!result.ok) {
      setError(result.reason === "name" ? "El nombre es requerido / Name is required" : "PIN duplicado / Duplicate PIN")
      return
    }
    setName("")
    setPhone("")
    setError("")
    refresh()
    setRevealedPin({ name: result.member.name, pin: result.member.pin, title: "PIN asignado / PIN issued" })
  }

  const handleResetPin = (member: StaffAccount) => {
    const result = resetStaffPin(member.id)
    if (!result.ok) return
    refresh()
    setRevealedPin({ name: member.name, pin: result.pin, title: "PIN restablecido / PIN reset" })
  }

  const handleStatus = (member: StaffAccount, status: StaffStatus) => {
    if (member.role === "manager" && member.status === "active" && status !== "active") {
      if (countActiveManagers(member.id) < 1) {
        setError("Debe quedar al menos un gerente activo / Keep at least one active manager")
        return
      }
    }
    updateStaff(member.id, { status })
    if (status !== "active") {
      const open = getOpenStaffShift()
      if (open?.staffId === member.id) forceEndStaffShift(member.id)
    }
    setError("")
    refresh()
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#0F172A", lineHeight: 1 }}>
          Equipo <span style={{ color: "#64748B", fontWeight: 400, fontSize: "1rem" }}>/ Team</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
          Cuentas de personal, PINs y acceso / Staff accounts, PINs and access
        </p>
      </div>

      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "18px 20px", marginBottom: "20px" }}>
        <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: "#0F172A", marginBottom: "12px" }}>
          Nuevo empleado / Add employee
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", marginBottom: "4px" }}>Nombre / Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", marginBottom: "4px" }}>Rol / Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} style={inputStyle}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748B", marginBottom: "4px" }}>Teléfono / Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", border: "none", borderRadius: "10px", background: "#1E40AF", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", height: "40px" }}
          >
            <Plus size={15} /> Crear / Create
          </button>
        </div>
        {error && <p style={{ color: "#DC2626", fontSize: "0.78rem", fontWeight: 600, marginTop: "10px" }}>{error}</p>}
      </div>

      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Nombre / Name", "Rol / Role", "Estado / Status", "Acciones / Actions"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const st = STATUS_LABEL[s.status]
              return (
                <tr key={s.id} style={{ borderTop: "1px solid #F1F5F9", opacity: s.status === "terminated" ? 0.55 : 1 }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0F172A" }}>{s.name}</p>
                    {s.phone && <p style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{s.phone}</p>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "#475569" }}>{STAFF_ROLE_LABELS[s.role]}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: st.color, background: `${st.color}18`, padding: "3px 8px", borderRadius: "20px" }}>
                      {st.es} / {st.en}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      <button type="button" onClick={() => handleResetPin(s)} style={actionBtn}>
                        <RefreshCw size={12} /> Reset PIN
                      </button>
                      {s.status === "active" && (
                        <button type="button" onClick={() => handleStatus(s, "suspended")} style={actionBtn}>
                          <PauseCircle size={12} /> Suspender / Suspend
                        </button>
                      )}
                      {s.status === "suspended" && (
                        <button type="button" onClick={() => handleStatus(s, "active")} style={actionBtn}>
                          <CheckCircle2 size={12} /> Reactivar / Restore
                        </button>
                      )}
                      {s.status !== "terminated" && (
                        <button type="button" onClick={() => handleStatus(s, "terminated")} style={{ ...actionBtn, color: "#DC2626", borderColor: "#FECACA", background: "#FEF2F2" }}>
                          <ShieldOff size={12} /> Terminar / Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {revealedPin && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setRevealedPin(null)}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "360px", maxWidth: "calc(100vw - 32px)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem", color: "#0F172A" }}>{revealedPin.title}</p>
              <button type="button" onClick={() => setRevealedPin(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94A3B8" }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#64748B", marginBottom: "12px" }}>{revealedPin.name}</p>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "2rem", letterSpacing: "0.25em", color: "#1E40AF", textAlign: "center" }}>{revealedPin.pin}</p>
            <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "12px", textAlign: "center" }}>
              Guárdalo ahora. No se vuelve a mostrar. / Save it now. It will not be shown again.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "0.85rem",
  color: "#0F172A",
  outline: "none",
}

const actionBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid #E2E8F0",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#475569",
}
