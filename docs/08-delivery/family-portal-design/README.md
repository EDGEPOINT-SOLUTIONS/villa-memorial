# Family portal — the at-a-glance design (approved 2026-09-16)

**Status:** the approved design contract. It supersedes the earlier family-portal design
(the dense 15-page portal shipped in PR #29) — **same routes, same data rules, same honest
states**, rebuilt presentation: one dominant answer per screen, plain words, big calm type.
The captain approved this direction to be built exactly as drawn (Q6, relayed
2026-09-16T16:05Z).

**Presentation update — one house style (captain, 2026-09-17).** The family portal's chrome and
page grammar were reworked onto the **agent portal house style**
([`../agent-portal-design`](../agent-portal-design/README.md)): the same PortalFrame (grouped sky
rail, phone tabs + drawer), the same hero/action-band/section/card/row/note grammar (the shared
kit `components/portal/portal-ui.tsx`), and the same `ag-*` block in `styles/components.css`.
Everything this document calls a family FEATURE is untouched: the plain words, the one-answer
pages, the honest not-switched-on states, the office number on every screen, the device-local
reading preferences and the family reading scale. See §11 for what changed and how it was
verified.

**Artifact:** [`family-portal-design.html`](./family-portal-design.html) — the Lavish review
surface, also openable directly in a browser.
**Sample pages:** [`page-01-signin.html`](./page-01-signin.html) … `page-10-papers-waiting.html` —
one responsive page per key screen.
**Before renders:** `before/*.png` — the shipped design captured at 1440 × 900 and 390 × 844.
**Design audit:** [`audit-results.json`](./audit-results.json) — 20 viewport checks.
**Implementation audit:** [`implementation-audit.json`](./implementation-audit.json) — the built
portal measured the same way (14 screens + the sign-in page × 2 viewports); the full record,
commands and screenshots live in the companion report
(`data/villa-family-portal-design-v2/report.md`).

The PRD this designs against is in the in-memoriam repo:
`docs/04-modules/screen-inventory.md:15` names the twelve family screens; the module docs own
their contents; `02-architecture/roles-permissions.md:13` owns the principle that sensitive
data is not exposed merely because a user can access the customer record.

> **Do not redesign on the way in.** The artifact is the reference. A deviation is the
> captain’s call — except the standing captain rules below, which already override it.

---

## 1. The five rules every screen follows

1. **One answer per screen.** A large sentence states the situation; one button says what to
   do next. Everything else sits below and looks quieter.
2. **Plain words, numbers with meaning.** “The funeral”, not “Funeral case”. “Papers”, not
   “Documents”. “₱22,000 still to pay”, never a bare figure. A term a family may not know
   (interment, abuloy) is explained in the same breath.
3. **Big and calm.** 18 px body, 30 px phone / 44 px desktop headlines, ≥ 52 px controls,
   one card style, high contrast, no motion needed to understand anything, no red-alert
   styling for routine news, no countdowns.
4. **One column, no rails.** A single 44 rem reading column, readable top to bottom in one
   scroll. Six plain navigation names on desktop; five tabs on the phone; the current place
   marked in words + fill.
5. **A person, one tap away.** “Call us” is in the top bar of every screen; the office number
   is repeated in the answer or the note of every page.

## 2. Standing captain rules applied in the build

- **Sky blue, never navy brand** (captain, 2026-09-16). Headers, rails, buttons, links, active
  states, chips and focus rings use the `--sky-*` primitives; the `--navy-*` ladder stays the
  ink. Every pairing passes WCAG AA (verified in the implementation audit).
- **Honest states.** Any screen whose service is not wired says so in one calm note with the
  office number. No invented figure, date, retention schedule, payment destination or
  public-search default.
- **The phone is the main device.** The 390 px hierarchy is the same as desktop — the answer
  and its one action fit above the fold on a 390 × 844 phone.
- **Client imagery and captions stay** where they exist; nothing about the storefront, staff
  portal, agent portal, park map/editor or billing is touched.

## 3. Information architecture (routes unchanged)

The 2026-09-17 alignment presents these destinations in the agent portal's grouped rail (six
groups, same pattern as `AGENT_PORTAL_GROUPS`); the family's words and the route list below are
unchanged, and the phone bar stays `Home · Funeral · Payments · Papers · More` plus Call.

