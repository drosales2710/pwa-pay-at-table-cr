import type { ReactNode } from "react"

interface GuestPhoneFrameProps {
  children: ReactNode
  /** When false, children fill the frame without an inner scroll wrapper. */
  scroll?: boolean
}

/** Mobile preview chrome for guest PWA screens — uses brand-aware phone-frame token. */
export default function GuestPhoneFrame({ children, scroll = false }: GuestPhoneFrameProps) {
  return (
    <div
      className="flex justify-center items-start bg-phone-frame overflow-hidden"
      style={{ height: "100svh" }}
    >
      <div
        className="relative w-full max-w-[430px] bg-background flex flex-col shadow-2xl overflow-hidden"
        style={{ height: "100svh" }}
      >
        {scroll ? <div className="flex-1 overflow-y-auto">{children}</div> : children}
      </div>
    </div>
  )
}
