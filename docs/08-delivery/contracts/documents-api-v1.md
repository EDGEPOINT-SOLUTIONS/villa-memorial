# Cross-track contract — KEB-D4-02
# documents ⓡ API v1 + `document.generated` v1 — producer: documents · consumers: web (J), future: notification

## Status
**FROZEN as of Sat Aug 29** — signed off by Keb on the CP-1 carryover branch. Envelope v1
wraps the event payload (`contracts/events/envelope.v1.schema.json`). Bump `schema_version`
on breaking change; never edit a shipped version. The response shape, both enums,
`document.generated` v1 and the two template keys below are now immutable in v1; the
Deferred list at the bottom is what a v2 conversation is about.

## Why this shape
The consumer already existed: `web/lib/api-client/documents.ts` shipped in PR #28 with a
`Document` TypeScript type driving the Module J repository screen. **This contract ratifies
that shape as-is** rather than forcing a screen rewrite — the same route lots and cases took.
Field names, nullability and both enums below are byte-identical to that type.

## Reusability (ADR-005)
documents is **ⓡ** — P5 in the reusable layer. Consequences, enforced by
`test/contract/reusable_layer_test.rb` rather than by review habit:

- No funeral vocabulary in code, columns, seeds, templates or API. A certificate template
  names a **subject** and a **reference**; the caller supplies "Pedro Santos" and
  "CASE-2026-0001".
- Seeds are generic (an agreement, a receipt, a certificate of service) — a burial permit or
  a death certificate would make the service funeral-specific.
- Domain wording enters exclusively through caller-supplied titles and template variables.

## Document type + status (frozen enums)
| `document_type` | Meaning |
|---|---|
| `receipt` | Proof of payment (generated from `payment.completed`) |
| `contract` | Agreement between tenant and client |
| `certificate` | Certificate of service rendered |
| `permit` | Externally issued permission |
| `authorization` | Client- or authority-signed authorisation |
| `other` | Anything else in the repository |

| `status` | Meaning |
|---|---|
| `uploaded` | Filed, not yet reviewed |
| `pending_review` | Awaiting verification |
| `verified` | Checked by staff |
| `approved` | Final; generated documents arrive here directly |
| `rejected` | Refused; kept for the audit trail |

Generated documents are `approved` on arrival: nobody uploaded them, and there is nothing to
verify — the service composed them from data it was given.

## Response shape (frozen)
```json
{
  "id": "uuid",
  "document_number": "DOC-2026-00001",
  "title": "Official Receipt — INV-2026-00001",
  "document_type": "receipt",
  "related_case_number": null,
  "related_order_number": "ORD-2026-00001",
  "status": "approved",
  "uploaded_by": "System (payment.completed)",
  "uploaded_at": "2026-08-29T11:52:54Z",
  "file_size_bytes": 678
}
```

- `document_number` — `DOC-YYYY-NNNNN`, per-tenant per-year sequence, row-locked.
  **Demo/seed rows use the out-of-band 9xxxx band** and never occupy a number generation
  will issue (retro item 9).
- `file_size_bytes` — the rendered artifact's real byte length, computed at read time. A row
  with no artifact (an upload stand-in) reports `0` rather than a decorative figure.
- `uploaded_by` — a person's name for filed documents; `System (payment.completed)` for
  event-generated ones; `Staff portal (<sub prefix>)` for manually generated ones. JWT claims
  v1 carries no display name, so the portal does not invent one.

