# Finance, Billing & Collections

## Payments & billing (Villa blueprint §28)
Methods: cash · bank transfer · GCash · Maya · card · check · online payment · installment ·
financing where offered. **Payment gateway abstraction** so business logic is never tied to one provider.
Capabilities: confirmation · receipts · invoices · statements of account · automated payment schedules ·
due today/week/month views · overdue tracking · AR aging buckets (current, 1–30, 31–60, 61–90,
91–120, 120+) · collection efficiency · payment reminders · reservation fees · refund/cancellation
rules per policy · payment allocation to the correct contract/order/lot/service.

## Accounting integration (blueprint §32)
Chart of accounts · AR · AP · cash · bank · sales · collections · expenses · fixed assets · inventory ·
revenue recognition rules · general ledger · journal entries/lines. Every financial transaction maps
to accounting records with traceability back to order/contract/payment.

## Commissions (blueprint §34 + advanced-features doc)
Agent dashboard: leads · prospects · follow-ups · sales · plans sold · lots sold · service/product
sales · commission · collection · targets · conversion.
Commission engine (rules-based, configurable): agent registration/types · internal & external agents ·
territory assignment · performance tracking · lead assignment/referral tracking · attribution ·
commission rates (fixed %, ₱ fixed, tiered, volume, milestone, split, multi-agent) · approval ·
statements · payment tracking · clawbacks/reversals · cancelled-service handling · ranking analytics.

## Contract financial rules extracted from Villa forms
See `07-client-villa/current-state-forms.md`: penalty rates (4%/mo lot default, 10%/mo funeral
contract), grace periods, forfeiture matrices, deduction/guarantee instruments (LGU/DSWD/SSS/GSIS/
life plans), MCF fee component. All must be tenant-configurable rules with effective-date versioning.

## Deterministic-first rule
All financial calculations, allocations, schedules, and statuses are conventional application logic —
never AI (see `05-ai/ai-governance.md`).
