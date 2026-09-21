# Public footer cleanup — de-duplicated, current, every link resolving

Captain's direction, 2026-09-21: *"update this [footer] ... and remove duplicates, this is the footer section."*
The footer he pasted carried **Villa Memorial Plan twice** (Explore + Care & planning), repeated
**Villa Memorial Park** against the brand wordmark / blurb, and used labels that predated the recent
navigation and page changes. The contact block (24/7 line, second line, open hours, main office,
park address with the map link) and the Help line stay.

Authority: `components/landing/landing-view.tsx` → `LandingFooter` (the ONE public footer, rendered by
the home and every `(public)` route through `PublicShell`). The footer stays driven by the editable
landing contact fields (`contact.phoneLabel` / `phoneDisplay` / `secondPhone*` / `officeAddress` /
`parkAddress`) — nothing here is typed into the view.

## What was de-duplicated and why

| Before | After | Why |
|---|---|---|
| `Villa Memorial Plan` in **Explore** *and* **Care & planning** | One entry, in **Care & planning** (with Price list, the guide pages and the lot price list) | Same destination twice; the plan is a planning product, so it belongs in the column that names planning. |
| `Villa Memorial Park → /map` in **Explore**, beside the brand wordmark "Villa Memorial Park" | Removed from Explore; the park keeps its ONE clear entry in the contact block: **Visit the park → Map & directions →** (full park address) | `Villa Memorial Park` is the brand/site name and was printed twice in one footer; the contact block already carries the address plus a `/map` link, which is the clearer entry. (The header bar keeps its top-level `Villa Memorial Park` chip.) |
| `Products & caskets` | `Coffins & caskets` | The live page/metadata name (`app/(public)/products/page.tsx`). |
| `Browse the lots` | `Memorial lots` | The live page/metadata name (`app/(public)/lots/page.tsx`). |

No distinct destination was deleted: every previous href is still reachable from the footer, and the
new test asserts one entry per href and one entry per label.

## Final footer list

**Brand column** — logo + wordmark + blurb (unchanged, from the landing content doc).

**Explore** (browse destinations):
`Home` · `Funeraria Memorial Services` · `Smart Service Builder` · `Memorial lots` ·
`Coffins & caskets` · `Facilities` · `Transport` · `Photo gallery & virtual tour` ·
`Digital memorial search` · `Find my loved one`

**Care & planning** (planning, guides and prices):
`Death at home` · `Death at hospital` · `Villa Memorial Plan` · `Price list` · `2026 lot price list`

**Contact block** (unchanged, editable contact fields): 24/7 Assistance Line + number · Second line ·
Open (every hour, every day) · Main office · Visit the park (address + `Map & directions →`) ·
Help (`Contact us` · `FAQ`).

**Bottom row** (unchanged): © line · `Cart` · `Request a quote`; `Family sign-in` · `Agent sign-in` ·
`Staff sign-in`.

## Link check

Every footer href was requested against the running dev server and returned `200`:

`/` · `/services` · `/builder` · `/lots` · `/products` · `/facilities` · `/transport` · `/gallery` ·
`/memorials` · `/memorials/find` · `/services/death-at-home` · `/services/death-at-hospital` ·
`/plans` · `/price-list` · `/lots/price-list-2026` · `/contact` · `/faq` · `/cart` · `/quote` ·
`/client/login` · `/agent/login` · `/login` · `/map`

## Evidence

Before/after, 1440×900 and 390×844 (the footer is taller than one phone viewport, so the phone pass
has a top and a bottom shot at each state):

- `shots/before-1440.png` / `shots/after-1440.png`
- `shots/before-390.png`, `shots/before-390-bottom.png`
- `shots/after-390.png`, `shots/after-390-bottom.png`

The interior pages render the same footer through `PublicShell`; the home renders it through
`LandingView`.

## Tests

`tests/unit/landing-view.test.tsx`:
- pins the footer's de-duplicated list — no repeated href, no repeated label across the two link
  columns, and the retired wording (`Products & caskets`, `Browse the lots`) is gone;
- pins that the park's ONE footer entry is the contact block's `Map & directions →`, and that no
  second `Villa Memorial Park` link sits beside the brand wordmark;
- keeps the contact-block/link assertions for `Funeraria Memorial Services` and `Villa Memorial Plan`.

The footer is still exercised by `tests/unit/journey-actions.test.tsx` (staff contact edit reaches
the footer) and `tests/unit/reading-budget.test.tsx`.
