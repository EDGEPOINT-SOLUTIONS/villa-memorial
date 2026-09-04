# In-Memoriam — UI/UX Demo

A frontend-only, clickable prototype of the In-Memoriam funeral & memorial-services
operating platform — re-themed to the COO's **"Radiant Compassion"** design (Sky Blue + Gold,
Playfair Display + Inter). This is the **visual reference** for the full system: the public
marketing site, the family and agent portals, and the internal staff app — with no backend, no
real auth, and no real data.

> Design tokens are in `src/styles/tokens.css`. The COO's original Stitch mockups
> (`stitch_villa_memorial_digital_platform/`) are kept outside this repo — ask the design owner
> if you need the source design set.
>
> **Walkthrough / presenting to clients:** see [`NAVIGATION.md`](NAVIGATION.md).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build + preview:

```bash
npm run build
npm run preview
```

## Demo logins

| Portal | Email | Password |
|---|---|---|
| Staff | `admin@gmail.com` | `admin123` |
| Agent | `agent@example.com` | `agent123` |
| Family | `family@example.com` | `family123` |

Logins are **cosmetic only** (checked in the browser) — not real security. A real deployment
uses server-side sessions (see the production `web/` app).

## What to try

- **Public site** (`/`) — hero, services, plans, lots, packages, **products**, transport, and the
  Sanctuario park map (interactive + master plan). **Connected buy journey**: add plans, lots,
  packages, or products to the cart (`/cart`) → checkout (`/checkout`) → order confirmation
  (`/order/:id`). Public forms (contact, quote, appointment, FAQ, register) feed the staff app.
- **Family portal** (`/client/login`) — the warm, mobile-first view a grieving family sees:
  arrangement progress, balance, plans, lots, documents.
- **Agent portal** (`/agent/login`) — sales dashboard with leads and commission.
- **Staff app** (`/login`) — tenant switcher (Villa Memorial / Loyola / Golden Haven) and role
  switcher (Executive / Manager / Accountant / Embalmer / Cashier).
- **Arrangement wizard** (`Cases → + New case`) and **confirmation dialogs** (post to ledger
  requires typing `POST`). Orders placed on the public site appear at the top of staff
  **Commerce → Orders**; web form submissions appear under **Relationships → Inquiries**.

## Route index

**Public site**

| Area | Route |
|---|---|
| Home | `/` |
| Services (at-need) | `/site/services` |
| Death at home | `/site/services/death-at-home` |
| Death at hospital | `/site/services/death-at-hospital` |
| Plans | `/site/plans` |
| Plan detail | `/site/plans/:slug` (e.g. `/site/plans/mausoleum`) |
| Plan comparison | `/site/plans/compare` |
| Senior-citizen rates | `/site/plans/senior-benefits` |
| Lots | `/site/lots` |
| Lot detail + reservation | `/site/lots/:slug` (e.g. `/site/lots/mausoleum`) |
| Packages | `/site/packages` |
| Package detail | `/site/packages/:slug` (e.g. `/site/packages/package-b`) |
| Products & keepsakes | `/site/products` |
| Product detail | `/site/products/:id` (e.g. `/site/products/casket-hardwood`) |
| Transport | `/site/transport` |
| Park map | `/site/map` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Order confirmation | `/order/:reference` |
| Contact | `/site/contact` |
| Request a quote | `/site/quote` |
| Book an appointment | `/site/appointments` |
| Register | `/site/register` |
| FAQ | `/site/faq` |

**Portals**

| Area | Route |
|---|---|
| Agent login / dashboard | `/agent/login`, `/agent/dashboard` |
| Agent clients | `/agent/clients` |
| Agent prospects | `/agent/prospects` |
| Agent applications | `/agent/applications` |
| Agent sales & commissions | `/agent/sales` |
| Agent marketing | `/agent/marketing` |
| Family login / dashboard | `/client/login`, `/client/dashboard` |
| Family profile | `/client/profile` |
| My memorial plans | `/client/plans` |
| My payments | `/client/payments` |
| My memorial property | `/client/property` |
| My memorials | `/client/memorials` |
| My funeral cases | `/client/cases` |
| My documents | `/client/documents` |
| My appointments | `/client/appointments` |
| My requests | `/client/requests` |
| Notifications | `/client/notifications` |
| Support & tickets | `/client/support` |
| Privacy center | `/client/privacy` |
| Staff login | `/login` |

**Staff app** (behind `/login`)

| Area | Route |
|---|---|
| Dashboard / Reports | `/dashboard`, `/reports` |
| Customers | `/customers`, `/customers/:id` |
| Inquiries | `/inquiries` |
| Plans | `/plans`, `/plans/:id` |
| Catalog / Orders | `/catalog`, `/orders` |
| Cases | `/cases`, `/cases/new`, `/cases/:id` |
| Schedule | `/schedule` |
| Property map | `/property`, `/property/:id` |
| Billing / Accounting | `/billing`, `/accounting` |
| Staff directory | `/hr`, `/hr/:id` |
| Documents | `/documents`, `/documents/:id` |
| Users & roles | `/admin/users` |
| Workflows | `/admin/workflows` |
| Audit trail | `/admin/audit` |
| Tenant settings | `/admin/settings` |

## Deploy to Vercel

1. Push this folder to a Git host (or drag the `ui-ux-demo` folder into Vercel's dashboard).
2. Vercel auto-detects **Vite**; build command `npm run build`, output directory `dist`.
3. The `vercel.json` rewrite already handles client-side routes, so deep links work.

## Structure

```
src/
├── main.tsx           # entry, providers
├── App.tsx            # routes (public · portals · staff)
├── styles/            # tokens.css / base.css / components.css (blue + gold)
├── lib/               # auth (demo), demo state (tenant/role), nav, data
├── components/        # generic UI kit (no domain vocabulary, per ⓡ rule)
└── pages/             # one file per screen (staff + public + portals)
```

## Disclaimer

This is a **prototype, not production code**. Auth is fake, data is static, and no backend is
connected. Do not copy the login logic into a real product.
