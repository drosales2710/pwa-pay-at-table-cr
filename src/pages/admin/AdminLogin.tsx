import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { LayoutDashboard, Eye, EyeOff, Lock } from "lucide-react"
import { authenticateAdminByPin } from "../../utils/staffDirectory"
import { getAdminSession, startAdminSession } from "../../utils/adminSession"
import { getLiveRestaurant } from "../../utils/restaurantConfig"
import { DEFAULT_RESTAURANT_ID } from "../../data/restaurants"

export default function AdminLogin() {
  const existing = getAdminSession()
  const restaurant = getLiveRestaurant(DEFAULT_RESTAURANT_ID)
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    if (existing) navigate("/admin/dashboard", { replace: true })
  }, [existing, navigate])

  if (existing) return <Navigate to="/admin/dashboard" replace />

  const handleLogin = () => {
    if (pin.length < 4) {
      setError("Ingresa el PIN de gerencia / Enter the manager PIN")
      return
    }
    const result = authenticateAdminByPin(pin)
    if (!result.ok) {
      setError(
        result.reason === "inactive"
          ? "Acceso desactivado / Access disabled"
          : "PIN incorrecto / Incorrect PIN"
      )
      setPin("")
      return
    }
    startAdminSession(result.member, restaurant.id)
    navigate("/admin/dashboard")
  }

  return (
    <div style={{ minHeight: "100svh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "18px", border: "1px solid #E2E8F0", padding: "36px 28px", boxShadow: "0 12px 40px #1E40AF14" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "#1E40AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <LayoutDashboard size={24} color="#fff" />
        </div>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#0F172A", margin: 0 }}>
          {restaurant.name}
        </h1>
        <p style={{ color: "#64748B", fontSize: "0.82rem", marginTop: "4px" }}>
          Acceso de gerencia / Admin portal
        </p>
        <p style={{ color: "#94A3B8", fontSize: "0.75rem", margin: "18px 0 12px" }}>
          Ingresa el PIN de un gerente activo. / Enter an active manager PIN.
        </p>

        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "6px" }}>
          <Lock size={12} style={{ display: "inline", marginRight: "6px" }} />
          PIN de acceso / Access PIN
        </label>
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoFocus
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              setError("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin()
            }}
            placeholder="••••"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 44px 14px 14px",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 700,
              fontSize: "1.4rem",
              letterSpacing: "0.4em",
              textAlign: "center",
              color: "#0F172A",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPin((p) => !p)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#94A3B8" }}
            aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p style={{ color: "#DC2626", fontSize: "0.8rem", fontWeight: 600, marginBottom: "12px" }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={pin.length < 4}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "12px",
            background: "#1E40AF",
            color: "#fff",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: pin.length < 4 ? "default" : "pointer",
            opacity: pin.length < 4 ? 0.4 : 1,
          }}
        >
          Entrar / Sign in
        </button>
      </div>
    </div>
  )
}
