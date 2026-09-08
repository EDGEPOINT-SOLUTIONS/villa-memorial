# Client-to-SaaS Requirements Mapping

## Methodology (master prompt §27 document-analysis protocol)
1. Read and catalog every document · 2. Extract explicit + implicit requirements ·
3. Map current-state processes · 4. Identify actors/roles/entities/workflows/services/transactions/
documents/reports/rules · 5. Identify pain points · 6. Classify industry-common / configurable /
optional / client-specific · 7. Find generalization opportunities · 8. Find contradictions between
documents · 9. Find missing requirements · 10. Produce this mapping BEFORE building, with columns:
Client Requirement | SaaS Capability | Classification | Configuration Required | Core/Module | Notes.

Classification key: **CORE** = core SaaS · **CFG** = configurable capability · **MOD** = optional module ·
**INT** = integration · **CLI** = client-specific customization · **FUT** = future roadmap

| # | Villa requirement (source) | SaaS capability | Class | Notes |
|---|---|---|---|---|
| 1 | Funeral service contract w/ deductions (Service Contract 2025) | Contracts + billing + payment allocation; guarantee-instrument sub-ledger | CORE+CFG | Deduction categories (LGU/DSWD/SSS/GSIS/life plan) as configurable deduction types |
| 2 | Co-maker joint & several liability | Contract party roles (client, co-maker) | CFG | Generalize to multiple obligors |
| 3 | 9-day due date, 3-day instrument submission, 10%/mo interest | Rules engine: due dates, grace, penalty rates | CFG | Never hard-code rates; effective-date versioning |
| 4 | SPA for claims processing/encashment | Document templates + e-signature workflow | MOD | Legal validation required |
| 5 | Lot classifications (mausoleum, garden niche, lawn lots, condo-type) | Lot type catalog | CFG | Names differ 2025 vs 2026 — tenant data, not schema |
| 6 | MCF / Maintenance Care Fund | Fee component on property transactions + fund accounting line | CFG+INT | Endowed-fund accounting nuance → accounting integration |
| 7 | 4%/mo default penalty, 60-day cancellation, forfeiture schedule | Property contract lifecycle state machine + rules engine | CORE+CFG | 2025 refundable vs 2026 no-refund = rule versions |
| 8 | "Right for interment purposes only" conveyance | Ownership/rights model with legal-mode config | CLI→CFG | Terminology per tenant legal model; validate w/ counsel |
| 9 | No interment unless fully paid (+ exception clause) | Interment workflow verification gates (ownership+payment checks) | CORE | Gate is core; exception handling configurable policy |
| 10 | Deed of Sale + Certificate of Ownership issuance | Document generation triggered by full-payment event | CORE+MOD | |
| 11 | Lot transfer/assignment w/ written consent + fees | Ownership transfer workflow (request→verify→approve→update) | CORE | |
| 12 | Exchange/substitute lot within 30 days | Lot exchange workflow | MOD | Rare; keep configurable window |
| 13 | Provisional receipt → official receipt confirmation | Payment reconciliation workflow | CORE | OR chain, idempotent payments |
| 14 | Purchase application form fields (TIN, SSS/GSIS, Facebook, employer, beneficiaries) | Customer master + custom field sets | CFG | Facebook account = PH-specific contact channel pattern |
| 15 | DPA consent clauses | ConsentRecord entity + privacy center | CORE | PH Data Privacy Act compliance |
| 16 | Eternal Plans COC / Villa Memorial Plan (micro pre-need) | Pre-need module + insurance partner integration | MOD+INT | Network mortuaries, 70% unrendered benefit, 1-yr term coverage tracking |
| 17 | Government burial guarantees claims (LGU/DSWD/SSS/GSIS) | Claims tracking + document submission checklist | MOD | Ties to deduction sub-ledger |
| 18 | GIS-enabled lot map dashboard w/ client profiles (client addendum) | Memorial Property & GIS module | MOD | Flagship differentiator |
| 19 | Agents & commission/incentive arrangements | Agent & Commission engine (rules-based) | MOD | Rates fully tenant-configurable |
| 20 | E-wake/e-lamay & future trends | Digital Memorial / E-Wake module + culture module | MOD | See `06-cultural-digital-memorial/` |
| 21 | Independent service sales (embalming-only, chapel-only, etc.) | Catalog classes + unified mixed cart | CORE | Blueprint non-negotiable commercial model |
| 22 | Multi-branch expansion ambition | Branch entity + branch-scoped data/pricing | CORE(design) | Single-branch deploy initially |
| 23 | Memoria ERP infographic expectations (payroll, HR, accounting) | Accounting integration now; payroll/HR out-of-scope → roadmap | INT+FUT | Do not build payroll into core funeral platform |

## Gaps / contradictions found in corpus
1. **2025 vs 2026 purchase agreements** materially diverge on refunds/cancellation and lot-class lists — needs explicit effective-dating.
2. **Activity tracker xlsx is empty** — no operational baseline data available from it.
3. **Payroll/HR appear only in marketing image**, not blueprint scope — confirm exclusion.
4. **Pre-need underwritten by third party** (Eternal Plans): platform tracks plans/COCs but does not act as pre-need insurer; regulatory boundary to confirm.
