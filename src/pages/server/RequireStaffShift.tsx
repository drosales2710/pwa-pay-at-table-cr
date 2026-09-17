import { Navigate, Outlet } from "react-router-dom"
import { getOpenStaffShift } from "../../utils/staffSession"

export default function RequireStaffShift() {
  const shift = getOpenStaffShift()
  if (!shift) return <Navigate to="/server/login" replace />
  return <Outlet />
}
