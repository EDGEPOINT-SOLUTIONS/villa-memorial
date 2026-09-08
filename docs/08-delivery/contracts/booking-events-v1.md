# Frozen cross-track contract — KEB-D3-03
# `booking.confirmed` v1 + scheduling-resources API v1 — producer: scheduling-resources · consumers: web (H/schedule)

## Status
**FROZEN as of Fri Aug 29** (Day 3 freeze, delivered late — see retro). Envelope v1 wraps the
payload. Bump `schema_version` on breaking change.

## Position in the event chain
Consumes `case.stage_changed` v1 (KEB-D3-02). When `previous_stage == null` (case just created)
the service auto-books the default chapel for that case and emits `booking.confirmed`.

## Resources
A resource is anything bookable. v1 seeds three types; the type is an open string so VM can add
their own without a migration.

| `resource_type` | Seeded examples |
|---|---|
| `chapel` | Chapel A, Chapel B |
| `preparation_room` | Preparation Room 1 |
| `vehicle` | Hearse 1 |

## Auto-booking rule (v1)
Deterministic so the demo is repeatable:
- Resource: first `chapel` for the tenant, ordered by name.
- Window: **the day after the case is created, 09:00–17:00 UTC**.
- Status: `confirmed`.

## Conflict handling — cut line #3 invoked
Overlapping bookings on the same resource are **detected and flagged, not blocked**. Each booking
carries `conflicting` (boolean) computed at write time against confirmed bookings on the same
resource. The calendar displays conflicts for manual vigilance. Auto-conflict *blocking* is
deferred to Phase 2 per the pre-agreed cut line — this is a deliberate scope decision, not a bug.

## REST API v1
JWT required; tenant from claims only. Error shape `{ "error": "..." }`.

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/api/v1/resources` | `scheduling:read` | `{ "items": [Resource] }` |
| GET | `/api/v1/bookings` | `scheduling:read` | Filters: `resource_id`, `from`, `to` (ISO8601 dates). `{ "items": [Booking] }` |
| POST | `/api/v1/bookings` | `scheduling:write` | Body `{ resource_id, case_number?, title, starts_at, ends_at }` → `booking.confirmed` |
| POST | `/api/v1/bookings/:id/cancel` | `scheduling:write` | Sets `status: cancelled`. Emits nothing in v1 |
| POST | `/api/v1/internal/events` | internal token | `case.stage_changed` inbox |

Through the edge gateway: `/scheduling/api/v1/...`.

### `Resource` resource
| Field | Type |
|---|---|
| `id` | uuid |
| `name` | string |
| `resource_type` | string |
| `capacity` | integer \| null |

### `Booking` resource
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `resource_id` | uuid | |
| `resource_name` | string | display snapshot |
| `case_number` | string \| null | null for ad-hoc bookings |
| `title` | string | display label |
| `starts_at` | ISO8601 UTC | |
| `ends_at` | ISO8601 UTC | |
| `status` | enum | `confirmed` \| `cancelled` |
| `conflicting` | boolean | overlaps another confirmed booking on the same resource |

## `booking.confirmed` payload (schema_version 1)
| Field | Type |
|---|---|
| `id` | uuid |
| `resource_id` | uuid |
| `resource_name` | string |
| `resource_type` | string |
| `case_number` | string \| null |
| `title` | string |
| `starts_at` | ISO8601 UTC |
| `ends_at` | ISO8601 UTC |
| `conflicting` | boolean |

## Consumer rules
1. Dedupe on `event_uuid`; apply idempotently.
2. Unknown `schema_version` → log loudly, skip, never crash.

## Deferred
- Auto-conflict blocking (cut line #3).
- Recurring bookings, resource maintenance windows, staff rostering against bookings.
- `booking.cancelled` event — cancellation is API-only in v1.
