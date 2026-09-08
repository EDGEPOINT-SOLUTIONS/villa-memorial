# Frozen cross-track contract — KEB-D2-03
# Posting instruction schema v1 — owner: accounting ⓡ (generic ledger, ADR-005)

## Status
**FROZEN as of Tue Aug 25** (Day 2 EOD). Domain→ledger translation lives HERE (config),
never in ledger code — the ⓡ zero-domain-vocabulary rule applies.

## PostingRule record
| Field | Type | Notes |
|---|---|---|
| `tenant_id` | string | rules are per-tenant configuration |
| `event_type` | string | inbound envelope event_type, e.g. "payment.completed" |
| `schema_version` | integer | envelope version this rule understands |
| `debit_account_code` | string | chart-of-accounts code, e.g. "1000" |
| `credit_account_code` | string | e.g. "4000" |
| `active` | boolean | one active rule per (tenant, event_type, schema_version) |

## Posting semantics
Amount = `payload.amount_minor_units`. Entry: Dr debit_account / Cr credit_account,
balanced by construction. Idempotent via `source_event_uuid` unique index — one journal
entry per source event, ever. Duplicate deliveries are no-ops.

## Seeded chart of accounts (VM demo tenant)
1000 Cash & Bank (asset) · 1200 Accounts Receivable (asset) · 2000 Deferred Revenue
(liability) · 4000 Service Revenue (revenue) · 5000 Operating Expense (expense)

## Known limitations (documented)
v1 posts single-line pairs only; multi-leg allocations (MCF split, installment interest)
are Phase 2 via additional rules or a rules-v2 with allocation percentages.
