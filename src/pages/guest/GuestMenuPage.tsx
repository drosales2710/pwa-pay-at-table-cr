import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useGuest } from "../../context/GuestContext"
import MenuScreen from "../../components/MenuScreen"
import OrderHistoryScreen from "../../components/OrderHistoryScreen"
import CartDrawer from "../../components/CartDrawer"
import ModifierModal from "../../components/ModifierModal"

export default function GuestMenuPage() {
  const g = useGuest()
  const navigate = useNavigate()
  const [view, setView] = useState<"menu" | "orders">("menu")

  return (
    <div
      className="flex justify-center items-start"
      style={{ background: "#E5E0DA", height: "100svh", overflow: "hidden" }}
    >
      <div
        className="relative w-full max-w-[430px] bg-background flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "100svh" }}
      >
      <MenuScreen
        restaurant={g.restaurant}
        tableId={g.tableId}
        guestName={g.guestName}
        guests={g.guests}
        cart={g.cart}
        sentOrders={g.sentOrders}
        openReceiptCycle={g.receiptCycle}
        onAddItem={(item) => g.setModifierItem(item)}
        onOpenCart={() => g.setCartOpen(true)}
        onViewOrders={() => setView("orders")}
      />
      <CartDrawer
        cart={g.cart}
        open={g.cartOpen}
        onClose={() => g.setCartOpen(false)}
        onUpdateQty={g.updateCartQty}
        onRemove={g.removeFromCart}
        onSendToKitchen={g.sendToKitchen}
        onRequestBill={() => { g.setCartOpen(false); navigate("/checkout") }}
        sentOrders={g.sentOrders}
      />
      {g.modifierItem && (
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
            onCancelItem={g.cancelSentItem}
            kdsTickets={g.kdsTickets}
            onBack={() => setView("menu")}
            onOpenCart={() => {
              g.setCartOpen(true)
              setView("menu")
            }}
            onRequestBill={() => {
              g.setCartOpen(false)
              navigate("/checkout")
            }}
          />
        </div>
      )}
      </div>
    </div>
  )
}