| Destination | Route | Where |
|---|---|---|
| Home | `/client/dashboard` | rail + phone tab |
| The funeral | `/client/cases` | rail + phone tab |
| Payments | `/client/payments` | rail + phone tab |
| Papers | `/client/documents` | rail + phone tab |
| Remembering | `/client/memorials` | rail + drawer |
| Your details | `/client/profile` | rail + drawer |
| Help and requests | `/client/support` | rail + drawer |
| Ask for a visit | `/client/appointments` | rail + drawer |
| Your plan | `/client/plans` | rail + drawer |
| Your lot | `/client/property` | rail + drawer |
| Your family (Family Dashboard) | `/client/family` | rail + drawer |
| What we tell you about | `/client/notifications` | rail + drawer |
| Privacy Center | `/client/privacy` | rail + drawer |

Desktop: one grouped rail (identical pattern to the agent portal). Phone:
**Home · Funeral · Payments · Papers · More**, with every one of the destinations above in the
More drawer and **Call** in the top bar.
The five-step chain is the progress language: **1 Arrangement · 2 Viewing · 3 Funeral ·
4 Burial · 5 Papers**, the current step filled and named (“· you are here”).

## 4. The screens: one fact, one action (the built contract)

| Screen | Route | The one fact in 3 s | The one action | Headline |
|---|---|---|---|---|
| Sign in | `/client/login` | This is the family’s private place | Sign in | “Sign in to see what is happening” |
| Home | `/client/dashboard` | ₱22,000 is still to pay on Ernesto’s plan | See how to pay | “₱22,000 is still to pay on Ernesto’s plan.” |
| The funeral | `/client/cases` | The plan is kept by our office — call and we will read it | Call 0917 617 8489 | “Ernesto’s funeral plan is kept by our office.” |
| Payments | `/client/payments` | ₱22,000 is still to pay before the next date | See how to pay | “₱22,000 is still to pay on your family’s plan.” |
| Papers | `/client/documents` | The papers are ready; nothing is waiting on you | See your papers | “Your papers are ready. Nothing is waiting on you.” |
| Remembering | `/client/memorials` | Nothing about Ernesto is published anywhere | Call us | “Nothing about Ernesto is published anywhere.” |
| Help | `/client/support` | Someone answers every day, 7am–9pm | Call 0917 617 8489 | “Call us. Someone is here every day…” |
| Your details | `/client/profile` | The details are correct; writing can be bigger | Make the writing bigger | “Your details are correct. You can make the writing bigger if you like.” |
| Your plan | `/client/plans` | The plan is active; ₱22,000 is open | See how to pay | “Premium Lawn · Lawn A-01 is active. ₱22,000 is still open.” |
| Your lot | `/client/property` | Lot records are kept by the office; the map is real | Open the park map | “Your lot records are kept by our office…” |
| Ask for a visit | `/client/appointments` | We can come to you; call to set a time | Call 0917 617 8489 | “We can come to you, or you can come to us.” |
| Requests | `/client/requests` | Call and we write the request down | Call 0917 617 8489 | “Ask us for anything…” |
| Notifications | `/client/notifications` | Nothing has been sent yet | Call 0917 617 8489 | “Nothing has been sent to your family yet.” |
| Privacy Center | `/client/privacy` | Nothing is shared unless you say so | Call 0917 617 8489 | “Nothing about your family is shared unless you say so.” |
| Family and access | `/client/family` | One account signs in today | Call 0917 617 8489 | “Today, one account signs in…” |

States designed and built: Home “Nothing needs you today” (the calm week), Payments “fully
paid”, Papers “nothing issued yet”, and one calm honest note on every page whose service is
not switched on. **No routine sentence uses red; state is words + icon, never colour alone.**

## 5. What happened to every element of the shipped design

