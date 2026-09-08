# FORMS_PLAN — digitizing Villa's real forms (villa-memorial only)

Status: draft for the next build session · Owner: Gab (this repo is
Gab-controlled: direct pushes, no review gate) · Scope: villa-memorial only.

## Business goal

Turn Villa Memorial's paper forms into clean, structured capture screens in
this frontend — the Funeral Service Contract, the Lot Purchase Agreement /
Application, receipts, and the Villa Memorial Plan (Eternal Plans) membership —
so staff can fill them on screen and the printed document matches what Villa
uses today. Everything is built **fixture-first** (the app runs standalone in
fixture mode); live service wiring comes later when the dev provides gateway
details.

## Grounding (in this repo)
- `docs/07-client-villa/current-state-forms.md` — the real forms & business rules
- `docs/07-client-villa/open-questions.md` — open business questions
- `docs/08-delivery/contracts/` — frozen API/event shapes (**never invent new ones**)
- Existing frontend code (below) — build by extending, not duplicating

## What already exists here (extend these; don't rebuild)
| Area | In this repo |
|---|---|
| Case intake (funeral case data) | `components/intake-form.tsx`, `/staff/cases/new`, case page |
| Funeral Service Contract render | `lib/contracts/service-contract.ts`, generate on case page; paper capture screen at `/staff/cases/[id]/service-contract` (`service-contract-screen.tsx` + `service-contract-paper.tsx`, model in `lib/contracts/service-contract-capture.ts`) |
| Lot Purchase Agreement render | `lib/contracts/purchase-agreement.ts`, generate on property detail |
| Customer / family accounts | `/staff/customers/new` |
| Inquiries | `/staff/inquiries/new` |
| Plans & catalog items | `/staff/plans/new`, `/staff/catalog/new`, inventory, pricing |
| Documents library | `/staff/documents/new`, list, detail |
| Public capture | quote / contact / appointments / faq + cart / checkout / order |
| Reservation entry points | public lot pages + property screens |

## Gap list (the real forms still to capture fully)

1. **Funeral Service Contract — capture completeness (P1 — implemented, Track A).** The intake
   screen captures every header field (deceased, client incl. gender/civil status/Facebook/email,
   co-maker, IDs, senior flag), and the case's service-contract screen captures every line item
   (ROD, coffin tier, embalming days, lizo, delivery, viewing, interment, extension) and the
   **deductions block** (LGU / DSWD / Senior / SSS-GSIS / life-plan) as structured inputs; the
   printed paper preview matches `current-state-forms.md` §1. Payment due 9 days / instruments
   in 3 days / 10%-per-month messaging = **display-only copy** (math belongs to
   finance, dev-side).
2. **Purchase Application Form (2026 combined, P1 — implemented, Track B).** Buyer demographics (TIN,
   GSIS/SSS, Facebook, employer), **beneficiaries (age + relationship)**,
   classification / block / lot, pricing fields + amortization mode, DPA
   consent clause, sales-agent co-signature. Feeds the purchase-agreement
   generator (`lib/contracts/purchase-agreement.ts` now takes the captured
   application; without one it prints an honest blank form). Capture shape is
   PROVISIONAL — no service contract freezes it yet (see
   `docs/07-client-villa/open-questions.md` Track B; live persistence 503s).
3. **Provisional receipt → official receipt flow (P1 display).** Initial
   payment capture + receipt view with the honest "valid only when confirmed by
   official receipt" note; the actual OR numbering/allocation is dev/finance.
4. **Villa Memorial Plan membership / COC — Eternal Plans (P2).** Holder +
   beneficiary, branch, coverage type, plan value, COC no., start/end
   (1-year term, 12:01 noon), the 70%-of-plan-value unrendered-service note,
   transfer rules, insurance health declarations + DPA consent.
5. **Guarantee-instrument capture (P1/P2, partly blocked).** LGU/DSWD/SSS/GSIS/
   life-plan instruments with submission deadlines. Underlying sub-ledger +
   math are dev-owned (issue #54) → build the capture UI; persistence math is
   "blocked on dev".
6. **Documents ↔ lot linking (P2).** Let a lot list its own agreements
   (contracts may need a `related_lot_number`-style shape → check frozen docs;
   if the shape isn't frozen, mark blocked on dev, issue #55).

## Suggested build order
1 → 2 → 3 → 4 → 5 → 6 (5 & 6 may stall on dev contracts; deliver 1–4 fully
first, then the parts of 5–6 that are pure capture UI).

## Non-negotiable build rules (same as the frontend's AGENTS.md)
- **Fixture-first:** build against recorded fixtures in `lib/fixtures/`; never
  against a half-built backend. New fixture shapes must mirror frozen contract
  docs — if a shape isn't frozen, ask the dev (note in the commit) or keep the
  screen honest ("waits on dev") instead of inventing.
- **No invented contracts / posting rules / money math.** Money rules, the
  guarantee sub-ledger, OR numbering, and document *generation* are dev domain.
  We build capture UI + display + honest states.
- Every screen: validation, empty/error/loading states, RBAC-gated entry, and
  per-route document titles — per `AGENTS.md` / `docs/02-architecture/service-template.md`.
- Palette: keep the app's current design tokens; the blue/gold vs
  granite/marble/brass decision is still open (see PORT_PLAN) — restyling is
  contained and can happen after.

## Definition of done for each form
- [ ] Route + entry point (staff and/or public) wired into nav per RBAC
- [ ] Structured capture UI with validation
- [ ] Fixture seed (or honest blocked-on-dev note if shape isn't frozen)
- [ ] Print/preview matching the paper form's fields
- [ ] Tests (fixture-contract where a shape exists) + demo steps in the commit
- [ ] Pushed straight to `main` (Gab-controlled repo)

## Open questions for the dev (capture in commit notes / PORT_PLAN)
- Live gateway env (when forms must persist to services)
- Which shapes 5–6 may use (the gap-2 merge question is answered: the 2026
  application/agreement merge is handled in `lib/contracts/purchase-agreement.ts`,
  which renders the governing revision's fields from the captured application)
- Final palette for the deployed product
