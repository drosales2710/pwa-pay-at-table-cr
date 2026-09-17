import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useGuest } from "../../context/GuestContext"
import SplitCheckScreen from "../../components/SplitCheckScreen"
import TipScreen from "../../components/TipScreen"
import CheckoutModal from "../../components/CheckoutModal"
import GuestPhoneFrame from "../../components/GuestPhoneFrame"
import SessionExpiredScreen from "../../components/SessionExpiredScreen"
import type { SplitMethod } from "../../types"
import type { ItemUnitSelection } from "../../utils/billing"
import { calculateTaxBreakdown } from "../../utils/tax"
import { getOpenBillItems } from "../../utils/billing"

type Step = "split" | "tip" | "payment"

export default function GuestCheckoutPage() {
  const g = useGuest()
  const navigate = useNavigate()
  const { releaseCheckoutLock, tableId } = g
  const openBillItems = useMemo(
    () => getOpenBillItems(g.sentOrders, g.cart, g.payments),
    [g.sentOrders, g.cart, g.payments]
  )

  const [step, setStep] = useState<Step>("split")
  const [payAmount, setPayAmount] = useState(0)
  const [tipAmount, setTipAmount] = useState(0)
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("full")
  const [itemSelections, setItemSelections] = useState<ItemUnitSelection[] | undefined>()

  const taxBreakdown = useMemo(
    () => calculateTaxBreakdown(payAmount, g.restaurant.taxConfig, tipAmount),
    [payAmount, g.restaurant.taxConfig, tipAmount]
  )

  useEffect(() => {
    return () => {
      releaseCheckoutLock()
    }
  }, [releaseCheckoutLock])

  const handleSplitBack = useCallback(() => {
    releaseCheckoutLock()
    navigate(`/menu?table=${tableId}`)
  }, [releaseCheckoutLock, navigate, tableId])

  const handleSplitContinue = (
    method: SplitMethod,
    amount: number,
    partySize: number,
    unitSelections?: ItemUnitSelection[]
  ) => {
    const remaining = g.tableBalance.remaining
    let resolved: number

    if (method === "equal") {
      resolved = g.lockSplitForCheckout(method, partySize)
    } else if (method === "myItems") {
      resolved = g.lockSplitForCheckout(method, partySize, unitSelections)
    } else {
      g.lockSplitForCheckout(method, partySize)
      resolved = Math.min(amount, remaining)
    }

    resolved = Math.min(Math.max(0, resolved), remaining)
    setSplitMethod(method)
    setPayAmount(resolved)
    setItemSelections(method === "myItems" ? unitSelections : undefined)
    setStep("tip")
  }

  const handleTipContinue = (tip: number) => {
    setTipAmount(tip)
    setStep("payment")
  }

  const handlePaymentSuccess = (method: "apple" | "google" | "card") => {
    g.recordPayment(payAmount, tipAmount, splitMethod, itemSelections, method)
    g.setPayAmount(payAmount)
    g.setTipAmount(tipAmount)
    navigate("/confirmation")
  }

  const handlePaymentClose = () => {
    g.releaseCheckoutLock()
    setStep("tip")
  }

  if (g.sessionClosed || !g.menuAccessGranted) {
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
        {step === "split" && (
          <SplitCheckScreen
            allItems={openBillItems}
            onBack={handleSplitBack}
            onContinue={handleSplitContinue}
          />
        )}
        {step === "tip" && (
          <TipScreen
            payAmount={payAmount}
            taxConfig={g.restaurant.taxConfig}
            onBack={() => {
              g.releaseCheckoutLock()
              setItemSelections(undefined)
              setStep("split")
            }}
            onContinue={handleTipContinue}
          />
        )}
        {step === "payment" && (
          <>
            <TipScreen
              payAmount={payAmount}
              taxConfig={g.restaurant.taxConfig}
              tipAmount={tipAmount}
              onBack={() => setStep("tip")}
              onContinue={handleTipContinue}
            />
            <CheckoutModal
              subtotal={payAmount}
              taxConfig={g.restaurant.taxConfig}
              tipAmount={tipAmount}
              total={taxBreakdown.total}
              onClose={handlePaymentClose}
              onSuccess={handlePaymentSuccess}
            />
          </>
        )}
    </GuestPhoneFrame>
  )
}
