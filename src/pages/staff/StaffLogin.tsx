import { useEffect, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Lock, Users } from "lucide-react"
import { ApiError, isApiAvailable } from "../../api/client"
import { loginWithApi, validateServerSession } from "../../api/auth"
import { loginWithLocalFallback } from "../../api/localAuthFallback"
import { useGuest } from "../../context/GuestContext"
import { canRoleAccessPath, resolvePostLoginPath } from "../../utils/staffAccess"
import type { StaffRole } from "../../utils/staffDirectory"
import { getAdminSession } from "../../utils/adminSession"
import { getStaffPortalSession } from "../../utils/staffPortalSession"
import { getOpenStaffShift } from "../../utils/staffSession"
import { getServerAuthSession } from "../../utils/serverAuthSession"

export default function StaffLogin() {
  const { restaurant } = useGuest()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = (location.state as { from?: string } | null)?.from ?? null

  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [session, setSession] = useState(getServerAuthSession())
  const [needsManagerPin, setNeedsManagerPin] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const validated = await validateServerSession()
      if (cancelled) return

      if (validated) {
        setSession(validated)
        if (!returnTo || canRoleAccessPath(validated.staff.role, returnTo)) {
          navigate(resolvePostLoginPath(validated.staff.role, returnTo), { replace: true })
          return
        }
        setNeedsManagerPin(returnTo.startsWith("/admin"))
        setCheckingSession(false)
        return
      }

      const portal = getStaffPortalSession()
      const shift = getOpenStaffShift()
      const admin = getAdminSession()

      if (returnTo?.startsWith("/admin") && admin) {
        navigate(returnTo, { replace: true })
        return
      }

      const localRole = shift?.role ?? portal?.role ?? (admin ? "manager" : null)
      if (localRole && (!returnTo || canRoleAccessPath(localRole, returnTo))) {
        navigate(resolvePostLoginPath(localRole, returnTo), { replace: true })
        return
      }

      setNeedsManagerPin(Boolean(returnTo?.startsWith("/admin") && localRole))
      setCheckingSession(false)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, returnTo])

  if (checkingSession) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-phone-frame">
        <p className="text-caption text-muted-foreground">Verificando sesión… / Checking session…</p>
      </div>
    )
  }

  if (session && (!returnTo || canRoleAccessPath(session.staff.role, returnTo))) {
    return <Navigate to={resolvePostLoginPath(session.staff.role, returnTo)} replace />
  }

  const handleLogin = async () => {
    if (pin.length < 4) {
      setError("Ingresa tu PIN de 4 dígitos / Enter your 4-digit PIN")
      return
    }

    setLoading(true)
    setError("")

    try {
      const apiOnline = await isApiAvailable()
      if (!apiOnline) {
        const local = loginWithLocalFallback({ pin, restaurantId: restaurant.id })
        if (local.ok) {
          navigate(resolvePostLoginPath(local.role as StaffRole, returnTo))
          return
        }
        setError(local.error)
        setPin("")
        return
      }

      const result = await loginWithApi({
        pin,
        restaurantId: restaurant.id,
        deviceLabel: `Staff UI · ${restaurant.name}`,
      })

      if (!result.ok) {
        setError(result.error)
        setPin("")
        setLoading(false)
        return
      }

      navigate(resolvePostLoginPath(result.session.staff.role, returnTo))
    } catch (err) {
      const useLocalFallback =
        err instanceof ApiError && (err.status === 404 || err.status >= 500)

      if (useLocalFallback) {
        const local = loginWithLocalFallback({ pin, restaurantId: restaurant.id })
        if (local.ok) {
          navigate(resolvePostLoginPath(local.role as StaffRole, returnTo))
          return
        }
        setError(local.error)
      } else if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "PIN incorrecto / Incorrect PIN"
            : err.message
        )
      } else {
        const local = loginWithLocalFallback({ pin, restaurantId: restaurant.id })
        if (local.ok) {
          navigate(resolvePostLoginPath(local.role as StaffRole, returnTo))
          return
        }
        setError("No se pudo conectar al servidor / Could not reach server")
      }
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-phone-frame">
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        <div
          className="flex flex-col items-center pt-16 pb-12 px-6"
          style={{
            background:
              "linear-gradient(180deg, var(--color-muted) 0%, var(--color-background) 100%)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg bg-primary">
            <Users size={30} className="text-white" />
          </div>
          <h1 className="text-headline text-foreground text-center">{restaurant.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
            <span className="text-caption font-bold text-primary">
              Acceso de personal / Staff login
            </span>
          </div>
        </div>

        <div className="flex-1 px-5 py-8">
          <p className="text-caption text-muted-foreground mb-6 text-center">
            {needsManagerPin ? (
              <>
                Esta sesión no puede abrir Admin. Ingresá el PIN de gerencia.
                <br />
                This session can&apos;t open Admin. Enter the manager PIN.
              </>
            ) : (
              <>
                Ingresa tu PIN personal. La sesión se valida en el servidor.
                <br />
                Enter your PIN. Session is validated on the server.
              </>
            )}
          </p>

          <div className="mb-6">
            <label className="block text-foreground mb-2 text-caption font-bold">
              <Lock size={13} className="inline mr-1.5" />
              PIN de acceso / Access PIN
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleLogin()
                }}
                placeholder="••••"
                disabled={loading}
                className="w-full bg-muted border border-border rounded-xl px-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors pr-12 font-display font-bold text-center disabled:opacity-50"
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
            disabled={pin.length < 4 || loading}
            className="w-full text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-[0.98] transition-all bg-primary font-display font-bold disabled:opacity-40"
            style={{ minHeight: "56px", fontSize: "1rem" }}
          >
            {loading ? "Validando… / Validating…" : "Entrar / Sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}
