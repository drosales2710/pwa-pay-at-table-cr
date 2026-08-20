import type { CartItem, MenuItem } from "../types"
import type { KDSTicket, KDSItem } from "../data/mockData"
import { MENU_ITEMS } from "../data/menuData"

function isBarItem(menuItemId: string, menuItems: MenuItem[]): boolean {
  const item = menuItems.find((m) => m.id === menuItemId)
  return item?.category === "bebidas" || item?.isAlcoholic === true
}

export function createKdsTicketsFromCart(
  items: CartItem[],
  tableNumber: number,
  round: number,
  orderId: string,
  menuItems: MenuItem[] = MENU_ITEMS
): KDSTicket[] {
  const kitchenItems: KDSItem[] = []
  const barItems: KDSItem[] = []

  items.forEach((c, idx) => {
    const kdsItem: KDSItem = {
      id: `${orderId}-item-${idx}`,
      name: c.name,
      quantity: c.quantity,
      modifiers: c.modifiers,
      notes: "",
    }
    if (isBarItem(c.menuItemId, menuItems)) {
      barItems.push(kdsItem)
    } else {
      kitchenItems.push(kdsItem)
    }
  })

  const createdAt = new Date()
  const tickets: KDSTicket[] = []

  if (kitchenItems.length > 0) {
    tickets.push({
      id: `${orderId}-kitchen`,
      tableNumber,
      round,
      station: "kitchen",
      status: "pending",
      priority: "normal",
      createdAt,
      items: kitchenItems,
    })
  }

  if (barItems.length > 0) {
    tickets.push({
      id: `${orderId}-bar`,
      tableNumber,
      round,
      station: "bar",
      status: "pending",
      priority: "normal",
      createdAt,
      items: barItems,
    })
  }

  return tickets
}
