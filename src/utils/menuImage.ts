import type { CSSProperties } from "react"
import type { MenuItem } from "../types"

export const DEFAULT_IMAGE_FOCUS = { x: 50, y: 50 }
export const DEFAULT_IMAGE_ZOOM = 1

export function getMenuItemImageFocus(item: Pick<MenuItem, "imageFocus">) {
  return item.imageFocus ?? DEFAULT_IMAGE_FOCUS
}

export function getMenuItemImageZoom(item: Pick<MenuItem, "imageZoom">) {
  const zoom = item.imageZoom ?? DEFAULT_IMAGE_ZOOM
  return Math.min(2, Math.max(1, zoom))
}

export function menuItemImageStyle(item: Pick<MenuItem, "imageFocus" | "imageZoom">): CSSProperties {
  const focus = getMenuItemImageFocus(item)
  const zoom = getMenuItemImageZoom(item)
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${focus.x}% ${focus.y}%`,
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${focus.x}% ${focus.y}%`,
  }
}
