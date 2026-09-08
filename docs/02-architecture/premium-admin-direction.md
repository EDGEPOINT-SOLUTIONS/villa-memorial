# Premium admin direction — sample for captain approval

Status: **awaiting approval (Phase 1 checkpoint)** · Owner: Gab · Scope: villa-memorial staff/admin portal (whole-portal rollout after sign-off)

Screenshots (worktree-local review copy, not committed): `.premium-review/premium-sample-dashboard.png` (top of the sample page) and `premium-sample-dashboard-lower.png` (cards/tables region). `dashboard-before.png` is the pre-pass state for comparison.

## The direction — "Granite & brass at premium craft" (the Villa Ledger)

The staff portal is where Villa's arrangements are made real. The premium treatment turns every
admin screen into a page in a beautifully kept ledger: quiet **granite** structure, warm
**marble paper** surfaces, and **brass** kept strictly ceremonial (eyebrows, key figures, focus,
active nav, card arrows) so it never floods operational UI. This **extends the app's current DOC
identity** — the same granite/marble/brass the public, family and agent surfaces already speak —
rather than importing the COO blue/gold "Radiant Compassion" mockup palette into the staff portal
alone.

**Why not blue/gold here:** flipping one portal to blue/gold while the deployed public + family +
agent product stays granite would split the product; and the COO mockup never designed staff-admin
screens (only the public/portal doors), so there is no client-approved blue/gold admin language to
adopt. Blue/gold remains a candidate only as a *full-product* re-theme — a separate,
client-owned decision already tracked in `PORT_PLAN.md` (open decision #1). This direction keeps
that door open: everything is token-driven, so a product-wide palette change stays a contained
tokens-only task.

## Token decisions (all additive — base palette values untouched)

| Token (tokens.css) | Value / role |
|---|---|
| `--color-bg-desk` | radial desk-light gradient over marble — warm light falling on the work surface |
| `--color-rule` / `--color-rule-strong` / `--color-rule-inverse` | hairline ladder: structure lines vs stronger separators vs white-on-dark seams |
| `--brass-wash-soft` / `--brass-wash` / `--brass-wash-strong` | translucent brass tints (active nav, accent chips) — brass never floods |
| `--brass-hairline` | the gradient brass hairline family already used by public/family/sign-in shells |
| `--shadow-paper` / `--shadow-card-rest` / `--shadow-card-hover` | elevation ladder — paper → resting card → lifted card |
| `--color-figure` | serif display figure ink (deep granite) for headline numerals |
| `--text-title-page` / `--text-stat` | page-title clamp (≈30–36px) and stat-figure (30px) display type |

## How the treatment reads on the sample (staff dashboard)

- **Chrome:** sidebar becomes an anchored dark surface (soft top-light gradient + white hairline
  seam), brand eyebrow lifts to brass with wide tracking, active nav = translucent brass wash with
  a brass left rail; the staff top bar gains the same 2px **brass hairline** the public/family
  shells wear — one product, four doors.
- **Page header:** brass uppercase eyebrow (like public/family warmth), title set in display serif
  at up to 36px in deep granite ink.
- **KPI tiles** ("ledger cards"): paper shadow, serif figures at 30px in figure ink, brass arrow
  that lifts on hover with a brass-tinted border.
- **Section titles:** serif with a short fading **brass underline** rule.
- **Tables:** uppercase hairline column headers, soft row hover — data reads like a ledger.
- Finance figures keep brass (ceremonial key figures); status hues stay desaturated.

## Extending to the rest of the portal (rollout plan, Phase 2)

The sample is **pure tokens + CSS** — no page markup changed. Everything lands inside the shared
kit under the `.app-shell` scope, so rolling out is extending the same scoped system to the
classes the other ~40 staff routes use (list pages, detail pages, capture forms, the two paper
screens), plus a "robust states to a premium standard" sweep (validation, empty/error/loading,
RBAC-gated entry, per-route titles) reusing `components/ui/states.tsx`. Because rules are scoped
to `.app-shell`, public/family/agent surfaces keep their exact look; any incidental shared-kit
drift gets flagged in the PR summary.

## Phase 3 note (forms as documents)

The paper screens already read as documents; Phase 3 makes each of the three forms read as a true
document page and adds real `.docx` + PDF export replicating the archived
`docs/07-client-villa/paper-forms/*.docx`, filled from captured data — same wording as
`lib/contracts/*` + `villa-terms.ts`, honest em-dash/blank conventions intact.

## Approval question for the captain

1. Approve "granite & brass at premium craft" for full staff-portal rollout (recommended), or
2. prefer the COO blue/gold palette for the staff portal only (not recommended — portal split), or
3. want the blue/gold question escalated as a product-wide re-theme decision before Phase 2.
