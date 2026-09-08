# AGENTS.md — 07 Client: Villa Memorial

## Scope
The first tenant's actual world: who they are, their legal forms and business rules extracted from
source documents, the mapping from client requirements onto the generic SaaS, and open decisions that
only Villa management/legal/accounting can settle.

## Key facts captured here
- Entities: **AA Villa Memorial Park Development Service** (developer of *Sanctuario de Mercedes y
  Gloria* memorial park, Purok 3, Begang, Isabela City, Basilan), **Funeraria Villa** (funeral home,
  Aguada, Isabela City), office at Capilla de San Jose Bldg., Sunrise, Isabela City. President:
  Armando A. Villa. Partner: **Villa Agency Insurance Services** w/ Eternal Plans, Inc. (Micro Pre-Need).
- Benchmark used for public-site patterns: St. Peter "Traditional Life Plan" experience (functional
  benchmark only — no copying of branding/content/assets).
- Legal forms digitized: Service Contract (2025), Purchase Agreement (2025 + revised 2026 with
  materially different refund terms), Purchase Application Form (+2026 combined application+agreement),
  Provisional Receipt, Villa Memorial Plan membership/COC (Eternal Plans).

## Files
- `client-profile.md` — organization, entities, partner ecosystem
- `current-state-forms.md` — extracted fields & business rules from each paper form
- `client-to-saas-mapping.md` — requirement → SaaS capability classification table
- `open-questions.md` — business decisions pending Villa confirmation

## Agent guidance
Treat contract terms (penalty rates, forfeiture rules, refund differences between 2025/2026) as
tenant-configurable business rules, never hard-coded constants. Note the 2025 vs 2026 agreement
divergence explicitly in any pricing/refund rule design.
