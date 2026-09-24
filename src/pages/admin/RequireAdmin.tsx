import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { validateServerSession } from "../../api/auth"
import { getAdminSession } from "../../utils/adminSession"
import { getServerAuthSession } from "../../utils/serverAuthSession"

function isAdminAuthorized() {
  const server = getServerAuthSession()
  if (server?.staff.role === "manager") return true
  const admin = getAdminSession()
  return admin != null
}

export default function RequireAdmin() {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await validateServerSession()
      if (cancelled) return
      setAuthorized(isAdminAuthorized())
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#F1F5F9", color: "#64748B" }}>
        Validando acceso… / Validating access…
      </div>
    )
  }

  if (!authorized) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
