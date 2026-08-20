import { NavLink, Outlet, useNavigate } from "react-router-dom"
import PortalSwitcher from "../../components/PortalSwitcher"
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react"

const NAV = [
  { to: "/admin/dashboard",    label: "Dashboard",          labelEn: "Overview",      icon: LayoutDashboard },
  { to: "/admin/menu-builder", label: "Menú",               labelEn: "Menu Builder",  icon: UtensilsCrossed },
  { to: "/admin/tables",       label: "Mesas & QR",         labelEn: "Tables & QR",   icon: QrCode },
  { to: "/admin/reports",      label: "Reportes",           labelEn: "Analytics",     icon: BarChart2 },
  { to: "/admin/settings",     label: "Configuración",      labelEn: "Settings",      icon: Settings },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div style={{ display: "flex", minHeight: "100svh", background: "#F1F5F9", fontFamily: "Nunito, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: "220px", minHeight: "100svh", background: "#1E40AF", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1D4ED880" }}>
          <p style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1 }}>
            La Terraza
          </p>
          <p style={{ color: "#93C5FD", fontSize: "0.7rem", marginTop: "2px" }}>Admin Portal</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV.map(({ to, label, labelEn, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                marginBottom: "4px",
                textDecoration: "none",
                background: isActive ? "#1D4ED8" : "transparent",
                color: isActive ? "#FFFFFF" : "#BFDBFE",
                transition: "all 0.15s",
              })}
            >
              <Icon size={17} />
              <div>
                <p style={{ fontSize: "0.82rem", fontWeight: 700, lineHeight: 1 }}>{label}</p>
                <p style={{ fontSize: "0.62rem", opacity: 0.65, lineHeight: 1.2 }}>{labelEn}</p>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 10px 20px" }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", width: "100%", background: "transparent", border: "none", cursor: "pointer", color: "#BFDBFE" }}
          >
            <LogOut size={16} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Salir / Exit</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "16px 32px", display: "flex", justifyContent: "flex-end", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
          <PortalSwitcher />
        </header>
        <div style={{ flex: 1, padding: "28px 32px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
