# Multi-Tenancy

## Deployment profiles (ratified 2026-08-24, see [`adr-006-vm-dedicated-deployment.md`](adr-006-vm-dedicated-deployment.md))

One codebase, two profiles:

| Profile | Tenancy | Hosted | Change policy |
|---|---|---|---|
| **SaaS** | Multi-tenant pool | Cloud | Continuous evolution on main |
| **Dedicated (Villa Memoria)** | Exactly one tenant, provisioned at install | Client's own server | Frozen to IMSMS modules A–J; pinned releases; patches only unless opted in |

No code forks: divergence is version pinning + configuration (module flags) only. Single-tenant
mode exercises the full tenant machinery with one provisioned tenant — it is a CI target from
Wave 0, not an afterthought.

## Definition
One software system serves multiple separate businesses (tenants) while keeping each business's data,
users, settings, and operations separate and secure.

## Model
```
FUNERAL SERVICES SaaS
        │
  ┌─────┼──────┐
TENANT A  TENANT B  TENANT C
  │         │         │
Branches, Users, Cases, Services, Customers — isolated per tenant
```
Analogy used in source: Microsoft 365 — one platform, per-org users/files/settings/permissions/data.

## Tenancy hierarchy (beyond tenant→users)
```
SAAS PLATFORM
 ├── TENANT A: Head Office, Branch 1..n, Chapel A, Memorial Park
 ├── TENANT B: Head Office, Branch 1..2
 └── TENANT C: Corporation, Subsidiaries, 20 Branches, 5 Memorial Parks
```
Entities supporting this: Organization, Tenant, Business Unit, Branch, Facility, Legal Entity.

## Per-tenant configuration matrix (example from source)
| Capability | Company A | Company B | Company C |
|---|---|---|---|
| Funeral home / chapel / embalming | ✓ | ✓ | ✓ |
| Crematorium | — | ✓ | ✓ |
| Memorial lots | — | ✓ | ✓ |
| Pre-need | — | ✓ | ✓ |
| Fleet | ✓ | — | ✓ |
| Inventory / AI / branding / workflows / pricing | ✓ | ✓ | ✓ |

## Isolation requirements
- Prevent tenant data leakage absolutely.
- Tenant isolation, authN/authZ, RBAC, org hierarchy, branch-level access, facility-level access.
- Audit logs, security controls, encryption, backup/recovery, retention, logging, monitoring.
- Tenant-specific: configuration, pricing, workflows, document templates, branding, reports,
  business rules, integrations, AI settings.
- Scale range to support: one home → regional group → national org → multi-brand/multi-subsidiary.
