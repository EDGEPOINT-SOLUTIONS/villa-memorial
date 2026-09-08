# Frozen cross-track contract — KEB-D2-01
# `order.*` event family v1 — producer: commerce-ordering · consumers: finance-billing, ops

## Status
**FROZEN as of Tue Aug 25** (Day 2 EOD). Envelope v1 wraps all payloads
(`contracts/events/envelope.v1.schema.json`). Bump `schema_version` on breaking change.

## `order.fulfilled` v1
See [`order-fulfilled-event.md`](order-fulfilled-event.md) — payload per that doc,
with ONE ratified amendment from implementation: `customer_id` is the integer id of the
customer record upserted by email inside commerce-ordering (frozen checkout contract
§POST /orders mandates the upsert; CRM module A screens consume it later).

## `order.placed` v1 (reserved)
Emitted when checkout completes WITHOUT synchronous payment success (M1 gateway flows).
Payload identical to fulfilled minus nothing; consumers must tolerate its absence in M0 —
the M0 sandbox adapter always pays synchronously, so only `fulfilled` fires today.

## Delivery
Outbox publisher POSTs envelope JSON to EVENTS_SINK_URL with `X-Internal-Token`
(shared secret, constant-time compare). Consumers ACK 2xx only after durable processing;
handler failure removes the dedupe marker so delivery retries (at-least-once).
