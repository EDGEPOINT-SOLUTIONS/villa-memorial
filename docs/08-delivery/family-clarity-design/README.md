# Family portal clarity pass — 2026-10-02

> Captain's brief, 2026-10-02: *“family portal are still too wordy and confusing”*.
> This record is the audit, the cuts, and the measured before/after. It is a
> **clarity pass, not a removal pass** — every recorded fact, amount, date, name,
> link, form field and control stays.

## What changed

- **The reading budget was cut from 150 to 95 paragraph words per screen**
  (`tests/unit/family-reading-budget.test.tsx`), the longest paragraph from 25 to
  20 words, and a new hard rule was added: **no paragraph over two sentences**
  (`tests/helpers/prose.ts::sentencesOf`). The list budget fell 20 → 16 and the
  opening sentence 14 → 12. The guard also gained the Messages screen, which had
  never been measured, and which was rebuilt on the family grammar.
- **Every page now leads with the answer** — what is next, what is owed, what is
  waiting, who to call — and every explaining `dash-note` / `dash-state` was
  shortened to one short line or folded into a labelled row. Recorded data
  (amounts, references, dates, addresses, names) is untouched.
- **The Messages screen** moved off the generic `PageHeader` grammar onto the
  family kit (`Answer` + `DashPanel`) and lost two internal-sounding notes.
- **The reading controls** (`Your details`) lost their long descriptions — the
  title carries the meaning and the on/off state is beside it.
- Shared display copy that the family reads was shortened at its one home:
  `ownedPaperNote` and `FAMILY_RECEIPT_COPY_NOTE` (`lib/family/family-documents.ts`,
  `lib/contracts/official-receipt.ts`), the request-slip foot note
  (`lib/contracts/family-request-slip.ts`), `MEMORIAL_FIELD_CHOICES`
  (`lib/memorials.ts`) and `CHAT_TRANSPORT_NOTE` (`lib/chat.ts`).

Nothing was invented, and no recorded value was dropped. The service contract and
the receipts stay the family’s own; the office phone stays on every screen; every
“not connected yet” state keeps its honest line.

## Measured — open page (closed disclosures), 1440/390 render

Paragraph words are the guard’s unit (every `<p>` the family reads). “Words” is
the whole visible page.

| Screen | Words before → after | Paragraph words before → after | Paragraphs | Longest para before → after |
|---|---|---|---|---|
| Home (one loved one) | 517 → 498 | **103 → 84** | 21 → 21 | 12 → 11 |
| Home (everyone) | 157 → 144 | **105 → 92** | 24 → 24 | 12 → 12 |
| The funeral | 200 → 193 | **36 → 29** | 7 → 7 | 18 → 13 |
| Payments | 191 → 176 | **104 → 89** | 20 → 20 | 13 → 12 |
| Papers | 187 → 152 | **107 → 72** | 15 → 15 | 22 → 19 |
| Official receipt | 119 → 81 | **87 → 49** | 8 → 8 | 34 → 16 |
| Remembering | 216 → 196 | **52 → 44** | 8 → 8 | 11 → 9 |
| Help | 129 → 125 | **72 → 68** | 16 → 16 | 10 → 10 |
| Your details | 187 → 111 | **148 → 72** | 26 → 24 | 18 → 6 |
| Your plan | 110 → 92 | **53 → 35** | 10 → 10 | 12 → 7 |
| Your lot | 138 → 136 | **41 → 39** | 8 → 8 | 10 → 10 |
| Ask for a visit | 180 → 176 | **81 → 77** | 12 → 12 | 14 → 14 |
| Requests | 261 → 251 | **102 → 92** | 15 → 15 | 17 → 17 |
| Request slip | 146 → 130 | **59 → 43** | 6 → 6 | 25 → 15 |
| What we tell you about | 53 → 53 | **24 → 24** | 6 → 6 | 7 → 7 |
| Privacy Center | 26 → 26 | **12 → 12** | 2 → 2 | 10 → 10 |
| Your family | 177 → 164 | **106 → 93** | 24 → 24 | 10 → 8 |
| Messages | 78 → 53 | **72 → 41** | 7 → 7 | 23 → 12 |
| **Total (18 screens)** | **3072 → 2757** | **1364 → 1055 (−23%)** | 233 → 230 | 34 → 19 |

