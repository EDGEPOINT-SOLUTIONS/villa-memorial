# Frozen cross-track contract — KEB-D3-01
# `lot.*` event family v1 + property-gis API v1 — producer: property-gis · consumers: web (D), finance-billing (future)

## Status
**FROZEN as of Fri Aug 29** (Day 3 freeze, delivered late — see retro). Envelope v1 wraps all
payloads (`contracts/events/envelope.v1.schema.json`). Bump `schema_version` on breaking change;
never edit a shipped version.

## Why this shape
The consumer already exists: `web/lib/api-client/property.ts` shipped in PR #28 with a `Lot`
TypeScript type driving the Module D screens. **This contract ratifies that shape as-is** rather
than forcing a screen rewrite. Field names, enum members and nullability below are byte-identical
to that type.

## Hierarchy
`park → section → block → lot`. v1 exposes `section` and `block` as denormalised string labels on
the lot record (the grid groups by them); the park is implicit — VM is a single-park tenant. Multi-park
addressing is a v2 concern and needs a new `park` field, hence a version bump.

## Lot status model (frozen enum)
| Status | Meaning | Reachable from |
|---|---|---|
| `available` | Sellable, unheld | initial · `reserved` (release) |
| `reserved` | Held for a named party, not yet paid | `available` |
| `sold` | Paid, ownership recorded, no interment yet | `reserved` |
| `occupied` | Interment recorded against the lot | `sold` |
| `for_transfer` | Ownership transfer in progress | `sold` · `occupied` |
| `on_hold` | Administrative hold (dispute, documentation) | any |
| `maintenance_hold` | Physically unavailable (works, subsidence) | any |

Transitions outside this table are rejected `422 { "error": "..." }`. `occupied`, `for_transfer`
and the two holds are **status-only in v1** — no interment or transfer workflow ships at CP-1
(see Deferred).

## REST API v1
All endpoints require a verified JWT; tenant comes from claims only. Error shape is the frozen
platform shape: non-2xx is always `{ "error": "..." }`.

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/api/v1/lots` | `property:read` | Grid. Filters: `section`, `block`, `status`, `type`. Returns `{ "items": [Lot] }` |
| GET | `/api/v1/lots/:id` | `property:read` | Single lot |
| POST | `/api/v1/lots/:id/reserve` | `property:write` | Body `{ "owner_name": string }` → `lot.reserved` |
| POST | `/api/v1/lots/:id/release` | `property:write` | No body → `lot.released` |
| POST | `/api/v1/lots/:id/sell` | `property:write` | Body `{ "owner_name": string, "order_number": string? }` → `lot.sold` |

Through the edge gateway these are `/property/api/v1/...` (prefix stripped upstream).

### `Lot` resource (frozen)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | stable identifier |
| `lot_number` | string | display label, unique per tenant, e.g. `A-001` |
| `section` | string | grid grouping label |
| `block` | string | grid grouping label |
| `type` | enum | `individual` \| `family` \| `estate` |
| `status` | enum | see status model above |
| `area_sqm` | number | decimal, square metres — **not money**, decimal is correct here |
| `price_cents` | integer >= 0 | centavos (money rule: integer minor units only) |
| `currency` | string | ISO 4217, `"PHP"` |
| `owner_name` | string \| null | set on reserve/sell, cleared on release |
| `reserved_at` | ISO8601 UTC \| null | |
| `sold_at` | ISO8601 UTC \| null | |

## Events (schema_version 1)
All three share one payload shape, so consumers can handle the family with one branch.

### `lot.reserved` · `lot.released` · `lot.sold`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | lot id |
| `lot_number` | string | display snapshot |
| `section` | string | |
| `block` | string | |
| `previous_status` | enum | status before the transition |
| `status` | enum | status after the transition |
| `owner_name` | string \| null | null on `lot.released` |
| `price_cents` | integer >= 0 | snapshot at transition time |
| `currency` | string | ISO 4217 |
| `order_number` | string \| null | set on `lot.sold` when the sale came from an order |

## Consumer rules
1. **Dedupe on `event_uuid`** — at-least-once delivery; apply idempotently.
2. Process ordered by `occurred_at` within a tenant.
3. Unknown `schema_version` → log loudly, skip, never crash.
4. Append-only: never mutate or delete event rows.

## Deferred (explicitly NOT in v1 — do not half-wire)
- **Lot-as-order-line**: buying a lot through storefront checkout. `POST /sell` accepts an
  `order_number` for provenance, but nothing reconciles it against commerce-ordering. Scenario F
  ends at "reserve → sell → ownership recorded"; the reserve-and-pay button in the web UI stays
  unwired until M1. Tracked as issue #8.
- **GeoJSON / map interactivity** — cut line #1 and #5, invoked. JSON grid only.
- **Interment and transfer workflows** — statuses exist, workflows do not.