| Shipped element | Disposition | Why |
|---|---|---|
| Left rail, 14 grouped links | **Dropped** → top bar of 6 names + Call | The densest thing on the screen; six names fit one line |
| Phone bar Home · Case · Payments · Help · More | **Simplified** → Home · Funeral · Payments · Papers · More + Call | “Case” is jargon; Call is always in the bar |
| Hero: eyebrow, name, dates, welcome, chips, events aside | **Simplified** → one Answer card | Chips and side panel competed with the one fact |
| “What needs you now” feed (≤3 cards, coloured rules) | **Simplified** → one Answer block | One dominant answer; routine items stop looking like alarms |
| “Reach us in a tap” (6 tiles) | **Dropped** → actions live where they belong | A tile grid is a menu, not an answer |
| “Where things stand” (5 stages + work card) | **Simplified** → the 5-word chain | “Where are we?” answered in one glance |
| “The next few days” timeline + abroad switches | **Kept/simplified** → day · what · where list; switch to Your details | The schedule matters; the switch panel in the middle did not |
| “Who is with you” coordinator + family list | **Moved** → the office number on every screen; the list under Family and access | One number, not an org chart |
| “Money and papers” (3 money cards + 2 doc cards) | **Moved/simplified** → one money sentence + paper rows | Figures now carry their meaning |
| Status badges / coloured need rules / money washes | **Simplified** → a word + icon; AA ink colours | State never by colour alone; routine news is never red |
| 13–15 px notes across all blocks | **Dropped** → 18 px body, 17 px secondary, 15 px nav only | The family reads at arm’s length on a phone |
| “Designed but not wired yet” alert boxes | **Kept, restyled** → one calm note at the bottom | Honesty stays; the alarm treatment goes |
| Document rows (title · meta · badge · ghost button) | **Simplified** → name, one line, one state word, one full-size action | One decision per row |
| Payment progress bar + % note | **Kept, made literal** → “₱20,000 paid · ₱42,000 in all · almost half” | The bar supports the sentence, never replaces it |
| Reading preferences | **Kept, promoted** to the primary action on Your details | The one control that works today and serves the older reader |
| Notification bell + demo notices | **Moved** → the More list; the page says plainly nothing was sent | A bell invites checking; a placeholder notice fakes delivery |
| 7-stage case preview | **Simplified** → five family moments | Internal stages are the office’s model |
| “What will be on this page” feature grids | **Simplified** → one honest sentence + phone number | A wall of “will be” reads like a brochure |

## 6. What is real, what is the example, what is not wired

- **Real today:** the family name, the loved one’s name and dates, the plan and the
  ₱42,000 / ₱20,000 / ₱22,000 balance from `lib/fixtures/family/snapshot.json`; the client’s
  numbers and places from `lib/family/contact.ts`; the sign-in; the device-local reading
  preferences; the park map link.
- **The example in the design samples (listed as such):** the funeral times, the paper
  “waiting on you” list and the memorial messages. The built pages do **not** render them —
  each is replaced by the honest designed state naming what is missing and the office number.
- **Never invented:** no price outside the client’s 2026 tables, no retention schedule, no
  payment destination, no public-search default, no coordinator name.

## 7. Implementation deviations from the sample pages (all named)

1. **Home headline uses the real fact.** The sample showed the example funeral date; the build
   shows the real balance (and “Nothing needs you today” when settled). The schedule section
   says the office holds the times.
2. **The chain renders without “you are here”.** The case service is not connected, so the
   build shows the five steps with one honest line instead of a guessed stage.
3. **Sign-in keeps the shared card** under the family `fv-signin-scope` (bigger type, sky
   button, the office number). No “forgot password” link: there is no reset service yet, and a
   dead link is worse than the phone number that works.
4. **Reading preferences are live switches**, not static samples.
5. **The More sheet is built** (the samples only showed its trigger).

## 8. Review record

| Round | What happened |
|---|---|
| Construction, 2026-09-16 | Design built and audited; 20/20 viewport checks clean; screenshots and JSON preserved |
| Round 1, 2026-09-16 | Served for the captain’s review with six calls and the reference-screen question |
| Decision, 2026-09-16T16:05Z | **Captain approved the direction to be built exactly as drawn** (Q6), with the sky-blue brand rule applied and the honesty rules kept; the six calls resolved as recommended. No reference screen was supplied |

Open client questions (the client’s to answer, carried through firstmate):
abuloy money model · Filipino/Chavacano translation priority · public memorial search ·
DPA retention schedule + DPO · which payment destinations may be published.

