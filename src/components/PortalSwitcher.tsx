import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShoppingCart, ChevronDown, UtensilsCrossed, Users as UsersIcon, LayoutDashboard, Wine, CreditCard } from "lucide-react"

export default function PortalSwitcher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const portals = [
    { name: "Guest UI", icon: <ShoppingCart size={16} />, path: "/m/7", color: "bg-primary" },
    { name: "Server UI", icon: <UsersIcon size={16} />, path: "/server/floor-plan", color: "bg-indigo-600" },
    { name: "Kitchen KDS", icon: <UtensilsCrossed size={16} />, path: "/kds/kitchen", color: "bg-orange-500" },
    { name: "Bar KDS", icon: <Wine size={16} />, path: "/kds/bar", color: "bg-blue-500" },
    { name: "Cashier", icon: <CreditCard size={16} />, path: "/kds/cashier", color: "bg-violet-600" },
    { name: "Admin", icon: <LayoutDashboard size={16} />, path: "/admin/dashboard", color: "bg-blue-600" },
  ]

  const currentPortal =
    portals.find((p) => window.location.hash.includes(p.path.replace(/^\//, ""))) || portals[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-white shadow-lg transition-all active:scale-95 ${currentPortal.color}`}
      >
        {currentPortal.icon}
        <span className="text-xs font-bold whitespace-nowrap">{currentPortal.name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-2 border-b border-border bg-muted/50">
              <p className="text-[10px] font-bold text-muted-foreground px-2 tracking-wider uppercase">Switch Portal</p>
            </div>
            <div className="p-1">
              {portals.map((portal) => (
                <button
                  key={portal.name}
                  onClick={() => {
                    navigate(portal.path)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors active:bg-muted/80 text-left"
                >
                  <div className={`w-8 h-8 rounded-lg ${portal.color} flex items-center justify-center text-white`}>
                    {portal.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{portal.name}</p>
                    <p className="text-[10px] text-muted-foreground">View Interface</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
