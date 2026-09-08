# Frozen cross-track contract — KEB-M0-05
# `order.fulfilled` v1 — producer: Track A (Keb) · consumer: Track B ops board (Jawi)

## Status
**FROZEN as of Mon Aug 24** for M0/M1. Reference implementation:
`app/services/events/order_fulfilled.rb` (+ tests locking the shape).
Contract changes require a PR reviewed by Jawi; bump `schema_version`, never edit in place.

## Purpose
When an order is paid, Track A publishes this event. Track B consumes it to create the
funeral case, chapel booking(s), and staff tasks/checklists (scenario H).

## Delivery mechanism
Persisted **outbox**: the `events` table (tenant-scoped, append-only). Consumers poll:

```ruby
Event.where(event_type: "order.fulfilled").order(:occurred_at, :id)
```

## Consumer rules
1. **Dedupe on `event_uuid`** (unique column). At-least-once delivery; apply idempotently.
2. Process events ordered by `occurred_at` within a tenant.
3. Ignore unknown `schema_version`s you don't understand — log loudly, skip, never crash.
4. Never mutate or delete rows — append-only by design.

## Payload (schema_version 1)
| Field | Type | Notes |
|---|---|---|
| `event_type` | string | always `"order.fulfilled"` |
| `schema_version` | integer | `1` |
| `occurred_at` | ISO8601 UTC | when payment completed |
| `order.id` | integer | orders.id |
| `order.number` | string | human-readable reference |
| `order.customer_id` | integer | customers.id |
| `order.customer_name` | string | display name snapshot |
| `order.currency` | string | ISO 4217, `"PHP"` |
| `order.total_cents` | integer >= 0 | grand total in centavos |
| `items[]` | array, >= 1 | purchased lines |
| `items[].catalog_item_id` | integer | catalog_items.id |
| `items[].item_type` | enum | `package` \| `service` \| `add_on` |
| `items[].sku` | string | stable catalog code |
| `items[].name` | string | display name snapshot |
| `items[].quantity` | integer > 0 | |
| `items[].unit_price_cents` | integer >= 0 | price at purchase time |

## Open items (do not block freeze)
- Chapel booking duration is not in v1; Jawi derives it from the booked item's SKU/rules.
  If a per-item `meta` object is needed, that's v2.
