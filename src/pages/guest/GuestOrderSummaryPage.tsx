import { useNavigate } from "react-router-dom"
import { useGuest } from "../../context/GuestContext"
import OrderHistoryScreen from "../../components/OrderHistoryScreen"

export default function GuestOrderSummaryPage() {
  const g = useGuest()
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ height: "100svh" }}>
      <OrderHistoryScreen
        sentOrders={g.sentOrders}
        cart={g.cart}
        payments={g.payments}
        openReceiptCycle={g.receiptCycle}
        tableId={g.tableId}
        onCancelItem={g.cancelSentItem}
        kdsTickets={g.kdsTickets}
        onBack={() => navigate("/menu")}
        onRequestBill={() => navigate("/checkout")}
        onOpenCart={() => { navigate("/menu"); g.setCartOpen(true) }}
      />
    </div>
  )
}
