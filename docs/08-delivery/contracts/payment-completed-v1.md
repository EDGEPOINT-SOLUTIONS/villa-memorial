# Frozen cross-track contract — KEB-D2-02
# `payment.completed` v1 — producer: finance-billing · consumer: accounting ⓡ

## Status
**FROZEN as of Tue Aug 25** (Day 2 EOD). Emitted exactly once per invoice reaching
fully-paid state (not per partial payment).

## Payload (schema_version 1)
| Field | Type | Notes |
|---|---|---|
| `invoice_number` | string | INV-YYYY-NNNNN |
| `order_number` | string | ORD-YYYY-NNNNN (correlates to order.fulfilled) |
| `order_id` | string (uuid) | opaque ordering-service id |
| `amount_minor_units` | integer > 0 | final payment that closed the invoice |
| `currency` | string | ISO 4217, "PHP" |
| `method` | string | cash \| bank_transfer \| card \| gcash |
| `paid_at` | ISO8601 UTC |

## Consumer rules
Accounting posts per posting-rule config (`posting-instruction-v1.md`); events without an
active rule are ACKed-and-skipped loudly, never crash the producer's retry loop.

## Addendum (2026-08-29) — this event is NOT the per-payment one
`payment.completed` remains exactly as frozen above: once per invoice, at fully-paid, no
payer identity. A receipt for **every** payment — VM's actual counter workflow — is a
separate, additive `payment.recorded` v1 (issue #47), which also carries `payer_name`.
Nothing about this contract changes; the note exists so the next reader does not "fix" this
event by widening it.
