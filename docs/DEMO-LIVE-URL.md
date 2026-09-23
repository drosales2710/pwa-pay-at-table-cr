# Public demo URL

After GitHub Pages is enabled (see below), the live demo is:

**Guest (table 7):**  
https://drosales2710.github.io/pwa-pay-at-table-cr/demo/#/m/7

**Staff login:**  
https://drosales2710.github.io/pwa-pay-at-table-cr/demo/#/staff/login

**Demo guide:**  
https://drosales2710.github.io/pwa-pay-at-table-cr/app-demo.html

**Manager PIN:** `0000` (unlocks portal switcher)

## One-time setup (GitHub)

1. Run `npm run build:demo` (writes the app into `docs/demo/`).
2. Commit and push to `main` (includes `docs/demo/` and `docs/app-demo.html`).
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from branch → `main` → `/docs`**.
4. Wait ~1 minute; open the guest URL above.

No server, ngrok, or always-on laptop required — GitHub hosts the static demo.

## Redeploy after UI changes

```bash
npm run build:demo
git add docs/demo docs/app-demo.html
git commit -m "Update public demo build"
git push origin main
```

## What works on the public demo

- Guest ordering, cart, send-to-kitchen, split pay, simulated checkout
- Staff login via PIN (browser-only; no server required)
- Kitchen / bar / server / cashier / admin UIs
- Portal switcher when logged in as manager (`0000`)

## What does not work without a backend

- Multi-device sync (each browser is isolated)
- KDS device registry / audit log on server
- Real payments or Hacienda invoices

For full API features, run locally: `npm start` on port 8443.
