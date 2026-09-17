import { QrCode, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import GuestPhoneFrame from "./GuestPhoneFrame"

interface SessionExpiredScreenProps {
  tableId: string
  restaurantId: string
  reason?: "closed" | "rescan"
}

export default function SessionExpiredScreen({
  tableId,
  restaurantId,
  reason = "closed",
}: SessionExpiredScreenProps) {
  const qrPath = `/m/${tableId}?restaurant=${restaurantId}`

  return (
    <GuestPhoneFrame>
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 text-center screen-fade">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <QrCode size={32} className="text-muted-foreground" />
        </div>
        <h1 className="text-foreground font-display font-extrabold" style={{ fontSize: "1.35rem" }}>
          {reason === "closed" ? "Sesión de mesa finalizada" : "Escanea el código QR"}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-[280px]" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
          {reason === "closed" ? (
            <>
              La cuenta de esta mesa fue pagada por completo. Para ordenar de nuevo, escanea el código QR en la mesa.
              <span className="block mt-1 opacity-80" style={{ fontSize: "0.75rem" }}>
                Table session ended — scan the QR at your table to order again.
              </span>
            </>
          ) : (
            <>
              Ingresa escaneando el QR en tu mesa para comenzar a ordenar.
              <span className="block mt-1 opacity-80" style={{ fontSize: "0.75rem" }}>
                Scan the table QR code to start ordering.
              </span>
            </>
          )}
        </p>
        <Link
          to={qrPath}
          className="mt-8 w-full max-w-[300px] flex items-center justify-between bg-primary text-primary-foreground px-5 py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}
        >
          <span>Escanear QR · Mesa #{tableId}</span>
          <ChevronRight size={20} />
        </Link>
      </div>
    </GuestPhoneFrame>
  )
}
