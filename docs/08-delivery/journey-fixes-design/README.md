# Journey fixes — the closing action layer and the contact surface (F-17)

Captain's brief, 2026-09-18: *"Make the path a family actually takes obvious — the
calls to action, the contact surface and the click-to-call."* This is item F-17 of
the front-end completion list, the last one on it.

## What shipped

### 1. Every public page ends on the same three next steps

`components/landing/next-steps.tsx` (`NextSteps`) is the ONE closing band:

| Action | Where it goes |
|---|---|
| **Call 0917 617 8489** (primary, `tel:`) | the staff-editable 24/7 line |
| **Ask a question** | `/contact` |
| **Start the arrangement** | `/builder` |

The office-assisted route leads the band, because that is how Villa actually sells.
Rendered by `PublicShell` (every interior public page, immediately above the footer)
and by `LandingView` (the home, between the anchored grid and the footer). One
grammar; a future public page inherits it by using the shell — there is no per-page
list to keep.

**One documented exemption:** `/immediate-assistance` renders no band. That screen
IS the call-first journey (F-01), and its content order — enormous call, the four
steps, the reassurance, the secondary alternatives — is its contract; a second
action band would contradict "nothing else asks for a decision". Pin:
`tests/unit/journey-actions.test.tsx` → *leaves /immediate-assistance to its own
call-first order*.

### 2. Click-to-call everywhere it makes sense

- The band's call is a real `tel:` link with a `Call <number>` label (never a bare
  number), read from the landing contact document — a staff edit reaches it
  (pinned in `journey-actions.test.tsx`).
- **The template placeholder `0917 123 4567` is gone.** The advisor cards on
  `/plans/[sku]` and `/products/[sku]` now print the document's own number as a
  `tel:` link with the label; a source scan test fails if the placeholder (or the
  older `0917 000 1234`) returns to `app/(public)` or the public components.
- **The placeholder was also baked into the plan poster**
  (`public/media/plan-packages.png`, served by `/plans`, `/plans/[sku]`,
  `/plans/villa-memorial-plan` and `/packages`): its advisor strip printed
  "0917 123 4567" under a banner. The strip's left band was masked to the poster's
  own navy — artwork, wave silhouette and the gold tagline panel are untouched,
  and no contact detail is now printed in raster art that the landing document
  does not carry. The composition thumbs were re-derived (only the two
  `plan-packages-*.webp` files changed; every other derivative is byte-identical)
  and the poster fell from 1.9 MB to 616 KB. Provenance note added at
  `lib/media.ts`.
- The footer's phone entries now read `Call <number>` and carry **both** published
  lines.

### 3. The contact surface is one place

`/contact` now leads with the office's published facts before the form:

- the 24/7 line as a primary call button + "Answered every hour, every day";
- the second published line as a labelled call link;
- the main office and the park addresses (the client's own letterhead);
- the three capture paths: Send a message (this page) · Request a quote · Book a visit.

All of it reads from the **staff-editable LandingPage document** (`lib/fixtures/landing/content.json`,
model in `lib/api-client/landing.ts`, editor zone 01 at `/staff/landing`), which
gained four fields: `secondPhoneDisplay`, `secondPhoneHref`, `officeAddress`,
`parkAddress`. The validator (and the editor's live check) requires the second line
as a number + `tel:` link pair or not at all; clearing both hides the row.

**Provenance.** Both hotlines and both addresses are the client's own, from the
letterhead of their 2026 Purchase Application Form
(`docs/07-client-villa/paper-forms/Purchase Application Form.docx`):

> SANCTUARIO DE MERCEDES Y GLORIA · AA VILLA MEMORIAL PARK DEVELOPMENT SERVICES
> Purok 3, Begang, Isabela City, Basilan — Main Office: Capilla de San Jose Bldg.,
> Sunrise, Isabela City, Basilan — Tel No. 09176178489 / 09171839262

Nothing else was added: no walk-in hours figure is published (the client material
carries none), and the availability line restates the document's own 24/7 label.

### 4. Purchase and reserve paths for the right people

- `/lots/[id]` (available lot) now offers the office-assisted route explicitly:
  **Call 0917 617 8489** and **Ask the office to hold this lot** (the existing
  `/contact?item=…` request seam, with the lot's own number/section/block and
  published figure, and a note saying nothing is reserved). The honest line stays:
  online reservation is not available yet, so no button promises one.
- A non-available lot says its state and offers the call link rather than a dead end.

### 5. One vocabulary, one price

No amount, plan name or service name was retyped anywhere. The existing guards
(`tests/unit/price-surfacing.test.tsx`, `tests/fixture-contract/catalog-sources.test.ts`,
`tests/unit/pricing-admin-render.test.tsx`) stay green, and the new contact facts
are pinned by `tests/fixture-contract/landing.test.ts` to the paper letterhead.

## Evidence

Verification on this branch (rebased onto `origin/main` after the composition
pass #67, so both passes are in the tree): `npm run lint` ✓ · `npm run typecheck`
✓ · `npm test` (125 files, 1428 tests) ✓ · `npm run build` ✓. Render check with the
production build on `:3100` (Chrome via `chrome-devtools-axi`; `:3000` was held
by another lane's server, so this lane used its own port and stopped it after),
every shot taken on the rebased build:

| Shot | What it shows |
|---|---|
| `shots/home-1440-band.png` | home at 1440 — the band + footer with both lines/addresses |
| `shots/home-390-band.png` | home at 390 — stacked 44 px actions, call first |
| `shots/contact-1440-facts.png` | `/contact` at 1440 — facts panel before the form |
| `shots/contact-390-facts.png` | `/contact` at 390 — both numbers, both addresses, call-first |
| `shots/plans-1440-band.png` | `/plans` at 1440 — the same band closing the catalogue |
| `shots/package-1440-advisor.png` | `/plans/PKG-PREMIUM` — advisor `Call` link + band |
| `shots/package-1440-promo.png` | the same page — the masked poster (no baked-in placeholder number) |
| `shots/lot-detail-1440-hold.png` | `/lots/[id]` — call + "Ask the office to hold this lot" |
| `shots/lot-detail-390-hold.png` | `/lots/[id]` at 390 — the lot's facts, with the sticky `Call 24/7` in the first screenful |
| `shots/immediate-assistance-390.png` | F-01 exemption: call-first, no band |

## Files

| Area | Files |
|---|---|
| Band | `components/landing/next-steps.tsx` (new) · `components/ui/public-shell.tsx` · `components/landing/landing-view.tsx` |
| Contact model | `lib/api-client/landing.ts` · `lib/fixtures/landing/content.json` · `components/landing/landing-page-editor.tsx` |
| Contact surface | `app/(public)/contact/page.tsx` |
| Click-to-call fixes | `app/(public)/plans/[sku]/page.tsx` · `app/(public)/products/[sku]/page.tsx` · `app/(public)/lots/[id]/page.tsx` |
| Styles | `styles/components.css` (appended F-17 block; tokens only) |
| Poster fix | `public/media/plan-packages.png` (masked strip) · `public/media/composition/thumbs/plan-packages-{320,640}.webp` (re-derived) · `lib/media.ts` (provenance) |
| Tests | `tests/unit/journey-actions.test.tsx` (new) · `tests/fixture-contract/landing.test.ts` · `tests/unit/provisional-receipts.test.ts` |

Shared-file note: the composition pass (#67) landed while this branch was in
flight; it was rebased onto `origin/main` with **both sides kept** — the
auto-merge left the composition home intact and the F-17 band appended after the
anchored grid, the F-17 CSS block after the composition block in
`styles/components.css`, and every screenshot here regenerated on the combined
build. The accessibility pass touches the same files; the same rule applies: keep
both sides.
