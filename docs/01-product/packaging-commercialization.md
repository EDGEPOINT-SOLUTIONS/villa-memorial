# Packaging & Commercialization

## Proposed tiers
| Tier | Contents |
|---|---|
| **Core** | Essential funeral-home operations (CRM, cases, services, scheduling, facilities, documents, billing, payments) |
| **Professional** | Additional operational + commercial modules |
| **Enterprise** | Multi-branch, advanced analytics, integrations, advanced administration |
| **Optional modules** | Memorial Park, Crematorium, Pre-Need, Inventory, Fleet, Advanced CRM, AI, Advanced Analytics |

Pricing deliberately NOT finalized; first decide which capabilities are logically core/premium/
enterprise/add-on.

## Feature roadmap grouping (from advanced-features doc)
```
FUNERAL SERVICES SaaS
├── CORE FUNERAL OPERATIONS: CRM, Cases, Services, Scheduling, Facilities, Documents, Billing, Payments
├── PROPERTY & MEMORIAL: GIS, Memorial Parks, Lots, Cemetery, Mausoleum, Columbarium
├── SALES & COMMERCIAL: Agents, Leads, Referrals, Commissions, Incentives, Pre-Need
├── OPERATIONS: Embalming, Crematorium, Fleet, Inventory, Staff
├── DIGITAL FUNERAL: E-Wake, E-Lamay, Digital Memorial, Livestream, Guestbook, Family Portal
├── AI: Assistant, Search, Case Copilot, Documents, Analytics, Forecasting
└── PLATFORM: Multi-Tenancy, Configuration, Workflow Engine, Permissions, API, Integrations, Security
```

## Differentiators identified
GIS lot management ("click a lot on the map → full digital profile"), agent/commission engine,
e-wake/e-lamay digital memorials, Filipino cultural module, AI copilots. These give stronger product
identity than "another funeral-home ERP".

## Commercialization decision rule
For every design decision ask: *"Can this be deployed for another funeral company without modifying
the core code?"* Prioritize reusable functionality; one-off custom dev requires compelling
commercial reason.

## Productization strategy layers (cultural module doc)
1. Core SaaS architecture stays universal
2. Funeral-service modules make it industry-specific
3. Cultural modules make it locally relevant
4. Configuration makes it client-specific
5. AI makes it intelligent

## MVP prioritization scheme
MVP (minimum to run core business) → V1 → V2 → V3 (advanced AI/analytics/ecosystem). Score each
feature on: business value, complexity, reuse potential, revenue potential, differentiation,
dependency, risk.
