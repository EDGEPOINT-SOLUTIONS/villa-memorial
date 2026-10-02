# Family plan & lot inquiry gate — design record

**Captain's direction (2026-10-02):** *"people will not be able to inquire plans and
lots until they created their family account or signed up to have a family account,
and then after they logged in, all their inquiries will now be tracked in their
family portal… Orders and Services such as the ones in the services page products
dont need log in. just the people who are inquiring for plan and lots, in lots put
'Ask about this lot'."*

## What ships

- **One gate.** Every plan surface (`/plans` tier cards, `/plans/[sku]` package
  selector, `/price-list` and `/map` rate tables) and every lot surface (`/map?tab=lots`
  cards, `/lots/[id]`, `/lots/price-list-2026` rows, the public park map's plot panel)
  links its inquiry action to `/client/ask`, carrying the item/SKU/price in the URL
  (`lib/family/ask.ts`). A signed-out visitor is sent to `/client/login?next=<the ask>`
  and returned there after signing in; the intent is in the URL, so the round trip
  never loses it.
- **Recorded against the account.** The signed-in visitor confirms on the gate page
  (`app/(family)/client/ask/page.tsx` → `components/family/family-ask-form.tsx`), which
  POSTs to `app/api/family/inquiries/route.ts`. That route requires a family session and
  stamps the row with `user_id` in the one durable enquiries journal
  (`lib/api-client/inquiry-store.ts`) the office board already reads.
- **Tracked in the portal.** `/client/inquiries` lists the account's own plan & lot
  inquiries (item · when · the office's state in plain words), read from the SAME journal
  filtered by the account (`lib/api-client/family.ts::listFamilyInquiries`). Empty state
  starts the flow to `/plans` and `/map?tab=lots`.
- **Lots say exactly “Ask about this lot”.** The lot quote-basket control
  (`components/villa/lot-quote-button.tsx`) is retired; a lot no longer joins the public
  quote basket, because a lot inquiry now needs an account.
- **Services and products are unchanged.** Their public request/quote paths
  (`/quote`, `/contact`, `POST /api/inquiries`) need no login and never set `user_id`.

## Evidence (`evidence/`)

| File | What it shows |
|---|---|
| `01-lots-ask-signed-out-1440.png` · `…-390.png` | the lots listing, signed out, one “Ask about this lot” per plot |
| `02-signin-return-1440.png` · `…-390.png` | the family sign-in the gate redirects to, with the ask in `?next=` |
| `03-ask-confirm-1440.png` · `…-390.png` | the signed-in gate: “Ask about this lot” for the plot clicked |
| `04-ask-sent-1440.png` | the receipt — the office's own reference (`INQ-2026-00043`) |
| `05-family-inquiries-1440.png` · `…-390.png` | `/client/inquiries` — the recorded inquiry in the family's portal |
| `06-admin-inquiry-1440.png` · `…-390.png` | `/staff/inquiries` — the SAME inquiry on the office board |
| `07-plans-ask-signed-out-1440.png` · `…-390.png` | the plan surface, signed out, “Ask about this plan” |

## Tests

- `tests/unit/family-inquiry-gate.test.tsx` — the ask link round-trip; signed-out
  refusal (401) and signed-in record; the family fold shows only the account's rows;
  the gate redirect and its validated return path; the login route returns to the ask.
- `tests/unit/family-pages.test.tsx` + `tests/unit/family-reading-budget.test.tsx` —
  the new `/client/inquiries` screen joins the one-house-style and reading-budget
  guards.
- `tests/unit/price-surfacing.test.tsx`, `lots-listing.test.tsx`, `plan-buy-card.test.tsx`,
  `park-3d-reserve.test.tsx` — every lot/plan action now points at the gate, and the lot
  label is exact.

## Open platform ask

`user_id` on an inquiry is a PROVISIONAL field (no frozen `crm-families` contract names an
account link). The reader tolerates its absence, so every front-desk entry and every
public service/product inquiry is unaffected. Recorded in
[`../open-items.md`](../open-items.md) §11.
