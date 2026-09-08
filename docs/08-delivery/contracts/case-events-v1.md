# Frozen cross-track contract — KEB-D3-02
# `case.stage_changed` v1 + funeral-cases API v1 — producer: funeral-cases · consumers: scheduling-resources, web (H)

## Status
**FROZEN as of Fri Aug 29** (Day 3 freeze, delivered late — see retro). Envelope v1 wraps the
payload. Bump `schema_version` on breaking change; never edit a shipped version.

## Why this shape
`web/lib/api-client/operations.ts` shipped in PR #28 with a `Case` type driving the Module H ops
board. **This contract ratifies that shape as-is.** Field names, enum members and nullability are
byte-identical to that type.

## Naming: why `case.stage_changed`, not `case.stage.changed`
Issue #7 names this event `case.stage.changed`. That name is **not expressible** under envelope v1,
whose `event_type` is frozen to `{aggregate}.{action}` — pattern `^[a-z_]+\.[a-z_]+$`, enforced both
by `contracts/events/envelope.v1.schema.json` and by `Events::Envelope`, which raises on a
non-matching type. A three-segment name would require editing a shipped frozen schema, which
AGENTS.md rule 4 forbids outright.

The event is therefore frozen as **`case.stage_changed`**. Same semantics, same payload, one
underscore. Nothing consumed the old name — the service did not exist — so this costs nothing.

## Position in the event chain (scenario H)
```
commerce-ordering  --order.fulfilled-->  funeral-cases   (create case + tasks)
funeral-cases      --case.stage_changed-->  scheduling-resources  (create chapel booking)
scheduling-resources --booking.confirmed--> (web / future consumers)
```
`order.fulfilled` fans out to **both** finance-billing and funeral-cases. Delivery is at-least-once
per sink; the producing outbox marks a row published only after every sink has ACKed.

## Case creation from `order.fulfilled`
One case per fulfilled order, keyed on `source_event_uuid` (unique) — replays are no-ops.

| Case field | Derived from |
|---|---|
| `case_number` | `CASE-YYYY-NNNN`, per-tenant sequence |
| `deceased_name` | **`"Pending intake"`** — see Known gap below |
| `stage` | `inquiry` (first stage of the lifecycle) |
| `assigned_coordinator` | `"Unassigned"` |
| `linked_order_number` | `payload.number` |
| `services` | `payload.items[].name` for items of type `service` or `package` |
| `tasks` | generated from the stage template for `inquiry` (see below) |

**Known gap (deliberate, documented, demoable):** `order.fulfilled` v1 carries the *purchaser*, not
the deceased — the storefront checkout contract (KEB-M0-10) is frozen and has no deceased field.
A case therefore opens as `"Pending intake"` and staff set the real name via
`PATCH /api/v1/cases/:number`. Adding it to checkout is an M1 contract change requiring both
producer and consumer sign-off, not a CP-1 patch.

## Stage model (frozen enum, ordered)
`inquiry → retrieval → preparation → viewing → ceremony → interment → completed`

Forward moves to any later stage are allowed (stages can be skipped — not every case has a viewing).
Backward moves are allowed and audited: real operations correct mistakes. Every move emits
`case.stage_changed`.

### Task templates per stage
Advancing to a stage appends that stage's tasks if they are not already present (idempotent).

| Stage | Tasks seeded |
|---|---|
| `inquiry` | Confirm family contact details · Record deceased details |
| `retrieval` | Dispatch retrieval team · Confirm location details |
| `preparation` | Confirm embalming completion · Prepare preparation room |
| `viewing` | Set up viewing room · Coordinate family arrival |
| `ceremony` | Prepare ceremony program · Confirm officiant |
| `interment` | Confirm lot readiness · Schedule interment crew |
| `completed` | Return documents to family |

