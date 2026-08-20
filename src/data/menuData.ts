import type { MenuItem } from "../types"

// ── Demo-only restaurant identity constants ────────────────────────────────
// Used by non-multi-tenant demo screens (QRLanding, ServerLogin, FloorPlan).
// Guest-facing checkout screens should prefer restaurant/tableId from
// useGuest() (see GuestContext.tsx) since the app supports multi-restaurant
// via data/restaurants.ts.
export const RESTAURANT_NAME = "La Terraza"
export const RESTAURANT_TAGLINE = "Cocina costarricense de autor"
export const TABLE_NUMBER = "7"

const U = "https://images.unsplash.com/photo-"

export const MENU_ITEMS: MenuItem[] = [
  // ── ENTRADAS ──────────────────────────────────────────────────────────
  {
    id: "ceviche-palmito",
    name: "Ceviche de Palmito",
    description:
      "Palmito fresco marinado en limón, chile dulce, cilantro y cebolla morada. Servido con galletas de soda.",
    price: 4500,
    category: "entradas",
    image: `${U}1546069901-ba9599a7e63c?w=400&h=280&fit=crop&auto=format`,
    popular: true,
    modifierGroups: [
      {
        id: "picante",
        name: "Nivel de picante",
        type: "single",
        required: false,
        options: [
          { id: "sin-picante", name: "Sin picante", priceAdd: 0 },
          { id: "poco-picante", name: "Poco picante", priceAdd: 0 },
          { id: "bien-picante", name: "Bien picante 🌶️", priceAdd: 0 },
        ],
      },
    ],
  },
  {
    id: "patacones-guacamole",
    name: "Patacones con Guacamole",
    description:
      "Patacones crujientes de plátano verde acompañados de guacamole casero con tomate y limón.",
    price: 3800,
    category: "entradas",
    image: `${U}1476224203421-9ac39bcb3327?w=400&h=280&fit=crop&auto=format`,
    modifierGroups: [
      {
        id: "extras-patacones",
        name: "Extras (opcional)",
        type: "multiple",
        required: false,
        options: [
          { id: "chicharron", name: "Chicharrón", priceAdd: 800 },
          { id: "natilla", name: "Natilla", priceAdd: 400 },
          { id: "pico-gallo", name: "Pico de gallo", priceAdd: 300 },
        ],
      },
    ],
  },
  {
    id: "chifrijo",
    name: "Chifrijo",
    description:
      "Chicharrones, frijoles molidos, arroz, pico de gallo y aguacate. Un clásico costarricense.",
    price: 5200,
    category: "entradas",
    image: `${U}1504674900247-0877df9cc836?w=400&h=280&fit=crop&auto=format`,
    popular: true,
  },
  {
    id: "tostones-rellenos",
    name: "Tostones Rellenos",
    description:
      "Tostones rellenos de pico de gallo fresco, aguacate cremoso y una pizca de queso blanco rallado.",
    price: 4100,
    category: "entradas",
    image: `${U}1512621776951-a57141f2eefd?w=400&h=280&fit=crop&auto=format`,
  },

  // ── PLATOS FUERTES ────────────────────────────────────────────────────
  {
    id: "casado-lomo",
    name: "Casado de Lomo",
    description:
      "Lomo de res a la plancha con arroz, frijoles, ensalada, plátano maduro y picadillo de ayote.",
    price: 9500,
    category: "platos",
    image: `${U}1555939594-58d7cb561ad1?w=400&h=280&fit=crop&auto=format`,
    popular: true,
    modifierGroups: [
      {
        id: "termino-carne",
        name: "Término de la carne",
        type: "single",
        required: true,
        options: [
          { id: "tres-cuartos", name: "Tres cuartos", priceAdd: 0 },
          { id: "bien-cocido", name: "Bien cocido", priceAdd: 0 },
          { id: "vuelta-vuelta", name: "Vuelta y vuelta", priceAdd: 0 },
        ],
      },
      {
        id: "proteina-alt",
        name: "Cambiar proteína",
        type: "single",
        required: false,
        options: [
          { id: "pollo-alt", name: "Pollo a la plancha", priceAdd: -500 },
          { id: "cerdo-alt", name: "Cerdo asado", priceAdd: -200 },
          { id: "vegetariano", name: "Vegetariano", priceAdd: -1000 },
        ],
      },
    ],
  },
  {
    id: "tilapia-plancha",
    name: "Tilapia a la Plancha",
    description:
      "Filete de tilapia fresca con mantequilla de ajo y hierbas, servido con vegetales salteados y arroz blanco.",
    price: 8800,
    category: "platos",
    image: `${U}1534482421-64566f976cfa?w=400&h=280&fit=crop&auto=format`,
    modifierGroups: [
      {
        id: "guarnicion-tilapia",
        name: "Guarnición",
        type: "single",
        required: false,
        options: [
          { id: "arroz-blanco", name: "Arroz blanco", priceAdd: 0 },
          { id: "papa-frita", name: "Papa frita", priceAdd: 300 },
          { id: "pure-papa", name: "Puré de papa", priceAdd: 200 },
        ],
      },
    ],
  },
  {
    id: "arroz-mariscos",
    name: "Arroz con Mariscos",
    description:
      "Arroz salteado con camarones, calamares, mejillones y almejas en salsa de bisque con toque de vino blanco.",
    price: 11200,
    category: "platos",
    image: `${U}1484723091739-30ef96e9278c?w=400&h=280&fit=crop&auto=format`,
    popular: true,
  },
  {
    id: "pollo-plancha",
    name: "Pollo a la Plancha",
    description:
      "Pechuga de pollo marinada en achiote y cítricos, con ensalada criolla, arroz y frijoles negros.",
    price: 7500,
    category: "platos",
    image: `${U}1481671703369-e72bf0a69ca2?w=400&h=280&fit=crop&auto=format`,
  },

  // ── BEBIDAS ───────────────────────────────────────────────────────────
  {
    id: "refresco-natural",
    name: "Refresco Natural",
    description:
      "Bebida natural preparada al momento con frutas de temporada. Hecha en casa.",
    price: 2500,
    category: "bebidas",
    image: `${U}1523371054106-338a0cebe5d0?w=400&h=280&fit=crop&auto=format`,
    modifierGroups: [
      {
        id: "sabor-refresco",
        name: "Sabor",
        type: "single",
        required: true,
        options: [
          { id: "cas", name: "Cas", priceAdd: 0 },
          { id: "maracuya", name: "Maracuyá", priceAdd: 0 },
          { id: "tamarindo", name: "Tamarindo", priceAdd: 0 },
          { id: "guanabana", name: "Guanábana", priceAdd: 0 },
          { id: "mora", name: "Mora", priceAdd: 0 },
        ],
      },
      {
        id: "azucar-refresco",
        name: "Azúcar",
        type: "single",
        required: false,
        options: [
          { id: "normal-azucar", name: "Normal", priceAdd: 0 },
          { id: "poco-azucar", name: "Poco azúcar", priceAdd: 0 },
          { id: "sin-azucar", name: "Sin azúcar", priceAdd: 0 },
        ],
      },
    ],
  },
  {
    id: "cerveza-imperial",
    name: "Cerveza Imperial",
    description: "La cerveza nacional de Costa Rica. Fresca y ligera. ¡Pura vida!",
    price: 3200,
    category: "bebidas",
    isAlcoholic: true,
    image: `${U}1608270586620-248524c67de9?w=400&h=280&fit=crop&auto=format`,
    popular: true,
    modifierGroups: [
      {
        id: "presentacion-cerveza",
        name: "Presentación",
        type: "single",
        required: false,
        options: [
          { id: "botella", name: "Botella 330ml", priceAdd: 0 },
          { id: "lata", name: "Lata 355ml", priceAdd: 0 },
        ],
      },
    ],
  },
  {
    id: "agua-mineral",
    name: "Agua Mineral",
    description: "Agua mineral con o sin gas. Botella 500ml.",
    price: 1500,
    category: "bebidas",
    image: `${U}1559839914-17aae19cec71?w=400&h=280&fit=crop&auto=format`,
    modifierGroups: [
      {
        id: "tipo-agua",
        name: "Tipo",
        type: "single",
        required: false,
        options: [
          { id: "sin-gas", name: "Sin gas", priceAdd: 0 },
          { id: "con-gas", name: "Con gas", priceAdd: 0 },
        ],
      },
    ],
  },
  {
    id: "limonada-jengibre",
    name: "Limonada con Jengibre",
    description:
      "Limonada fresca con jengibre rallado, menta y un toque de miel de caña. Revitalizante.",
    price: 2800,
    category: "bebidas",
    image: `${U}1497034825429-c343d7c6a68f?w=400&h=280&fit=crop&auto=format`,
  },

  // ── POSTRES ───────────────────────────────────────────────────────────
  {
    id: "tres-leches",
    name: "Tres Leches",
    description:
      "Bizcocho empapado en tres tipos de leche, cubierto con chantilly y canela. Receta de la abuela.",
    price: 4200,
    category: "postres",
    image: `${U}1563729784474-d77dbb933a9e?w=400&h=280&fit=crop&auto=format`,
    popular: true,
  },
  {
    id: "churros-chocolate",
    name: "Churros con Chocolate",
    description:
      "Churros artesanales recién fritos con azúcar y canela, acompañados de salsa de chocolate caliente.",
    price: 3500,
    category: "postres",
    image: `${U}1567620905732-2d1ec7ab7445?w=400&h=280&fit=crop&auto=format`,
  },
  {
    id: "helado-artesanal",
    name: "Helado Artesanal",
    description:
      "Dos bolas de helado artesanal de temporada. Pregunte al mesero por los sabores del día.",
    price: 2800,
    category: "postres",
    image: `${U}1551024739-78b9e40ca2ea?w=400&h=280&fit=crop&auto=format`,
    modifierGroups: [
      {
        id: "sabor-helado",
        name: "Sabores (elija 2)",
        type: "multiple",
        required: false,
        options: [
          { id: "vainilla", name: "Vainilla", priceAdd: 0 },
          { id: "chocolate-h", name: "Chocolate", priceAdd: 0 },
          { id: "fresa", name: "Fresa", priceAdd: 0 },
          { id: "mango-h", name: "Mango", priceAdd: 0 },
          { id: "guanabana-h", name: "Guanábana", priceAdd: 0 },
        ],
      },
    ],
  },
]

export const CATEGORIES = [
  { id: "entradas", label: "Entradas", sublabel: "Appetizers", emoji: "🥗" },
  { id: "platos", label: "Platos", sublabel: "Mains", emoji: "🍽️" },
  { id: "bebidas", label: "Bebidas", sublabel: "Drinks", emoji: "🥤" },
  { id: "postres", label: "Postres", sublabel: "Desserts", emoji: "🍮" },
] as const

export type CategoryId = (typeof CATEGORIES)[number]["id"]
