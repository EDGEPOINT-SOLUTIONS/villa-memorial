# Navigation Guide

How to walk through the In-Memoriam UI/UX demo (frontend-only mockup).

## Start it

```bash
cd ui-ux-demo
npm install        # first time only
npm run dev        # → http://localhost:5173
```

## The four doors

| Portal | URL | Login |
|---|---|---|
| Public site | `/` | none |
| Family (customer) | `/client/login` | `family@example.com` / `family123` |
| Agent (sales) | `/agent/login` | `agent@example.com` / `agent123` |
| Staff (admin/ops) | `/login` | `admin@gmail.com` / `admin123` |

## 1. Presenting to a client — suggested order

### A. Public marketing site (start here, no login)
1. `/` — landing page (hero, services, plans teaser, testimonial, CTA).
2. `/site/plans` — pre-need plans with pricing → click a plan name (detail w/ calculator) →
   `/site/plans/compare` (side-by-side).
3. `/site/lots` — lot catalog with status badges → click a lot (detail + reserve).
4. `/site/packages` — wake/funeral packages → click "View details".
5. `/site/products` — caskets, urns, flowers, markers, keepsakes → product detail.
6. `/site/services` — at-need services, then drill into:
   - `/site/services/death-at-home`
   - `/site/services/death-at-hospital`
7. `/site/transport` — hearse & transport options.
8. `/site/map` — Sanctuario park map: click a dot → info panel with "Reserve / Add to cart /
   Inquire". Toggle "Interactive map" / "Master plan".

### A2. The connected buy journey (show this — it's new)
9. Add items along the way (Plans → "ADD TO CART", Packages → "Select", Products → "Add").
   The header cart badge counts items live.
10. `/cart` — review lines, change quantity, remove, estimated total.
11. `/checkout` — your details → review + payment terms (full or installments w/ 10% down) →
    confirm.
12. `/order/:id` — confirmation / receipt.
13. `Staff app → Commerce → Orders` shows the new order on top.
14. Web forms round-trip too: submit `/site/contact`, `/site/quote`, `/site/appointments`, or
    `/site/register`, then check `Staff app → Relationships → Inquiries` (channel "Website").

### B. Family portal — what a grieving family sees
15. `/client/login` → sign in → family dashboard: memorial header (deceased name in serif),
    arrangement progress, balance, plans, lots, documents.
16. Walk the left rail — everything is a real page: My Plans (`/client/plans`) → My Payments →
    My Memorial Property → **My Memorials** (`/client/memorials`, digital tribute) →
    **My Funeral Cases** (`/client/cases`) → **My Documents** (`/client/documents`) →
    **My Appointments** (`/client/appointments`) → My Requests → **Support & Tickets**
    (`/client/support`) → **Privacy Center** (`/client/privacy`, consent toggles).

### C. Agent portal — what a sales agent sees
16. `/agent/login` → sign in → leads, sales/commission KPIs, plan catalog.

### D. Staff app — the operations system (COO-themed)
17. `/login` → sign in as admin → dashboard (now in the same gold/blue "Radiant Compassion"
    look as the portals — warm paper content, serif headings, gold accents).

## 2. Things to demo inside the staff app

- **Tenant switcher** (top bar): Villa Memorial ↔ Loyola Gardens ↔ Golden Haven — shows "build once, configure many".
- **Role switcher** (top bar, "View as:"): Executive → Manager → Accountant → Embalmer → Cashier — the sidebar and dashboard change per role.
- **Customers** (`/customers` → click a row): family record with linked deceased, plans, lots, service history.
- **Cases** (`/cases` → "+ New case"): step-by-step arrangement wizard (Deceased → Family → Services → Schedule → Documents → Bill → Review & confirm).
- **Property map** (`/property`): admin mode — click empty ground to place a named dot, drag dots to move them, switch to List view.
- **Billing** (`/billing`): select an invoice → installments → "Record payment" (confirmation dialog).
- **Accounting** (`/accounting`): "Post entry" → requires typing `POST` (irreversible-action demo).
- **Documents** (`/documents` → click a row): document preview with field-source map.
- **Admin**: `/admin/users` (Users / Roles / Permission matrix), `/admin/workflows` (workflow builder), `/admin/audit` (audit trail), `/admin/settings` (module flags, terminology, branding).

## 3. Quick 60-second pitch

1. Landing `/` → "Plan ahead" → `/site/plans`.
2. `/site/map` → click a dot → "Inquire".
3. `/client/login` → family dashboard (empathy moment).
4. `/login` → flip role switcher → flip tenant switcher.
5. `/cases/new` → click through the wizard.
6. `/property` → add + drag a dot → List view.
