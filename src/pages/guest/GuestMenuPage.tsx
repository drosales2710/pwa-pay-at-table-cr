import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import MenuScreen from "../../components/MenuScreen"
import OrderHistoryScreen from "../../components/OrderHistoryScreen"
import CartDrawer from "../../components/CartDrawer"
import ModifierModal from "../../components/ModifierModal"
import GuestPhoneFrame from "../../components/GuestPhoneFrame"
import SessionExpiredScreen from "../../components/SessionExpiredScreen"

export default function GuestMenuPage() {
  const g = useGuest()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<"menu" | "orders">("menu")

  const staffPreview = searchParams.get("staffPreview") === "1"
  const returnPath = searchParams.get("return") ?? "/server/floor-plan"

  useEffect(() => {
    if (!staffPreview) return
    const tableParam = searchParams.get("table")
    if (tableParam) g.grantStaffMenuPreview(tableParam)
  }, [staffPreview, searchParams, g.grantStaffMenuPreview])

  if (!staffPreview && (g.sessionClosed || !g.menuAccessGranted)) {
    return (
      <SessionExpiredScreen
        tableId={g.tableId}
        restaurantId={g.restaurant.id}
        reason={g.sessionClosed ? "closed" : "rescan"}
      />
    )
  }

  return (
    <GuestPhoneFrame>
      {staffPreview && (
        <div className="sticky top-0 z-[110] safe-top bg-server px-4 py-2.5 flex items-center gap-2 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(returnPath)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white active:scale-95"
            aria-label="Volver a la mesa"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-bold text-white truncate">Vista del menú · Mesa {g.tableId}</p>
            <p className="text-micro text-white/80">Lo que ven los comensales en su teléfono</p>
          </div>
        </div>
      )}

      <MenuScreen
        restaurant={g.restaurant}
        tableId={g.tableId}
        guestName={staffPreview ? "Vista previa" : g.guestName}
        guests={g.guests}
        cart={g.cart}
        sentOrders={g.sentOrders}
        openTotal={g.tableBalance.remaining}
        previewMode={staffPreview}
        menuItems={g.menuItems}
        showUsd={g.showUsd}
        onAddItem={(item) => g.setModifierItem(item)}
        onOpenCart={() => g.setCartOpen(true)}
        onViewOrders={() => setView("orders")}
      />
      {!staffPreview && (
        <CartDrawer
          cart={g.cart}
          open={g.cartOpen}
          onClose={() => g.setCartOpen(false)}
          onUpdateQty={g.updateCartQty}
          onRemove={g.removeFromCart}
          onSendToKitchen={g.sendToKitchen}
          onRequestBill={() => {
            g.setCartOpen(false)
            navigate("/checkout")
          }}
          sentOrders={g.sentOrders}
          payments={g.payments}
          exchangeRate={g.restaurant.exchangeRate}
        />
      )}
      {!staffPreview && g.modifierItem && (
        <ModifierModal
          item={g.modifierItem}
          onClose={() => g.setModifierItem(null)}
          onConfirm={g.handleModifierConfirm}
        />
      )}
      {view === "orders" && (
        <div className="absolute inset-0 z-[100]">
          <OrderHistoryScreen
            sentOrders={g.sentOrders}
            cart={g.cart}
            payments={g.payments}
            openReceiptCycle={g.receiptCycle}
            tableId={g.tableId}
            onCancelItem={
              staffPreview
                ? () => ({ ok: false as const, reason: "not_found" as const })
                : g.cancelSentItem
            }
            kdsTickets={g.kdsTickets}
            onBack={() => setView("menu")}
            onOpenCart={() => {
              if (!staffPreview) g.setCartOpen(true)
              setView("menu")
            }}
            onRequestBill={() => {
              g.setCartOpen(false)
              if (staffPreview) navigate(returnPath)
              else navigate("/checkout")
            }}
          />
        </div>
      )}
    </GuestPhoneFrame>
  )
}
