import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useGuest } from "../../context/GuestContext"
import SplitCheckScreen from "../../components/SplitCheckScreen"
import TipScreen from "../../components/TipScreen"
import CheckoutModal from "../../components/CheckoutModal"
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
    setStep("tip")
  }

  const handleTipContinue = (tip: number) => {
    setTipAmount(tip)
    setStep("payment")
  }

  const handlePaymentSuccess = () => {
    g.recordPayment(payAmount, tipAmount, splitMethod)
    g.setPayAmount(payAmount)
    g.setTipAmount(tipAmount)
    navigate("/confirmation")
  }

  const handlePaymentClose = () => {
    g.releaseCheckoutLock()
    setStep("tip")
  }

  return (
    <div
      className="flex justify-center items-start"
      style={{ background: "#E5E0DA", height: "100svh", overflow: "hidden" }}
    >
      <div
        className="relative w-full max-w-[430px] bg-background flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "100svh" }}
      >
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
      </div>
    </div>
  )
}
