# Frozen cross-track contract — KEB-D4-01
# finance-billing list/read API v1 — producer: finance-billing · consumer: web (Module E)

## Status
**FROZEN as of Fri Aug 29.** Closes the gap that kept Module E's screens on fixtures while
the service was already serving live invoices: the two disagreed on field names, status
vocabulary, and whether a due date existed in the list at all.

## Why `due_at` was added
The collections screen needs, per row, whether an invoice is late and how late. Without a due
date in the list response that is one extra request per invoice. `due_at` is therefore part of
the list shape, and **both** the overdue flag and the aging bucket are derived from it by the
consumer — the service stores neither.

`due_at` = the earliest installment still carrying a balance. A fully paid invoice has none,
so it reports its **last** installment's date rather than null; consumers need a stable date to
age against and a null would force every one of them to special-case paid invoices.

## Endpoints
| Method | Path | Scope |
|---|---|---|
| GET | `/api/v1/invoices` | `billing:read` |
| GET | `/api/v1/invoices/:number` | `billing:read` — accepts `INV-…` **or** `ORD-…` |
| POST | `/api/v1/invoices/:number/payments` | `billing:write` |

Through the edge gateway: `/billing/api/v1/...`.

### List item (frozen)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `number` | string | `INV-YYYY-NNNNN`, capability token |
| `order_number` | string | display snapshot |
| `customer_name` | string | display snapshot |
| `total_cents` | integer >= 0 | centavos |
| `paid_cents` | integer >= 0 | centavos |
| `currency` | string | ISO 4217 |
| `status` | enum | `issued` \| `partially_paid` \| `paid` — **storage vocabulary** |
| `issued_at` | ISO8601 UTC | |
| `due_at` | ISO8601 date \| null | null only when an invoice has no installments at all |

`GET /:number` returns the same fields plus `order_id` and `installments[]`
(`seq`, `due_date`, `amount_cents`, `paid_cents`).

## Derived presentation vocabulary (consumer-side, frozen)
The service stores three statuses. Screens show four, because "overdue" is a function of time,
not a stored state — an invoice becomes overdue while nobody touches it. The mapping is frozen
here so every consumer derives it identically:

| Stored `status` | Displayed | Rule |
|---|---|---|
| `paid` | `paid` | always, regardless of dates |
| `partially_paid` | `partial` | **always — a part-paid invoice stays `partial` even when late.** Its lateness is carried by the aging bucket, not by the status |
| `issued` | `overdue` | when `due_at` is strictly before today |
| `issued` | `pending` | otherwise |

**Aging bucket**, by whole days past `due_at`:

| Days past due | Bucket |
|---|---|
| not yet due, or `paid` | `current` |
| 1–30 | `1-30` |
| 31–60 | `31-60` |
| 61–90 | `61-90` |
| 91–120 | `91-120` |
| > 120 | `120+` |

A `paid` invoice is always `current` — it is not owed, so it cannot be aged.

> These rules were reverse-engineered from the fixture set Gab shipped in PR #28 and match it
> on 7 of 8 records. `INV-2026-00003` is internally inconsistent (due 2026-05-15 is 106 days
> before the fixture's authoring date but is labelled `61-90`); it is a fixture slip, not a
> different rule. Fixture mode passes the stored bucket through unchanged so nothing shifts
> under the existing screens; live mode derives.

## Deferred
- `collections_this_month` — needs payment dates aggregated; the list carries no payment history.
- Pagination. The list is unbounded, which is fine at VM's volume today and is not a promise.
- Server-side status filtering; the screen filters the full list client-side.
