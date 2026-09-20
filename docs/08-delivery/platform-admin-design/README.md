# Platform operator surface — `/platform/*` (design record)

The PRD's screen inventory ends with three screens that belong to the platform's own
operator surface rather than to the funeral product: **Platform Dashboard/Tenant
Management · Platform Login · Tenant Sign-Up** (`docs/04-modules/screen-inventory.md`;
classification `docs/02-architecture/platform-administration.md`). This repository cannot
provision a tenant and no tenancy/identity service or contract exists, so these are
**designed screens on recorded sample data**: unmistakably marked as the platform's
surface, read-only/capture-only, and each stating what the platform must actually
provide. If the platform team builds their own, this is the reference they were missing.

## What it is

| Route | Screen |
|---|---|
| `/platform/sign-in` | The operator door — **the documented entry point**, reached by URL (see below). Distinct from the product's shared `SignInCard`: platform admins are a separate identity type (`platform_admins`), outside the tenant hierarchy and its RBAC; the first one is seeded, never self-service. The form validates its entry and then says plainly that nothing was sent. |
| `/platform/tenants`, `/platform/tenants/[id]` | Tenant management — the recorded sample list (state · plan · address) and one tenant's record (administrator · subdomain · hostname · provisioned date). Read-only; names the provisioning requirements and the deferred work. |
| `/platform/sign-up` | Tenant sign-up — a designed two-step flow (the business + its subdomain, then the first administrator) that creates nothing, followed by the onboarding sequence (Configure → Import data → Train users → Go live). |

**Entry-point decision.** The operator entry point is `/platform/sign-in`; an operator
bookmarks it. Nothing in the product links it: no public header/footer (`SITE_NAV_LINKS`,
`EXPLORE_MORE_LINKS`), no staff sidebar (`STAFF_NAV`), no family/agent portal nav, no
sitemap entry. `tests/unit/platform-screens.test.tsx` fails any product menu that grows a
`/platform/` link, `app/robots.ts` disallows the prefix, and the surface sets `noindex`
in its own head (`PLATFORM_SURFACE_ROBOTS`). Because no platform session exists in this
build, the sign-in screen's "Behind this door" card opens the tenant screens directly for
review.

## Honesty rules (the deliverable, not a leftover)

- **One vocabulary home: `lib/platform-admin.ts`** — the surface marker lines, the trial
  states (`active_trial` / `trial_expired` / `cancelled`, from decision 9 of the
  classification), the single `free_trial` plan (paid plans deferred with subscription
  billing), the provisioning / sign-in / sign-up requirement lists, the deferred list
  (suspend/delete, custom domains, usage metrics, platform-action audit), the onboarding
  sequence, and `validateTenantSignUpDraft` — the one gate the flow and the tests run.
- **The fixture is samples, and the reader enforces it.** `lib/fixtures/platform/tenants.json`
  is APP-AUTHORED with provenance: every row is `sample: true`, named "Sample"/"Example",
  on the reserved `.example` TLD, with a `.example` administrator mailbox.
  `lib/api-client/platform.ts` REFUSES a row that is not marked a sample and has no live
  branch (`platformLiveModeEnabled() === false`). A real business, plan or hostname can
  never reach a screen; `tests/fixture-contract/platform.test.ts` also pins the 14-day
  trial (trial end = provisioned + 14 days) and the state/plan vocabulary.
- **What the platform must provide is named on every screen**: a separate operator
  identity outside tenant RBAC and a seeded first operator (sign-in); the tenancy service
  creating tenant + owner in one transaction, a unique address, the trial clock and
  tenant isolation (tenants); a provisioning endpoint, subdomain reservation, email
  verification and trial bookkeeping (sign-up).
- **No writes anywhere.** No BFF route, no fetch, no localStorage: the sign-in submit and
  the sign-up "Check and send" end in "Nothing was sent." / "Nothing was created."

## Layout & craft

- **The marker is wording, not decoration**: every route renders
  `app/(platform)/layout.tsx`, whose navy bar carries "Villa Memorial platform · operator
  surface" and "This is the platform's operator area — not the funeral product…". The
  footer points a lost family/office member back at the product's own sign-in. The chrome
  is the platform's own `platform-*` class set — it shares no class with the public
  anchored header, the staff app shell, the portal frame or the sign-in card.
