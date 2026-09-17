import { useGuest } from "../../context/GuestContext"
import ConfirmationScreen from "../../components/ConfirmationScreen"
import GuestPhoneFrame from "../../components/GuestPhoneFrame"

export default function GuestConfirmationPage() {
  const g = useGuest()
  const allItems = [...g.sentOrders, ...g.cart]

  return (
    <GuestPhoneFrame scroll>
      <ConfirmationScreen
        allItems={allItems}
        payAmount={g.payAmount}
        tipAmount={g.tipAmount}
        tableBalance={g.tableBalance}
        restaurantName={g.restaurant.name}
      />
    </GuestPhoneFrame>
  )
}
