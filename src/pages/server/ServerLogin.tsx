import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { UtensilsCrossed, Eye, EyeOff, Lock, User } from "lucide-react"
import { RESTAURANT_NAME } from "../../data/menuData"

export default function ServerLogin() {
  const [pin, setPin] = useState("")
  const [name, setName] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const staffOptions = ["María García", "Carlos Jiménez", "Ana Vargas", "Luis Mora"]

  const handleLogin = () => {
    if (!name) { setError("Selecciona tu nombre / Select your name"); return }
    if (pin.length < 4) { setError("PIN de 4 dígitos requerido / 4-digit PIN required"); return }
    setLoading(true)
    setTimeout(() => { navigate("/server/floor-plan") }, 900)
  }

  return (
    <div className="flex justify-center items-start min-h-screen" style={{ background: "#E5E0DA" }}>
      <div className="w-full max-w-[430px] min-h-screen bg-background flex flex-col shadow-2xl">
        {/* Header */}
        <div
          className="flex flex-col items-center pt-16 pb-12 px-6"
          style={{ background: "linear-gradient(180deg, #EEF2FF 0%, #FAFAF7 100%)" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: "#6366F1" }}>
            <UtensilsCrossed size={30} className="text-white" />
          </div>
          <h1 className="text-foreground text-center" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.5rem" }}>
            {RESTAURANT_NAME}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#6366F1" + "18" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366F1" }}>Server UI · Acceso de Personal</span>
          </div>
        </div>

        <div className="flex-1 px-5 py-8">
          {/* Name selector */}
          <div className="mb-5">
            <label className="block text-foreground mb-2" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              <User size={13} className="inline mr-1.5" />
              Tu nombre / Your Name
            </label>
            <div className="flex flex-col gap-2">
              {staffOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setName(s)}
                  className={`px-4 py-3 rounded-xl border text-left transition-all ${
                    name === s ? "border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]" : "border-border bg-card text-foreground"
                  }`}
                  style={{ fontSize: "0.9rem", fontWeight: name === s ? 700 : 400 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div className="mb-6">
            <label className="block text-foreground mb-2" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              <Lock size={13} className="inline mr-1.5" />
              PIN de acceso / Access PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError("") }}
                placeholder="••••"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#6366F1] transition-colors pr-12"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.3rem", letterSpacing: "0.3em" }}
              />
              <button
                onClick={() => setShowPin((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-muted-foreground mt-1.5" style={{ fontSize: "0.7rem" }}>
              Demo: ingresa cualquier PIN de 4+ dígitos · Enter any 4+ digit PIN
            </p>
          </div>

          {error && (
            <p className="text-status-red mb-4" style={{ fontSize: "0.82rem", fontWeight: 600 }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-[0.98] transition-all"
            style={{ minHeight: "56px", background: "#6366F1", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1rem", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent spinner" />
            ) : (
              <span>Iniciar turno · Start Shift</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
