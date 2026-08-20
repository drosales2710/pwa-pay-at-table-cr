import { HashRouter, Routes, Route, Navigate } from "react-router-dom"

// Layout providers
import { GuestProvider } from "./context/GuestContext"
import AdminLayout from "./pages/admin/AdminLayout"

// Guest PWA
import QRLanding from "./pages/guest/QRLanding"
import GuestMenuPage from "./pages/guest/GuestMenuPage"
import GuestOrderSummaryPage from "./pages/guest/GuestOrderSummaryPage"
import GuestCheckoutPage from "./pages/guest/GuestCheckoutPage"
import GuestConfirmationPage from "./pages/guest/GuestConfirmationPage"

// Server UI
import ServerLogin from "./pages/server/ServerLogin"
import FloorPlan from "./pages/server/FloorPlan"
import TableDetails from "./pages/server/TableDetails"
import ShiftSummary from "./pages/server/ShiftSummary"
// (Server UI is rendered inside <GuestProvider> below so it can share
// live table/cart/guardian-queue state via useGuest())

// KDS & Cashier
import KitchenKDS from "./pages/kds/KitchenKDS"
import BarKDS from "./pages/kds/BarKDS"
import CashierPOS from "./pages/kds/CashierPOS"

// Admin Portal
import AdminDashboard from "./pages/admin/AdminDashboard"
import MenuBuilder from "./pages/admin/MenuBuilder"
import TableQRGenerator from "./pages/admin/TableQRGenerator"
import Analytics from "./pages/admin/Analytics"
import SystemSettings from "./pages/admin/SystemSettings"

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Default redirect to Guest PWA */}
        <Route path="/" element={<Navigate to="/m/7" replace />} />

        {/* Guest PWA + Server UI — GuestProvider is the layout route (renders <Outlet />
            only, no visual wrapper) and shares live table/cart/guardian-queue state
            via useGuest() with both the Guest PWA and the Server portal. */}
        <Route element={<GuestProvider />}>
          <Route path="/m/:tableId" element={<QRLanding />} />
          <Route path="/menu" element={<GuestMenuPage />} />
          <Route path="/order-summary" element={<GuestOrderSummaryPage />} />
          <Route path="/checkout" element={<GuestCheckoutPage />} />
          <Route path="/confirmation" element={<GuestConfirmationPage />} />

          {/* Server UI */}
          <Route path="/server/login" element={<ServerLogin />} />
          <Route path="/server/floor-plan" element={<FloorPlan />} />
          <Route path="/server/table/:id" element={<TableDetails />} />
          <Route path="/server/shift-closing" element={<ShiftSummary />} />

          {/* KDS & Cashier — share live table/order state via useGuest() */}
          <Route path="/kds/kitchen" element={<KitchenKDS />} />
          <Route path="/kds/bar" element={<BarKDS />} />
          <Route path="/kds/cashier" element={<CashierPOS />} />
        </Route>

        {/* Admin Portal — AdminLayout provides desktop sidebar + <Outlet /> */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/menu-builder" element={<MenuBuilder />} />
          <Route path="/admin/tables" element={<TableQRGenerator />} />
          <Route path="/admin/reports" element={<Analytics />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/m/7" replace />} />
      </Routes>
    </HashRouter>
  )
}
