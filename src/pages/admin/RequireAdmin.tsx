import { Navigate, Outlet } from "react-router-dom"
import { clearAdminSession, getAdminSession } from "../../utils/adminSession"
import { getStaffById } from "../../utils/staffDirectory"

export default function RequireAdmin() {
  const session = getAdminSession()
  if (!session) return <Navigate to="/admin/login" replace />
  const member = getStaffById(session.staffId)
  if (!member || member.status !== "active" || member.role !== "manager") {
    clearAdminSession()
    return <Navigate to="/admin/login" replace />
  }
  return <Outlet />
}
