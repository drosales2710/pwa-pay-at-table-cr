import { useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { ChefHat, Monitor, Plus } from "lucide-react"
import ManagerPinModal from "../../components/ManagerPinModal"
import { useGuest } from "../../context/GuestContext"
import { getKdsActionActor } from "../../utils/kdsActor"
import { createKdsStation, listKdsStations } from "../../utils/kdsStations"
import { registerDeviceWithApi } from "../../api/devices"
import { getDeviceId } from "../../utils/deviceId"
import { bindKdsStation, getKitchenStationSession } from "../../utils/kdsStationSession"

export default function KdsStationSetup() {
  const navigate = useNavigate()
  const { restaurant } = useGuest()
  const actor = getKdsActionActor()
  const existing = getKitchenStationSession()
  const [tick, setTick] = useState(0)
  const stations = useMemo(() => listKdsStations("kitchen"), [tick])
  const [creating, setCreating] = useState(false)
  const [newStationName, setNewStationName] = useState("")
  const [showManagerPin, setShowManagerPin] = useState(false)
  const [error, setError] = useState("")

  if (existing) {
    return <Navigate to="/kds/kitchen" replace />
  }

  if (!actor || (actor.role !== "kitchen" && actor.role !== "manager")) {
    return <Navigate to="/staff/login" replace state={{ from: "/kds/kitchen/setup" }} />
  }

  const bindStation = async (stationId: string) => {
    const station = stations.find((s) => s.id === stationId)
    const session = bindKdsStation({
      stationId,
      boundByStaffId: actor.staffId,
      boundByStaffName: actor.staffName,
    })
    if (!session) {
      setError("No se pudo vincular la estación / Could not bind station")
      return
    }

    try {
      await registerDeviceWithApi({
        restaurantId: restaurant.id,
        deviceId: getDeviceId(),
        label: station?.name ?? session.stationName,
        stationType: "kitchen",
        stationId: session.stationId,
        stationName: session.stationName,
      })
    } catch {
      // Static demo hosts have no API — local station bind is enough.
    }
    navigate("/kds/kitchen", { replace: true })
  }

  const requestCreateStation = () => {
    if (!newStationName.trim()) {
      setError("Ingresa un nombre / Enter a station name")
      return
    }
    setError("")
    setShowManagerPin(true)
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#0A0A0A",
        color: "#F5F5F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#111111",
          border: "1px solid #2A2A2A",
          borderRadius: "18px",
          padding: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#78350F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Monitor size={22} color="#F59E0B" />
          </div>
          <div>
            <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "1.2rem", margin: 0 }}>
              Estación de cocina / Kitchen station
            </p>
            <p style={{ color: "#6B7280", fontSize: "0.78rem", margin: "2px 0 0" }}>{restaurant.name}</p>
          </div>
        </div>

        <p style={{ color: "#9CA3AF", fontSize: "0.82rem", lineHeight: 1.5, margin: "16px 0 20px" }}>
          Este dispositivo debe vincularse a una estación KDS antes de operar tickets.
          <br />
          This device must be linked to a KDS station before handling tickets.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {stations.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => bindStation(station.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #2A2A2A",
                background: "#141414",
                color: "#F5F5F5",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ChefHat size={18} color="#F59E0B" />
              <div>
                <p style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.95rem", margin: 0 }}>
                  {station.name}
                </p>
                <p style={{ color: "#6B7280", fontSize: "0.72rem", margin: "2px 0 0" }}>
                  Usar en este dispositivo / Use on this device
                </p>
              </div>
            </button>
          ))}
        </div>

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            style={{
              marginTop: "14px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px dashed #374151",
              background: "transparent",
              color: "#9CA3AF",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Nueva estación (PIN gerente) / New station (manager PIN)
          </button>
        ) : (
          <div style={{ marginTop: "14px", padding: "14px", borderRadius: "12px", border: "1px solid #2A2A2A", background: "#141414" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#9CA3AF", marginBottom: "6px" }}>
              Nombre / Name
            </label>
            <input
              value={newStationName}
              onChange={(e) => {
                setNewStationName(e.target.value)
                setError("")
              }}
              placeholder="Cocina Extra"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #374151",
                background: "#0F172A",
                color: "#F9FAFB",
                marginBottom: "10px",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setNewStationName("")
                  setError("")
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#D1D5DB",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={requestCreateStation}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#F59E0B",
                  color: "#000",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "#F87171", fontSize: "0.78rem", fontWeight: 600, marginTop: "12px" }}>{error}</p>
        )}
      </div>

      <ManagerPinModal
        open={showManagerPin}
        title="Nueva estación / New station"
        message="Solo gerencia puede registrar una estación nueva. / Only managers can register a new station."
        onClose={() => setShowManagerPin(false)}
        onVerified={async (manager) => {
          const created = createKdsStation({ name: newStationName.trim(), type: "kitchen" })
          bindKdsStation({
            stationId: created.id,
            boundByStaffId: manager.id,
            boundByStaffName: manager.name,
          })
          try {
            await registerDeviceWithApi({
              restaurantId: restaurant.id,
              deviceId: getDeviceId(),
              label: created.name,
              stationType: "kitchen",
              stationId: created.id,
              stationName: created.name,
            })
          } catch {
            setError("Estación creada, pero falló el registro en servidor / Station created, server register failed")
          }
          setShowManagerPin(false)
          setCreating(false)
          setNewStationName("")
          setTick((n) => n + 1)
          navigate("/kds/kitchen", { replace: true })
        }}
      />
    </div>
  )
}
