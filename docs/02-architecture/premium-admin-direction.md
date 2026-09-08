# Premium admin direction — blue/gold (Radiant Compassion)

Status: **blue/gold APPROVED on the staff-portal boundary (option 1)** · Owner: Gab ·
Next: **purchase-form showcase checkpoint pending captain review (needs-decision
[key=purchase-form-showcase])**

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