## REST API v1
All endpoints require a verified JWT; tenant from claims only. Error shape `{ "error": "..." }`.

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/api/v1/cases` | `cases:read` | Filters: `stage`. Returns `{ "items": [Case] }` |
| GET | `/api/v1/cases/:number` | `cases:read` | By `case_number` |
| PATCH | `/api/v1/cases/:number` | `cases:write` | Body: `deceased_name`, `assigned_coordinator` |
| POST | `/api/v1/cases/:number/stage` | `cases:write` | Body `{ "stage": <enum> }` → `case.stage_changed` |
| PATCH | `/api/v1/cases/:number/tasks/:id` | `cases:write` | Body `{ "status": pending\|in_progress\|done }` |
| POST | `/api/v1/internal/events` | internal token | `order.fulfilled` inbox |

Through the edge gateway: `/cases/api/v1/...`.

### `Case` resource (frozen)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `case_number` | string | `CASE-YYYY-NNNN`, unique per tenant |
| `deceased_name` | string | never null; `"Pending intake"` until staff set it |
| `stage` | enum | see stage model |
| `assigned_coordinator` | string | never null; `"Unassigned"` default |
| `linked_order_number` | string \| null | null for cases opened manually |
| `services` | string[] | display snapshot from the order |
| `created_at` | ISO8601 UTC | |
| `updated_at` | ISO8601 UTC | |
| `tasks` | array of `{ id, title, status }` | `status`: `pending` \| `in_progress` \| `done` |

> `tasks[].id` is **additive** to the type Gab shipped (which has `title` + `status` only). Extra
> object fields are ignored by the existing screens; the id is required to PATCH a single task.

## `case.stage_changed` payload (schema_version 1)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | case id |
| `case_number` | string | |
| `previous_stage` | enum \| null | **`null` means the case was just created** |
| `stage` | enum | stage after the change |
| `deceased_name` | string | snapshot |
| `assigned_coordinator` | string | snapshot |
| `linked_order_number` | string \| null | |
| `services` | string[] | snapshot |
| `changed_at` | ISO8601 UTC | |

There is deliberately **no `case.created` event**. Creation is `previous_stage: null`, which keeps
the frozen family to exactly the one event type this contract names. Consumers that act on creation
(scheduling-resources) branch on `previous_stage == null`.

## Consumer rules
1. Dedupe on `event_uuid`; apply idempotently.
2. Process ordered by `occurred_at` within a tenant.
3. Unknown `schema_version` → log loudly, skip, never crash.

## Deferred
- Deceased/intake record as a first-class entity (v1 is a name string on the case).
- Case creation from anything other than a fulfilled order.
- Task assignment to named staff — templates seed titles only; HR linkage is post-CP-1.

## Additive in v1 — counter-opened cases and intake (2026-08-30)

Two additions, neither of which changes a frozen field or event, so no version bump:

**`POST /api/v1/cases`** (`cases:write`) opens a case with no order in front of it.
Until now a case could only be born from `order.fulfilled`, which inverted Villa's actual
sequence — a family arrives with a death, staff write the contract, and payment falls due
nine days later. Requiring a completed checkout before anyone could write that contract is
not a workflow a funeral home can run. `linked_order_number` stays nullable and the
`order.fulfilled` path is untouched; an order may be linked afterwards.

Creation emits `case.stage_changed` with `previous_stage: null`, which this contract
already defines as "the case was just created". There is still deliberately **no**
`case.created` event, so no consumer changes.

**`intake` object on the Case shape**, additive and `null` until captured:

`date_of_death · deceased_date_of_birth · deceased_gender · deceased_civil_status ·
senior_citizen · client_name · client_address · client_contact · client_relationship ·
client_id_presented · client_id_number · co_maker_name · contract_date · completed_at`

This is the block Villa's Service Contract prints above the price list. Consumers that do
not know the field ignore it (tolerant reader), exactly as the shipped TypeScript already
ignores `tasks[].id`. `null` rather than `{}` when nothing is captured, so "no intake yet"
is distinguishable from "intake with empty answers".

`contract_date` is the date the counter wrote, not the row's `created_at` — a contract
signed Monday and keyed in Tuesday is due nine days from Monday.

**Where `client_*` belongs eventually.** On a customer record, not on the case. crm-families
does not exist (#39), so these live on the case, prefixed, and move when it does — a rename,
not a re-capture. `senior_citizen` carries a discount entitlement and is deliberately
printed on the contract only when claimed.