### Why the four data screens stop at 84–93 paragraph words

Payments, Request, Your family and Home render the family’s own record — every
instalment reference, amount, due date, request detail, address and name is a
`<p>` the guard counts. Those words **are** the recorded facts the brief says to
keep; the prose around them is now one line each. A lower number on those screens
would mean deleting a fact, which this pass deliberately does not do. The prose
that was there — the multi-sentence notes, the walls of explanation — was cut
hardest: `Your details` 148 → 72 (−51%), `Papers` 107 → 72 (−33%),
`Official receipt` 87 → 49 (−44%), `Messages` 72 → 41 (−43%), `Your plan`
53 → 35 (−34%), `Request slip` 59 → 43 (−27%).

Every paragraph on every screen is now **at most two sentences**, and the longest
paragraph the family reads on any screen fell from 34 words to 19.

### Merged after the amortization landing (2026-10-02)

This branch was rebased onto `e344619` ("the amortization view on the plan and
the lot") before landing. That change also touches four of these screens, so the
**after** figures above and their captures are at the clarity-pass head and
predate the amortization panels. Re-measured on the merged head (open page,
paragraph words): **Home 92 · Payments 90 · Your plan 36 · Your lot 55** — all
within the 95 budget. The amortization record carries those panels' own evidence
(`docs/08-delivery/family-amortization-design/`).

The only overlapping copy was `/client/plans`'s gap note. This pass had cut it to
“The instalment schedule and the plan certificate aren't connected yet. Call
{phone}.”; the amortization landing made the first half false. The merged line
keeps the short form without the stale claim: **“The plan certificate isn't
connected yet. Call {phone}.”**

## Evidence (screenshots)

Captures at **1440×900** and **390×844**, before and after, for all eighteen
screens (Home is captured both as one loved one and as the “everyone” household):

```
docs/08-delivery/family-clarity-design/shots/before/<screen>-<width>.png
docs/08-delivery/family-clarity-design/shots/after/<screen>-<width>.png
```

Screens: `dashboard`, `dashboard-everyone`, `cases`, `payments`, `documents`,
`receipt`, `memorials`, `support`, `profile`, `plans`, `property`,
`appointments`, `requests`, `requests-slip`, `notifications`, `privacy`,
`family`, `messages`.

## Validation

- `npm run lint` — 0 errors.
- `npm run typecheck` — clean.
- `tests/unit/reading-budget` helper change is additive (`sentencesOf`,
  `longestSentences`); the public budget is untouched.
- `npm test` — full suite green (announced in the delivery line).
- `npm run build` — production build passes.

## Files touched

- Pages: every route under `app/(family)/client/` (`dashboard`, `cases`,
  `payments`, `documents` + `receipts/[reference]`, `memorials`, `support`,
  `profile`, `plans`, `property`, `appointments`, `requests` + `slip`,
  `notifications`, `privacy`, `family`, `messages`).
- Family components: `family-ui`, `family-household-ui`,
  `family-reading-preferences`, `family-visit-calendar`, `family-visit-request`,
  `family-request-composer`, `memorial-visibility`.
- Shared copy modules: `lib/family/family-documents.ts`,
  `lib/contracts/official-receipt.ts`, `lib/contracts/family-request-slip.ts`,
  `lib/memorials.ts`, `lib/chat.ts`.
- Guards: `tests/unit/family-reading-budget.test.tsx`, `tests/helpers/prose.ts`.

## Follow-up

The family portal still waits on the same contracts it did — no messaging
service, no family-facing scheduling write, no lot/ownership projection, no
memorial content service. Those are named in `docs/08-delivery/open-items.md`;
this pass did not change a single one of them.
