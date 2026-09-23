Costa Rica Pay-at-Table PWA — Interactive Demo Package
========================================================

This folder contains a production build of the app plus the local API server
(staff login, device registry, KDS permissions). No database install required.

Requirements
------------
- Node.js 22+ (or Node 20+ with --experimental-strip-types support)

Quick start
-----------
1. Open Terminal in this folder (demo-package).
2. Run:  npm start
3. Open docs/app-demo.html in your browser, or go directly to:
   http://localhost:8443/#/m/7

Default port is 8443. Override with:  PORT=3000 npm start

Demo credentials (4-digit PIN)
------------------------------
Manager (admin + portal switcher):  0000  — Luis Mora
Server (floor plan):               4821  — María García
Server:                            7392  — Carlos Jiménez
Kitchen KDS:                       2847  — Roberto Solís
Bar KDS:                           9156  — Ana Vargas
Cashier:                           5638  — Elena Castro

Recommended walkthrough
-----------------------
1. Guest phone:  http://localhost:8443/#/m/7
   Join table 7, browse menu, add items, send to kitchen.
2. Kitchen:      http://localhost:8443/#/kds/kitchen  (PIN 2847)
   Advance tickets through pending → preparing → ready.
3. Bar:          http://localhost:8443/#/kds/bar      (PIN 9156)
4. Server:       http://localhost:8443/#/staff/login  (PIN 4821)
   View floor plan and table 7 details.
5. Cashier:      http://localhost:8443/#/kds/cashier  (PIN 5638)
6. Admin:        http://localhost:8443/#/admin/dashboard (PIN 0000)
   Use the portal switcher (top-right) to jump between UIs when logged in as manager.

Important prototype notes
-------------------------
- All portals share one browser's memory. Open kitchen on a second device and
  it will NOT see orders until a real backend exists.
- Payments are simulated (no real card or SINPE charges).
- Data persists in the browser (localStorage) and in .data/restaurant-api.json.

Stop the server with Ctrl+C.
