import { useGuest } from "../../context/GuestContext"
import ConfirmationScreen from "../../components/ConfirmationScreen"

export default function GuestConfirmationPage() {
  const g = useGuest()
  const allItems = [...g.sentOrders, ...g.cart]

  return (
    <div
      className="flex justify-center items-start"
      style={{ background: "#E5E0DA", height: "100svh", overflow: "hidden" }}
    >
      <div
        className="relative w-full max-w-[430px] bg-background flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "100svh" }}
      >
        <div className="flex-1 overflow-y-auto">
          <ConfirmationScreen
            allItems={allItems}
            payAmount={g.payAmount}
            tipAmount={g.tipAmount}
            tableBalance={g.tableBalance}
            restaurantName={g.restaurant.name}
          />
        </div>
      </div>
    </div>
  )
}
