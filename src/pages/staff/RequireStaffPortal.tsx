import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { validateServerSession } from "../../api/auth"
import { getAdminSession } from "../../utils/adminSession"
import { getStaffById, type StaffRole } from "../../utils/staffDirectory"
import { clearStaffPortalSession, getStaffPortalSession } from "../../utils/staffPortalSession"
import { getServerAuthSession } from "../../utils/serverAuthSession"

interface RequireStaffPortalProps {
  roles: StaffRole[]
}

function getAuthorizedPortalMember(allowedRoles: StaffRole[]) {
  const server = getServerAuthSession()
  if (server && allowedRoles.includes(server.staff.role)) {
    return getStaffById(server.staff.id)
  }

  const portal = getStaffPortalSession()
  if (portal) {
    const member = getStaffById(portal.staffId)
    if (member?.status === "active" && allowedRoles.includes(member.role)) {
      return member
    }
    clearStaffPortalSession()
  }

  const admin = getAdminSession()
  if (admin && allowedRoles.includes("manager")) {
    const member = getStaffById(admin.staffId)
    if (member?.status === "active" && member.role === "manager") {
      return member
    }
  }

  return null
}

export default function RequireStaffPortal({ roles }: RequireStaffPortalProps) {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (getServerAuthSession()) {
        await validateServerSession()
      }
      if (cancelled) return
      setAuthorized(getAuthorizedPortalMember(roles) != null)
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [roles, location.pathname])

  if (checking) {
    return (
      <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#0A0A0A", color: "#9CA3AF" }}>
        Validando acceso… / Validating access…
      </div>
    )
  }

  if (!authorized) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