- **Reading budget** (the rule the public pages carry, applied here): a ≤ 12-word opening
  sentence per screen, no paragraph over 30 words, under 300 paragraph words per page,
  no list item over 30 words — enforced by `tests/unit/platform-screens.test.tsx` with the
  shared `tests/helpers/prose.ts` measurement.
- Tokens only (`styles/tokens.css`), typography ladder only; the console's primary button
  is the platform's own navy/gold, not the product's public sky.
- One `h1` per route; skip link first; the global `:focus-visible` ring (2 px + marble
  halo) on every control; the tenant table's frame is `tabIndex={0}` so its horizontal
  scroll is keyboard-reachable.
- Responsive: at 1440 px the content is a two-column grid (main + 22 rem rail); below
  60 rem it stacks; at 390 px the tenant table scrolls inside `.table-wrapper` (the page
  never scrolls sideways) and the bar's nav wraps.

## Verification (this build)

- `npm run lint` · `npm run typecheck` · `npm test` (135 files / 1668 tests) ·
  `npm run build` — all pass; the build lists `/platform/sign-in`, `/platform/sign-up`,
  `/platform/tenants`, `/platform/tenants/[id]`.
- Browser against the **production build** (`next build` + `next start`, fixture mode):
  all four routes render 200 at **1440 × 900** and **390 × 844**;
  `document.documentElement.scrollWidth` equals the viewport at both sizes on every route
  (no horizontal page scroll; the tenant table scrolls inside `.table-wrapper`). An
  unknown tenant id answers 404, `robots.txt` disallows `/platform/`, and the page head
  carries `noindex, nofollow`.
- **Lighthouse (desktop, production): Accessibility 100 · Best Practices 100** on
  `/platform/sign-in`, `/platform/tenants` and `/platform/sign-up`. SEO reports 63 by
  design — the surface is `noindex, nofollow`, which Lighthouse penalises as "blocked
  from indexing"; operator screens must never be findable.
- **Keyboard walkthrough** on `/platform/sign-up`: Tab order is the skip link → the three
  platform nav links → the form fields, each with a visible 2 px ring + halo.
- **Interactive honesty**: submitting the operator form with empty fields shows the field
  errors; with fields filled it shows "Nothing was sent."; the sign-up gate blocks an
  empty step 1; "Suggest an address from the name" fills an editable slug and updates the
  address preview; "Check and send" ends in "Nothing was created." with the entered
  details reviewed back.

## Screenshots (`shots/`)

`sign-in-1440.png`, `sign-in-390.png` · `tenants-1440.png`, `tenants-390.png` ·
`tenant-detail-1440.png`, `tenant-detail-390.png` · `sign-up-1440.png`,
`sign-up-390.png` · `sign-in-honest-390.png` (post-submit) ·
`sign-up-honest-1440.png`, `sign-up-honest-390.png` (post-submit review).

## Files

- `app/(platform)/layout.tsx` — the surface marker bar, its nav and the footer door back.
- `app/(platform)/platform/{sign-in,tenants,sign-up}/**` and
  `app/(platform)/platform/tenants/[id]/page.tsx` — the screens (route-local client
  components for the two forms).
- `components/platform/platform-ui.tsx` — shared presentational pieces (service note,
  sample notice, requirement/deferred lists, onboarding sequence).
- `lib/platform-admin.ts` (vocabulary + rules) · `lib/fixtures/platform/tenants.json`
  (recorded samples) · `lib/api-client/platform.ts` (the reader with the sample floor).
- `styles/components.css` — the "Platform operator surface" block.
- Tests: `tests/unit/platform-admin.test.ts`, `tests/unit/platform-screens.test.tsx`,
  `tests/fixture-contract/platform.test.ts`; the pages also join
  `tests/unit/accessibility-craft.test.tsx` and the seo test's closed-surface list.
- Route coverage: `docs/08-delivery/notes/demo-web-route-coverage.md` §Platform operator
  surface.
