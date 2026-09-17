import { useState } from "react"
import { UtensilsCrossed } from "lucide-react"
import type { Restaurant } from "../types"
import { getRestaurantInitials } from "../utils/brandTheme"

const SIZE_CLASSES = {
  sm: "w-7 h-7 rounded-lg text-[0.65rem]",
  md: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-lg sm:text-xl",
  lg: "w-16 h-16 rounded-2xl text-xl",
} as const

interface RestaurantLogoProps {
  restaurant: Restaurant
  size?: keyof typeof SIZE_CLASSES
  className?: string
  /** When true, show utensils icon instead of initials if logo fails. */
  useIconFallback?: boolean
  iconSize?: number
}

export default function RestaurantLogo({
  restaurant,
  size = "md",
  className = "",
  useIconFallback = false,
  iconSize,
}: RestaurantLogoProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const logoUrl = restaurant.brand?.logoUrl
  const showImage = logoUrl && !imgFailed
  const sizeClass = SIZE_CLASSES[size]
  const resolvedIconSize = iconSize ?? (size === "sm" ? 14 : size === "lg" ? 32 : 28)
  const initials = getRestaurantInitials(restaurant.name)

  if (showImage) {
    return (
      <img
        src={logoUrl}
        alt={`${restaurant.name} logo`}
        className={`object-cover bg-white shadow-lg flex-shrink-0 ${sizeClass} ${className}`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  if (useIconFallback && initials === "?") {
    return (
      <div
        className={`bg-primary text-primary-foreground flex items-center justify-center shadow-lg flex-shrink-0 ${sizeClass} ${className}`}
        aria-hidden
      >
        <UtensilsCrossed size={resolvedIconSize} />
      </div>
    )
  }

  return (
    <div
      className={`bg-primary text-primary-foreground flex items-center justify-center shadow-lg flex-shrink-0 font-display font-extrabold tracking-tight ${sizeClass} ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  )
}
