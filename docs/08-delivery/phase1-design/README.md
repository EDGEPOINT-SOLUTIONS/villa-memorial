# Phase 1 — a family's quote request now reaches the office

> **Client minute, 2026-09-21, item 5.** *"Remove the displayed prices for funeral services.
> Replace the price information with a 'Request for Quote' option … Allow prospective clients to
> submit inquiries. Capture relevant information, such as: Client name · Contact details ·
> Requested funeral service · Preferred date (if applicable) · Additional requirements."*

Two thirds of that requirement were already done: no price is published, every service line carries
one Request-a-quote action, and the form captured all five facts. **The third part was not: a
submitted request never reached the funeral home.** This is the record of closing that.

---

## 1 · What was actually wrong

The form captured everything and then threw it away. Three independent facts, each verified before
any code was written:

1. **No route could receive it.** `app/api/**` held no inquiries, quotes, contact or lead handler.
   **NOT FOUND.**
2. **The form said so itself.** `components/public-forms/quote-form.tsx:95-97` told the visitor
   *"**Nothing was sent to a server**"*, because `captureDemoInquiry` wrote the request into
   `localStorage` under `vm.demo.inquiries.v1` (`lib/demo-inquiry-captures.ts`).
3. **Even on that device the office could not read it.** The staff board's columns were
   Reference · Person · Topic · Source · Assigned · Status · Received
   (`app/(staff)/staff/inquiries/inquiry-board.tsx:281-287`) — **no message column**. The intake
   composed the preferred date and the additional requirements into `message`
   (`lib/demo-inquiry-captures.ts:130-132`) and nothing ever rendered them, so the office could see
   only *which* service was asked about.

**The contact form had the identical defect** (`contact-form.tsx:76`) — so a family's message to the
office was lost the same way.

For a funeral home this is not a UI defect. It is a lost customer at the worst possible moment.

## 2 · The change

**One write path, on the server, durable, and the office reads it.**

| Piece | What it is |
|---|---|
| `lib/inquiry-intake.ts` **(new)** | Pure. Reads a posted submission field by field and composes the row. Reuses the existing public-forms validators, so the sentence a family sees in the browser and the sentence the server refuses with cannot drift. Three kinds: `quote` · `contact` · `log` (the counter's own call/walk-in row). |
| `lib/api-client/inquiry-store.ts` **(new)** | The durable journal — the same pattern as `provisional-receipts-store.ts`: append-only, temp file + `fsync` + `rename`, one in-process write chain, `INQUIRIES_STORE_PATH` or `.data/crm-inquiries.json`. Mints the id and the next `INQ-2026-NNNNN` reference. |
| `app/api/inquiries/route.ts` **(new)** | `POST`, **public** — a family asking for a quotation has no session. The handler stays rules-free: it reads the body, asks `readInquirySubmission` for a verdict, maps `ApiError` to its status. Live mode answers the named `CRM_NOT_WIRED` 503. |
| `lib/api-client/crm.ts` | `listInquiries()` now folds the journal; `/staff/inquiries` reads the store instead of the bare fixture. |
| `quote-form.tsx` · `contact-form.tsx` | POST to the route. The confirmations now say the request **reached the office** and name the reference; a refusal shows the server's own sentence and a failed send tells the family to call. |
| `inquiry-board.tsx` | Drops the localStorage merge; **renders the request's own words** under its topic; the counter's log form posts to the same route instead of a browser note. |
| `lib/demo-inquiry-captures.ts` | **Deleted.** Nothing referenced it once both forms and the board moved. |

**The record shape is deliberately NOT invented.** Rows are the existing `Inquiry` type the board
and its fixture already use — no contract field was added. The preferred date and the requirements
travel inside the row's own `message`, which the board now prints. Making them structured columns is
a crm-families contract question, recorded as open in §5 rather than assumed here.

## 3 · Evidence

### The journey, end to end, in a real browser (`scripts/design-audit/phase1-e2e.mjs`)

```
=== 1 · the family submits /quote ===
  POST /api/inquiries -> HTTP 201
  confirmation claims the office has it : true
  still claims nothing was sent          : false   (want false)
  reference shown to the family          : INQ-2026-00043

=== 2 · the office's store on disk ===
  .data/crm-inquiries.json exists : true
  contains this submission : true

=== 3 · the office opens its Inquiries board ===
  sign-in -> HTTP 200
  GET /staff/inquiries -> HTTP 200
  the board shows this family's name   : true
  the board shows the PREFERRED DATE   : true
  the board shows the REQUIREMENTS     : true

PASS — a family's quote request reached the office's board, with its date and requirements.
```

Section 3 is the part that could not have passed before: it signs in as **staff**, in a **separate
browser context**, and reads the request on the server-rendered board. Screenshot:
`docs/08-delivery/phase1-design/inquiries-board.png`.

### The gate

| Check | Result |
|---|---|
| `lint` / `typecheck` | clean |
| `npm test` | **230 files, 2,669 tests pass** (was 228 / 2,653 — +2 files, +16 tests) |
| `npm run build` / `smoke` | clean · **61 of 61 routes render** |
| Design audit, 208 routes × 2 viewports | **0 failed · 0 overflow · 0 sub-12px · 0 multiple/missing `h1` · 0 missing `alt`** · 18 contrast flags, all on gradient/photo surfaces |

### New tests

- **`tests/unit/inquiry-store.test.ts`** — the round trip, the reference allocation, the two facts
  surviving into the row, and **the restart test**: the row is asserted to be physically in the
  store file in the documented shape, which is what "a fresh process still finds it" means. Plus a
  corrupt journal being a 500 rather than a silent fall-back to seed.
- **`tests/unit/inquiries-route.test.ts`** — 201 with a reader-visible row, 422 with field errors
  that write **nothing**, 400 for a nameless form and for non-JSON, and the named 503 in live mode
  with the assertion that nothing was filed locally.
- **`tests/unit/public-forms.test.ts`** — the old localStorage test replaced by the intake's
  accept/refuse behaviour, including that the date and requirements are composed into the row.

## 4 · A gap the suite caught, which is worth recording

Adding a store means adding its env var to `tests/setup.ts`, which points every journal at a
throwaway temp dir so a developer's real `.data/` store can never leak into a test. I missed it, and
`tests/fixture-contract/crm.test.ts` failed with **`expected 4 to be 3`** — because `listInquiries()`
folded the store and a genuine enquiry I had just submitted through `/quote` counted as a fourth row.

That is the test doing precisely its job. `INQUIRIES_STORE_PATH` is now in the list, with a comment
naming this incident, and the dev store's e2e row was removed.

## 5 · Open, and honestly not fixed here

1. **The preferred date and the requirements are prose inside `message`, not columns.** The office
   can read them; it cannot yet sort or report on them. That needs the crm-families contract, and
   today the app authors no field it was not given.
2. **`/appointments` still captures to the browser.** It has the same shape of defect as `/quote`
   did (the coverage note already marks it "real capture, nothing sent"). It needs the scheduling
   write contract's shape, so it was left alone rather than guessed at.
3. **There is still no status write.** An enquiry can be recorded and read; a coordinator cannot yet
   move it `new → contacted → converted`. The board's own row is honest about that.
4. **Live mode has no branch.** `CRM_BASE_URL` answers a named 503. When the crm-families contract
   freezes, the live write goes behind the same gate with no screen change — the intended seam.
5. **The two service-price leaks the audit found remain**: `/builder` still prints per-line service
   amounts, and `/plans/[sku]` can render a service SKU with Add to cart. The minute says remove the
   published prices; that is a captain decision about two surfaces the minute does not name, so it is
   flagged rather than changed.
