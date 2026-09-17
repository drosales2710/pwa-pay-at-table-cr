import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { UtensilsCrossed, Eye, EyeOff, Lock } from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import {
  authenticateStaffByPin,
  getOpenStaffShift,
  startStaffShift,
} from "../../utils/staffSession"

export default function ServerLogin() {
  const { restaurant } = useGuest()
  const existing = getOpenStaffShift()
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    if (existing) navigate("/server/floor-plan", { replace: true })
  }, [existing, navigate])

  if (existing) {
    return <Navigate to="/server/floor-plan" replace />
  }

  const handleLogin = () => {
    if (pin.length < 4) {
      setError("Ingresa tu PIN de 4 dígitos")
      return
    }

    const member = authenticateStaffByPin(pin)
    if (!member.ok) {
      setError(member.reason === "inactive" ? "Acceso desactivado" : "PIN incorrecto")
      setPin("")
      return
    }

    const result = startStaffShift({
      staffId: member.member.id,
      staffName: member.member.name,
      role: member.member.role,
      restaurantId: restaurant.id,
    })

    if (!result.ok) {
      setError(`${result.existing.staffName} tiene el turno abierto. Ciérralo antes de iniciar el tuyo.`)
      return
    }

    navigate("/server/floor-plan")
  }

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-phone-frame">
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        <div
          className="flex flex-col items-center pt-16 pb-12 px-6"
          style={{ background: "linear-gradient(180deg, var(--color-server-muted) 0%, var(--color-background) 100%)" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg bg-server">
            <UtensilsCrossed size={30} className="text-white" />
          </div>
          <h1 className="text-headline text-foreground text-center">{restaurant.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 px-3 py-1 rounded-full bg-server-muted">
            <span className="text-caption font-bold text-server">Acceso de personal</span>
          </div>
        </div>

        <div className="flex-1 px-5 py-8">
          <p className="text-caption text-muted-foreground mb-6 text-center">
            Ingresa tu PIN personal para iniciar turno.
            <br />
            Solo un empleado puede estar activo a la vez.
          </p>

          <div className="mb-6">
            <label className="block text-foreground mb-2 text-caption font-bold">
              <Lock size={13} className="inline mr-1.5" />
              PIN de acceso
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  setError("")
                }}
                onKeyDown={handlePinKeyDown}
                placeholder="••••"
                className="w-full bg-muted border border-border rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-server transition-colors pr-12 font-display font-bold text-center"
                style={{ fontSize: "1.5rem", letterSpacing: "0.4em" }}
              />
              <button
                type="button"
                onClick={() => setShowPin((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-status-red mb-4 text-caption font-semibold text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={pin.length < 4}
            className="w-full text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-[0.98] transition-all bg-server font-display font-bold disabled:opacity-40"
            style={{ minHeight: "56px", fontSize: "1rem" }}
          >
            Iniciar turno
          </button>
        </div>
      </div>
    </div>
  )
}
