# Staff lead record — implementation record (PRD S4 Lead Detail, 2026-09-18)

**Routes:** `/staff/pipeline` (the recorded lead list + entry points) and
`/staff/pipeline/[id]` — the staff lead record.
**Brief:** the PRD names **Lead Detail** as a staff screen (S4); the agent portal already has a
real lead record (PR #56), while the office's CRM view ended at a customer list and an enquiry
that lived only in the browser session. The customer-records service (crm-families) is unbuilt, so
this is the staff-side record on recorded data, saying honestly what waits on the service.

## What the screen does, in reading order

1. **The person and the enquiry.** The header carries the person's name (one `h1`); the hero card
   shows how and when they came in (`Walk-in · came in Sep 8`), who is handling them, their own
   phone and email, the stage badge and the last contact. *The enquiry* card below lists the
   recorded reference, source, what they asked about and the enquiry's own words.
2. **Where they are.** The PRD pipeline trail (the same stage words the agent record prints) plus
   every recorded stage move: its day and author, the stage it moved to, and the note — not a bare
   badge.
3. **What was said.** The recorded contact history — calls, visits, links and messages, each with
   its Manila day/time, kind and words. A lead with none recorded says so; nothing is invented.
4. **What happens next.** The recorded next step, `Call <first name>` from the record's own phone
   (a real `tel:` link) and `Text`, with the office line read from `lib/family/contact.ts`.
5. **What follows.** The office's own next step for this interest — plan →
   `/staff/plans/membership/new`, lot → `/staff/property`, services → `/staff/cases/new` — and one
   short line naming what waits on the customer-records service.

**Entry points.** `components/crm/lead-records-panel.tsx` (one row per recorded lead, each opening
its record) renders on the Sales pipeline screen and as the Customers screen's closing "Lead
records" section. The pipeline screen keeps its "Leads and pipeline run on crm-families, which is
unbuilt" note — the list is read-only and no stage can move from it yet. The record links back to
the pipeline.

## What is deliberately absent

- **No writes.** There is no lead/customer-records contract, so nothing on these screens creates,
  assigns or moves a lead; the record is read-only and says so.
- **No invented activity, move or value.** A lead with no contact renders its empty state; the
  contact history is exactly the fixture's entries.
- **No money.** The lead file carries no amount anywhere (`tests/fixture-contract/crm-leads.test.ts`
  walks it and fails an amount-like leaf); possible value is not this screen's business.
- **No second pipeline vocabulary.** `lib/crm/lead-view.ts` re-exports the agent record's own stage
  words, source labels and contact kinds from `lib/agent/agent-view.ts`; it adds only the office
  policy (badge tone, follow-on links, the one honest line). The two surfaces cannot describe a
  lead differently.

## Where every fact comes from

| Fact | Source |
|---|---|
| Person, enquiry, source, topic, message | `lib/fixtures/crm/lead-records.json` (APP-AUTHORED with provenance) through `lib/api-client/crm-leads.ts` — strict reader, fixture-only: `crmLeadsLiveModeEnabled() === false`, so setting `CRM_BASE_URL` cannot make it live |
| Enquiry cross-reference | the matching row of `lib/fixtures/crm/inquiries.json` (pinned) |
| Stage words, source labels, contact kinds | `lib/agent/agent-view.ts` (the one pipeline vocabulary home), re-exported by `lib/crm/lead-view.ts` |
| Movement, contact history, owner, next step | the fixture — for a person the agent portal also carries, IDENTICAL to `lib/fixtures/agent/workspace.json` (pinned) |
| Office phone + hours | `lib/family/contact.ts` |
| Follow-on screens | the office's real forms: `/staff/plans/membership/new`, `/staff/property`, `/staff/cases/new` |

## RBAC

`cases:read` — the CRM area's own provisional scope (same as Customers/Inquiries; the inline array
keeps `tests/unit/staff-scope-vocabulary.test.ts` green). A session without it gets the designed
forbidden state on the list and the record.

## Verification

- `tests/fixture-contract/crm-leads.test.ts` — movement invariants, enquiry cross-reference,
  agent-portal parity, vocabularies, the no-amount walk.
- `tests/unit/crm-lead-record.test.tsx` — the four questions, the shared stage words, the recorded
  history, the empty-activity lead, the one honest line, 404/403, the entry points, one `h1`, the
  reading budget (paragraph ≤ 30 words, list item ≤ 30, paragraph prose ≤ 300).
- `tests/unit/crm-lead-view.test.ts` — the office policy (badge tone, follow-ons, first name).
- `npm run lint && npm run typecheck && npm test && npm run build` all pass.
- Render checks at 1440 and 390 (with the no-recorded-activity lead) in `shots/`; page
  `scrollWidth === viewport` at 390 on all three screens (no sideways pan), the contact actions
  show the global `:focus-visible` ring, and Lighthouse reports **accessibility 100 /
  best-practices 100** on the record and the list (the one failed audit is `is-crawlable` — staff
  pages are intentionally `Disallow`ed in `app/robots.ts`).

**Backend ask recorded by this PR:** the crm-families read/write contract (lead records, stage
moves, contact logging, assignment), which replaces the fixture and turns the recorded list into a
working pipeline. Until it freezes, the reader is fixture-only and the screens name the gap once.
