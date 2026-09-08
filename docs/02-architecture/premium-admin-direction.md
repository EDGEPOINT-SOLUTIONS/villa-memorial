# Premium admin direction — blue/gold (Radiant Compassion), product-wide

Status: **purchase showcase APPROVED; full-product rollout complete on
`fm/villa-admin-premium` (staff · family · agent · landing) + Service Contract
export — pending final CI via no-mistakes** · Owner: Gab

## 1. The approved direction — blue/gold for the staff portal

The COO blue/gold "Radiant Compassion" palette adapted for admin screens: deep navy
side surface with warm gold accents, cool paper content area, navy display-serif titles,
gold focus/active/hairline moments. Sample (staff dashboard) approved 2026-09-08; token
decisions live in `styles/tokens.css` (navy/gold primitives + staff roles) and the
`.app-shell`-scoped rules in `styles/components.css`. Public/family/agent surfaces still
carry DOC granite/marble/brass — tracked as a product-wide open decision in `PORT_PLAN.md`.

## 2. Flagship — the Purchase Application & Agreement experience (pre-checkpoint work)

The captain made the Villa Purchase Application and Agreement the flagship deliverable,
then raised the bar twice (1M-peso → 2.5M flagship: meticulous spacing/typography/
hierarchy/motion, every state polished, exports indistinguishable from a studio
deliverable). Built on `fm/villa-admin-premium`:

**What changed (fixture-first; no invented money math/contracts/receipts; honest blanks;
RBAC and per-route titles intact):**

| Area | Change |
|---|---|
| Capture screen `/staff/property/[id]/apply` | Rebuilt as a document-folio flow under the blue/gold system: navy paper-hero band (lot chips + listed price), numbered folio sections 01 Buyer → 02 Beneficiaries → 03 Lot/price/terms → 04 Consent & signatures, breathing multi-column field grids, peso-marked money fields, lot strip, consent statement block, sticky document rail (step navigation + ready-for-paper checklist + preview CTA), client-side capture gate, unchanged save behaviour through the BFF |
| Paper document view (new `/staff/property/[id]/document` + in-flow preview) | The recorded application — or the live draft — rendered as a true document sheet (Times typeface, park letterhead, bordered buyer/property grids, numbered clauses from `villa-terms.ts`, signature + notarial blocks, DPA consent page), from the SAME blocks the exports use |
| Export | Real **.docx** (OOXML via the `docx` library, browser-side) and real **.pdf** (pdfkit via `POST /api/export/paper-pdf`, gated on session + property read), replicating the archived `docs/07-client-villa/paper-forms/` formats (fonts, tables, clause layout, signature and notarial blocks) filled from staff-entered data; Print prints the sheet on Letter |
| Lot detail | "Open paper document" entry point for recorded applications (read-only viewers get it too) |
| Honesty | Amounts print as written (em dash when uncaptured), Age next to DOB is a calendar computation only, operative clauses come from `villa-terms.ts` (never authored in the builder), form chrome is transcribed from the archived paper, no service is called or rewired |

**Verification:** lint + typecheck green; 159 tests green incl. new consumer-level export
tests (docx is parsed as an OOXML zip and its `word/document.xml` is asserted to carry the
captured fields; pdf asserted structurally valid); `npm run build` green.

**Evidence for the captain** (worktree, `.premium-review/`):
- `purchase-capture-top.png` / `purchase-capture-finance.png` — capture folio (hero → buyer → financing)
- `purchase-preview-toolbar.png` — in-flow paper preview with Print / Word / PDF actions
- `purchase-document-top.png` / `-mid` / `-clauses` / `-notarial` — the recorded paper document
- `export-evidence/Purchase-Application-and-Agreement-Lot-A-002.docx` and `.pdf` — real downloads filled with the demo buyer's data (Marites Santos, lot A-002)
- `dashboard-before.png` / `bluegold-dashboard-*.png` — the approved dashboard sample pair

**Scope consequences to rule on (captain's choice):**
1. The full-product palette question stays tracked in `PORT_PLAN.md` (open decision #1).
   The captain added the **public landing page** to the blue/gold scope for the rollout
   phase — that will make the change effectively product-wide; family/agent portals will
   follow for coherence unless the captain says otherwise. The rollout summary will say
   explicitly which surface keeps the old granite identity if any.
2. After this showcase checkpoint: (3) roll blue/gold + premium robustness across the
   whole staff portal, and (4) extend the same paper-sheet + .docx/.pdf export to the
   funeral Service Contract so all three forms export identically.

## Approval question for the captain

Approve the purchase-form showcase (capture folio + document view + Word/PDF export) and
proceed to full rollout (3) + Service Contract export (4)?

## 3. Product-wide rollout (captain's mandate, 2026-09-08)

The captain approved the showcase and expanded the mandate: *apply this UI/UX
throughout all pages — admin panel, agent, family, staff, and the landing page.* One
product, one premium look, same 2.5M-peso bar. Implemented in one sweep (staff → family
→ agent → landing), followed by the Service Contract export so all three forms export
identically.

### How it was done
- **Tokens, product-wide:** the semantic roles and brass primitives in `styles/tokens.css`
  were re-pointed to the navy/gold family (cool paper surfaces, navy ink, gold accents,
  gold focus/hairlines). Every surface shares one palette by construction — the
  per-tenant theming the design system promised is exactly this.
- **Shared kit upgrades:** navy primary buttons, gold accent buttons with navy text,
  real form-control styling (inputs/selects/textareas/checkboxes were browser-default in
  most portals — now bordered with gold focus rings), ledger column headers + cool row
  hover on tables, cool loading skeleton, cool empty/alert states.
- **Folio welcome bands:** the family and agent dashboards open with the same deep-navy
  hero band as the purchase capture (eyebrow, display serif, chips, gold price panel).
- **Landing:** dark showcase + CTA bands are now deep navy with gold blooms; eyebrows,
  stats and steps read gold; accent CTAs are gold-on-navy-text. The landing stays a
  photo-led marketing surface (deliberate — see deviations).
- **Service Contract export:** `lib/contracts/service-paper.ts` builds the same
  PaperBlock grammar as the purchase papers from the case intake + working draft +
  linked order; the paper screen's preview now carries Print / Word (.docx) / PDF via the
  shared export actions. Consumer tests assert the .docx OOXML carries the filled fields
  and the versioned clause wording.

### Intentional deviations (named for the captain)
- The **family "memorial card"** keeps its warm ivory gradient — remembrance warmth on
  the family home is deliberate, not a miss.
- **Family/agent sidebars stay light** (near-white with navy text and gold active wash)
  rather than the staff portal's deep-navy sidebar — the airier COO portal look inside
  the same navy/gold language, keeping portals distinct at a glance.
- The **landing hero stays photo-first** (white/navy text over photography) with navy
  showcase and CTA bands carrying the premium depth; it does not copy the folio's navy
  full-bleed header because that would fight the photography.

### Evidence (worktree, `.premium-review/`)
- `public-landing-v2.png`, `public-plans-v2.png` — public landing + plans under blue/gold
- `family-dashboard-v2.png`, `agent-dashboard-v2.png` — folio welcome bands
- `service-contract-preview.png` — service contract paper preview with export toolbar
- `export-evidence/Service-Contract-CASE-2026-0001.docx/.pdf` — real exports
- earlier: purchase folio + document screenshots and `Purchase-Application-and-Agreement-Lot-A-002.docx/.pdf`
