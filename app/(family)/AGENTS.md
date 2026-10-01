# AGENTS.md — `app/(family)` (family portal surfaces)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `app/(family)/`, and it is not loaded before then.
> The cross-cutting rules stay in the repository-root [`AGENTS.md`](../../AGENTS.md). Read that first.

## Family portal — one house style with the agent portal (read before touching `(family)/client/*`)

- The family and agent portals render the SAME chrome and page grammar (captain, 2026-09-17):
  both use `components/portal-frame.tsx`, the shared kit `components/portal/portal-ui.tsx`
  (hero · action band · section · card · row · figure · progress · calm note), and the `ag-*`
  block in `styles/components.css` — its portal theme scope covers `[data-portal="agent"]` and
  `[data-portal="family"]` (white grounds; the sky lives on controls). The agent portal is the
  visual reference
  (`docs/08-delivery/agent-portal-design`); the family-only frame/bar was deleted, so never
  reintroduce a second family shell. Nav groups/tabs: `components/portal-nav.ts`
  (`FAMILY_PORTAL_GROUPS`, `FAMILY_PORTAL_TABS`); the phone top bar keeps the Call button.
- The calm note (`PortalNote`, re-exported as the family `Note`) is a **block container**
  (`div.ag-note`), never a `<p>`: every call site passes its own `<p>` (and lists are legal),
  so a paragraph wrapper recreates the captain-reported 2026-09-17 `<p> cannot be a descendant
  of <p>` hydration error on every family page. `.ag-note` CSS is class-only — keep the class
  on a block container; `tests/helpers/paragraph-nesting.ts` pins the rendered pages.
- Family FEATURES stay family-owned in `components/family/family-ui.tsx` (answer, five-step
  chain, schedule, planned/honest page): the plain words, the honest not-switched-on states,
  the office number on every screen, the 18 px family reading scale (`.fv-body` overrides the
  `--text-*` tokens inside the kit) and the device-local reading switches
  (`data-fv-reading` large/contrast/calm, `components/family/family-reading-preferences.tsx`).
- `lib/family/portal-coverage.ts` maps every PRD family screen (screen-inventory §Customer/family
  portal + notifications/profile) to route → built/partial/honest → PRD module → what is
  missing; `tests/unit/family-prd-coverage.test.ts` pins it and `family-nav.test.ts` pins the
  rail. `/client/family` is the Family Dashboard. When a contract lands, change the page and
  the coverage row together.
- Data: `lib/api-client/family.ts` is PROVISIONAL fixture-only (no frozen family API
  contract). Three fixtures: the recorded snapshot `lib/fixtures/family/snapshot.json` (plan,
  balance integer cents, the family's own papers), the app-authored workspace
  `lib/fixtures/family/workspace.json` (the family's requests, appointments and lot record),
  and the recorded case `lib/fixtures/family/case.json` (the office's arrangement for the
  demo family — the five moments with their times, places and states).
  The workspace records are example data with provenance, pinned by
  `tests/fixture-contract/family-workspace.test.ts`: no amount, no chapel name, no ticket
  number, no coordinator name, nothing published — Requests, Ask for a visit, Your lot and
  Remembering render them with the office phone as the action and one calm note naming the
  contract each waits on. The case is pinned by `tests/fixture-contract/family-case.test.ts`
  and rendered by ONE component (`components/family/family-case.tsx`) so the dashboard's
  arrangement panel and `/client/cases` cannot drift; a step the record does not carry says
  so in a few words and a family with no recorded case keeps the honest “not connected”
  state. `lib/family/family-view.ts` holds the ONE way the portal prints a
  day (calendar dates in UTC, instants in Asia/Manila) and the initials a memorial shows.
  `lib/family/contact.ts` holds the client's numbers. Never invent a figure, date, payment
  destination or contact detail. Tests: `family-pages`, `family-records`, `family-portal-shell`,
  `portal-kit`, `family-nav`, `family-prd-coverage`, `family-ui`, `family-calm-state`,
  `family-view`, `family-workspace`, `family-case`; `docs/08-delivery/family-portal-design`
  §11–12 records the alignment and its side-by-side verification.
- **The family's own papers are never request-gated** (captain, 2026-09-17): the service
  contract and every official receipt are the family's by right — `/client/documents` and the
  funeral page (`/client/cases`) always show them as “Yours”, with a real copy when the record
  can produce one and the honest “getting it ready for this page” state plus the office line
  when it cannot; “Ask for a copy” stays only for certificates/permits/other kinds. The
  classification + words live in `lib/family/family-documents.ts` (rows:
  `components/family/family-papers.tsx`; the snapshot's `recent_documents[].kind` is the
  source, unknown kinds stay requestable). `lib/api-client/family.ts::toFamilyDocument` is the
  family-safe projection (drops uploader, file size, internal notes/ids — pinned by
  `tests/unit/family-documents.test.ts`). One receipt opens as a copy at
  `/client/documents/receipts/[reference]` (shared paper sheet + Print/Word/PDF) only when its
  record carries number + date + amount; a half-record 404s rather than printing a plausible
  receipt. The recorded snapshot carries ONE such receipt (OR-2026-00201), so that copy ships
  and opens today (on screen and as the family's own guarded PDF); a record that does not carry
  the three cells keeps the honest “getting it ready” state, and the backend ask (generate every
  document, attach it to the family record, notify the family) stays open.