## 9. Verification

- **Design (this folder):** `audit-results.json` — 10 pages × 2 viewports: no sideways
  scroll, one headline per page, primary action above the fold on 390 px, every tap target
  ≥ 44 px, zero WCAG AA contrast failures, smallest meaningful text 15–17 px.
- **Build (the implementation audit):** the real portal signed in as the family persona,
  14 screens + sign-in × 2 viewports: same checks, all clean; plus `npm run lint`,
  `typecheck`, `test` (564 tests) and a production build. The at-a-glance bar is pinned by
  `tests/unit/family-pages.test.tsx` (one `h1`, one primary action before any section, the
  office number one tap away, no `fp-*`), `family-ui.test.tsx`, `family-nav.test.ts`,
  `family-view.test.ts` and `family-calm-state.test.tsx`.

## 10. Where the design lives in the build

| Design element | Code |
|---|---|
| Shell: grouped rail, phone tabs, drawer, household + office help block, phone Call | `app/(family)/client/layout.tsx` + `components/portal-frame.tsx` (the same frame as the agent portal) |
| Shared portal kit: hero, action band, sections, cards, rows, figures, progress, calm note | `components/portal/portal-ui.tsx` (renders the `ag-*` grammar) |
| Family blocks: answer, chain, schedule, rows, money, planned page | `components/family/family-ui.tsx` |
| Family-specific CSS: the reading scope, chain, schedule, reading switches, sign-in door | `styles/components.css`, block “Family portal (client) — one house style…” |
| Reading preferences (`data-fv-reading`) | `components/family/family-reading-preferences.tsx` |
| Family sign-in scope | `app/(signin)/client/layout.tsx`, `lib/sign-in.ts` |
| PRD screen coverage (screen → route → state → module → missing) | `lib/family/portal-coverage.ts`, pinned by `tests/unit/family-prd-coverage.test.ts` |
| Worker and sample pages | the ten `page-*.html` files beside this README |

## 11. One house style (2026-09-17)

**What changed.** The shell moved from the family-only top bar to the agent portal's
`PortalFrame`: grouped sky rail with the family's own destinations, phone bottom tabs
(`Home · Funeral · Payments · Papers · More`) and the drawer, the household name and office
number in the sidebar help block, and a phone top-bar Call button. Every page now renders the
shared kit: `.ag-hero` (eyebrow, one `<h1>`, lead, chips, action band), `.ag-sec` headings with
`.ag-card` content, `.ag-*` rows/figures/progress, and the calm `.ag-note` for a service that is
not switched on. `components/family/family-frame.tsx` and `family-signout.tsx` were removed
(sign-out lives in the shared sidebar, as on the agent portal).

**What did not change (the family features).** Same routes; same data rules (fixture-only
snapshot, no invented figure, date, destination, retention or contact detail); the same plain
words and honest states; the office number one tap away on every screen; the 18 px family reading
scale and the device-local `Bigger writing · Stronger colours · Calmer page` switches, which now
scale the shared kit through the `--text-*` tokens.

**New coverage.** `lib/family/portal-coverage.ts` maps the PRD's 12 family screens
(`docs/04-modules/screen-inventory.md`) plus the notifications and profile surfaces to their
routes, state (built/partial/honest), owning PRD module and what is still missing.
`/client/family` is now the **Family Dashboard** (household, holdings, who can see it) rather
than only a family-and-access notice, so the PRD's “Family Dashboard” screen exists on the
portal.

**Verification (this change).** All 14 routes at 1440 × 900 and 390 × 844: one `<h1>` inside
`.ag-hero`, the primary action before the first `.ag-sec`, no horizontal scroll, and the fact and
the action both visible above the fold on 390 px. The family and agent dashboards, side by side:
[`after/dashboards-side-by-side-desktop.png`](./after/dashboards-side-by-side-desktop.png),
[`after/dashboards-side-by-side-phone.png`](./after/dashboards-side-by-side-phone.png). Pinned by
`tests/unit/family-pages.test.tsx`, `family-portal-shell.test.tsx`, `portal-kit.test.tsx`,
`family-nav.test.ts`, `family-prd-coverage.test.ts`.
