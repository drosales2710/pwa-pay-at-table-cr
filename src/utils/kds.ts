import type { CartItem, MenuItem } from "../types"
import type { KDSTicket, KDSItem } from "../data/mockData"
import { MENU_ITEMS } from "../data/menuData"

export function isBarItem(menuItemId: string, menuItems: MenuItem[] = MENU_ITEMS): boolean {
  const item = menuItems.find((m) => m.id === menuItemId)
  return item?.category === "bebidas" || item?.isAlcoholic === true
}

export function findKdsTicketForCartItem(tickets: KDSTicket[], cartId: string): KDSTicket | undefined {
  return tickets.find((t) => t.items.some((i) => i.id === cartId))
}

export function isItemKitchenStarted(tickets: KDSTicket[], cartId: string): boolean {
  const ticket = findKdsTicketForCartItem(tickets, cartId)
  return ticket != null && ticket.status !== "pending"
}

/** Drop a cart line from KDS. Empty tickets are removed so the station is not left with a ghost order. */
export function pullCartItemFromTickets(tickets: KDSTicket[], cartId: string): KDSTicket[] {
  return tickets
    .map((t) => ({ ...t, items: t.items.filter((i) => i.id !== cartId) }))
    .filter((t) => t.items.length > 0)
}

export function createKdsTicketsFromCart(
  items: CartItem[],
  tableNumber: number,
  round: number,
  orderId: string,
  menuItems: MenuItem[] = MENU_ITEMS,
  ticketNotes = ""
): KDSTicket[] {
  const kitchenItems: KDSItem[] = []
  const barItems: KDSItem[] = []

  items.forEach((c, idx) => {
    const kdsItem: KDSItem = {
      id: c.cartId || `${orderId}-item-${idx}`,
      name: c.name,
      quantity: c.quantity,
      modifiers: c.modifiers,
      notes: ticketNotes,
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