## Endpoints
| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/api/v1/documents` | `documents:read` | Filters: `document_type`, `status`, `case_number`, `order_number`. Newest first. **Unpaginated in v1.** |
| GET | `/api/v1/documents/templates` | `documents:read` | Template catalogue + each one's required variables |
| POST | `/api/v1/documents/generate` | `documents:write` | `{ template, variables, related_case_number?, related_order_number? }` → 201 |
| GET | `/api/v1/documents/:id` | `documents:read` | Tenant-scoped; a foreign id is a 404, never a 403 |
| GET | `/api/v1/documents/:id/render` | `documents:read` | `text/html` artifact. No body → 404 |
| POST | `/api/v1/internal/events` | shared secret | Not reachable through the edge |

Through the gateway every path carries the `/documents/` route prefix, which the gateway
strips (ADR-004): `${BASE}/documents/api/v1/documents`.

## Templates (v1)
| Key | Produces | Required variables |
|---|---|---|
| `official_receipt` | `receipt` | `invoice_number`, `order_number`, `amount_minor_units`, `currency`, `method`, `paid_at` |
| `service_certificate` | `certificate` | `subject_name`, `reference`, `service_date` |
| `agreement` | `contract` | `agreement_title`, `reference`, `party_first`, `party_second`, `effective_date`, `terms_version` |

**Adding a template is additive** (no version bump), the same rule the RBAC vocabulary
follows. Renaming or removing one is breaking.

### `agreement` — a caller-driven contract

The one template whose *content* belongs to the caller. It renders parties, an optional
schedule of amounts, optional adjustments against them, optional totals, optional numbered
clauses and optional signature rules — and holds no opinion about what any of them say.
That is what keeps a contract renderable here without funeral vocabulary entering a ⓡ
service: Villa's wording lives in `web/lib/contracts/villa-terms.ts` and arrives as
variables.

| Optional variable | Shape | Renders |
|---|---|---|
| `party_third` (+ `*_role` for each party) | string | A third signatory row (a co-maker) |
| `particulars` | `[{label, value}]` | Captured form fields that are not amounts |
| `schedule` / `adjustments` / `totals` | `[{label, note?, amount_minor_units?}]` | Money rows; an entry with no amount prints an em dash, never `0.00` |
| `clauses` | `[string]` | A numbered terms list |
| `signatories` | `[{name, role}]` | Blank signature rules — v1 signs on paper |
| `notarial_note` | string | The notarial acknowledgement block |
| `*_title` for each section | string | Overrides that section's heading |

An omitted list omits its whole section, heading included. Every value is escaped like any
other interpolation, and a scalar sent where a list belongs renders nothing rather than
raising mid-document.

`terms_version` is **required**, not optional. A signed agreement keeps the terms revision
it was signed under for its whole life, so the revision is printed on the artifact rather
than inferred from its date — Villa's 2025 and 2026 papers differ on whether a cancelling
buyer is refunded at all.

Templates are **code**, not rows: wording on a legal artifact belongs in a reviewed PR, not an
`UPDATE`. Every interpolation is HTML-escaped; money is formatted from minor units and never
computed in a template.

## `document.generated` v1 (event)
Emitted in the same transaction as the document row. Payload:
`id · document_number · title · document_type · template_key · related_case_number ·
related_order_number · status · generated_at`. No consumer yet — notification ⓡ is the
expected first one ("your receipt is ready").

## Idempotency
Two independent guards, because at-least-once delivery is the design:
1. `processed_events` dedupes on `envelope.event_uuid`.
2. A unique index on `(tenant_id, template_key, related_order_number)` means a redelivered or
   replayed `payment.completed` cannot produce a second receipt even if the ledger is cleared.

## Deferred (do NOT implement without a decision)
- **Upload.** No object store; `POST /documents` with a file does not exist, and the screen's
  upload button stays disabled. This is the gap that keeps Module J partly fixture-shaped.
- **PDF.** v1 renders HTML; printing is the browser's job.
- **Per-installment receipts — DECIDED 2026-08-29, tracked in #47.** `payment.completed`
  fires once per invoice, at fully-paid; VM's counter issues a receipt for **every** payment.
  finance-billing will emit a new `payment.recorded` v1 per payment, carrying `payer_name`,
  and documents will receipt that. `payment.completed` v1 stays frozen and unchanged — the
  addition is a sibling event, not a version bump.
  **Implementation note:** the one-receipt-per-source unique index is
  `(tenant_id, template_key, related_order_number)`. Per-payment receipts require widening it
  to include the payment id, or the second installment's receipt is rejected by the database.
- **Payer identity on the receipt — DECIDED, same issue.** `payment.completed` v1 carries no
  payer, so the receipt renders "Issued to: —" today. `payer_name` rides on `payment.recorded`
  rather than forcing a v2 of the frozen event; `issued_to` becomes a required template
  variable once the producer supplies it.
- **Versioning, e-signature, per-document access control, retention.** Phase 2.
