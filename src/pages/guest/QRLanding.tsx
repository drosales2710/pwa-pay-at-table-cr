import { useState, useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Wifi, ChevronRight, Globe, User } from "lucide-react"
import { useGuest } from "../../context/GuestContext"
import GuestPhoneFrame from "../../components/GuestPhoneFrame"
import RestaurantLogo from "../../components/RestaurantLogo"

export default function QRLanding() {
  const { tableId } = useParams<{ tableId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    restaurant,
    joinTable,
    guests,
    sessionClosed,
    resetTableForNewParty,
    grantMenuAccess,
  } = useGuest()
  const [step, setStep] = useState<"scan" | "init" | "ready">("scan")
  const [name, setName] = useState("")
  const [showNameStep, setShowNameStep] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    if (sessionClosed && !resetDone) {
      resetTableForNewParty()
      setResetDone(true)
    }
  }, [sessionClosed, resetDone, resetTableForNewParty])

  useEffect(() => {
    const t1 = setTimeout(() => setStep("init"), 800)
    const t2 = setTimeout(() => setStep("ready"), 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const restaurantParam = searchParams.get("restaurant") || restaurant.id
  const menuPath = `/menu?table=${tableId}&restaurant=${restaurantParam}`

  const enter = () => {
    if (!showNameStep) {
      setShowNameStep(true)
      return
    }
    grantMenuAccess()
    joinTable(name || undefined)
    navigate(menuPath)
  }

  const skipName = () => {
    grantMenuAccess()
    joinTable()
    navigate(menuPath)
  }

  const guestCount = guests.length

  return (
    <GuestPhoneFrame>
        <div className="flex flex-col min-h-screen bg-background overflow-y-auto pb-12 sm:pb-16">
          <div
            className="flex flex-col items-center justify-center pt-10 pb-8 sm:pt-16 sm:pb-12 px-6"
            style={{
              background: "linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-background) 100%)",
            }}
          >
            <RestaurantLogo restaurant={restaurant} size="md" className="mb-4" />
            <h1
              className="text-foreground text-center"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.8rem" }}
            >
              {restaurant.name}
            </h1>
            <p className="text-muted-foreground text-center mt-1" style={{ fontSize: "0.82rem" }}>
              {restaurant.tagline}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-12">
            <div className="relative mb-6 sm:mb-8 flex flex-col items-center">
              <div
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl border-4 border-primary p-3 bg-white shadow-xl"
                style={{
                  boxShadow:
                    "0 0 0 1px var(--color-primary), 0 8px 32px rgba(var(--color-primary-rgb), 0.15)",
                }}
              >
                <QRMock />
              </div>
              {step !== "scan" && (
                <div className="mt-4 w-full flex flex-col items-center gap-2">
                  <div className="w-full flex items-center justify-center gap-1.5 bg-primary text-white px-4 py-2 rounded-2xl shadow-md min-h-[44px]">
                    <Wifi size={14} className="flex-shrink-0" />
                    <span className="truncate text-center" style={{ fontSize: "0.85rem", fontWeight: 800 }}>
                      Mesa #{tableId} · Table #{tableId}
                    </span>
                  </div>
                  {guestCount > 0 && (
                    <p className="text-muted-foreground text-center" style={{ fontSize: "0.72rem" }}>
                      {guestCount} {guestCount === 1 ? "comensal activo" : "comensales activos"} / active guests
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full max-w-[300px] mt-2 sm:mt-4">
              {[
                { label: "Escaneo QR verificado", sublabel: "QR scan verified", done: step !== "scan" },
                {
                  label: "Sesión de mesa iniciada",
                  sublabel: "Table session started",
                  done: step === "init" || step === "ready",
                },
                { label: "Menú cargado y listo", sublabel: "Menu loaded & ready", done: step === "ready" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 mb-2 sm:mb-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      s.done ? "bg-status-green" : "bg-muted border border-border"
                    }`}
                  >
                    {s.done ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-border" />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground" style={{ fontSize: "0.85rem", fontWeight: s.done ? 600 : 400 }}>
                      {s.label}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>
                      {s.sublabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {showNameStep && step === "ready" && (
              <div className="w-full mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label
                  className="block text-foreground mb-2"
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                >
                  <User size={14} className="inline mr-1.5 text-muted-foreground" />
                  ¿Cómo te llamamos? <span className="text-muted-foreground font-normal">/ Optional</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: María"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mb-2"
                  style={{ fontSize: "0.95rem", fontFamily: "Outfit, sans-serif" }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={skipName}
                  className="text-muted-foreground w-full text-center py-2"
                  style={{ fontSize: "0.78rem", fontWeight: 600 }}
                >
                  Omitir / Skip
                </button>
              </div>
            )}

            <div className="mt-6 sm:mt-10 w-full">
              {step === "ready" ? (
                <button
                  onClick={enter}
                  className="w-full bg-primary text-white rounded-2xl flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-transform screen-fade min-h-[56px] sm:min-h-[60px]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                      {showNameStep ? "Entrar al menú" : "Ver el Menú"}
                    </p>
                    <p style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                      {showNameStep ? "Join table · View Menu" : "View Menu · No login required"}
                    </p>
                  </div>
                  <ChevronRight size={22} />
                </button>
              ) : (
                <div
                  className="w-full rounded-2xl bg-muted flex items-center justify-center shimmer"
                  style={{ minHeight: "60px" }}
                />
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-10 pb-4">
              <Globe size={13} className="text-muted-foreground" />
              <p className="text-muted-foreground text-center" style={{ fontSize: "0.72rem" }}>
                Sin registro · Sin descarga · Sin login / No registration needed
              </p>
            </div>
          </div>
        </div>
    </GuestPhoneFrame>
  )
}

function QRMock() {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  ]
  const cellSize = `${(100 / 18).toFixed(2)}%`
  return (
    <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(18, ${cellSize})` }}>
      {pattern.flat().map((cell, i) => (
        <div key={i} style={{ aspectRatio: "1", background: cell ? "#1C1917" : "transparent" }} />
      ))}
    </div>
  )
}
