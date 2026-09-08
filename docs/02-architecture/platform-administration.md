# Platform Administration

## Status: classified 2026-02 (this file closes a spec gap)

The screen inventory (`04-modules/screen-inventory.md`) and module specs prescribe **no
platform-operator surface**: every screen there is tenant-scoped. "Tenant management" is named
CORE in `01-product/saas-strategy.md` but had no defined flow, and no tenant sign-up method was
prescribed. This document classifies both so implementation isn't discovered by coding.

## Classification

| Requirement | Class | Rationale |
|---|---|---|
| Platform admin panel (tenant list, provisioning status) | **Core SaaS** | Needed by every deployment; never customized. Analogous to auth/audit CORE items. |
| Self-service tenant sign-up | **Core SaaS** | Chosen acquisition method: low-touch onboarding for small funeral homes; consistent with CONFIGURE → IMPORT → TRAIN → GO LIVE onboarding sequence. |
| Platform admin identity | **Core SaaS** | Must be OUTSIDE the tenant hierarchy — a platform operator is not a user of any funeral business and must not inherit tenant RBAC. |
| Owner self-service workspace configuration (`/staff/settings`) | **Core SaaS** | The sign-up owner must be able to configure their own tenant account (profile, workspace display settings) without platform-operator involvement — required by CONFIGURE → IMPORT → TRAIN → GO LIVE onboarding. |
| Owner self-service subscription settings | **Core SaaS** (view + billing contact now; plan purchase deferred) | Owners see trial state and manage billing contact themselves. Plan selection/payment stays platform-side until SaaS subscription billing lands (see Deferred). |

## Decisions recorded

1. **Platform surface is not tenant-scoped.** Platform controllers opt out of `ResolvesTenant`
   (`skip_tenant_resolution!`). They live under `/platform` and never touch `Current.tenant`.
2. **Platform admins are a separate identity type** (`platform_admins` table), deliberately NOT
   rows in the tenant-scoped `users` table — cross-tenant privilege via a tenant row would violate
   the isolation requirements in `multi-tenancy.md`.
3. **Sign-up creates a tenant + its owner** in one transaction: `Tenant` (name + slug) and one
   `User` with role `owner`. The owner then configures the workspace per
   `configuration-engine.md` (CONFIGURE → IMPORT DATA → TRAIN USERS → GO LIVE).
8. **The tenant `owner` is a distinct RBAC rank above `admin`** (`customer < staff < admin < owner`).
   Exactly the account holder created at sign-up; only owners may configure the tenant account
   itself (workspace profile + subscription settings) at `/staff/settings`. Admins run operations;
   they do not own the account.
9. **Subscription settings today are deterministic bookkeeping, not billing:** the owner can set
   `tenants.billing_email` and see trial state (active/expired/cancelled, days remaining). Changes
   are recorded on the tenant's audit trail with the owner as actor. Paid plan selection, payment,
   and tenant-initiated cancellation remain deferred with SaaS subscription billing below.
4. **Deterministic core:** sign-up does only deterministic provisioning. No AI involvement.
5. First platform admin is bootstrapped via seeds/console (ENV-guarded), not public sign-up.
6. **New workspaces start on a 14-day free trial** (Core SaaS, billing framework): sign-up sets
   `tenants.trial_ends_on = signup + 14 days`. Fully deterministic — no AI, no manual step.
7. **Trial cancellation is platform-side only** for now: an operator cancels from
   `/platform` (recorded as an audit event on the tenant's trail with the PlatformAdmin as actor).
   Tenant-initiated cancellation and expiry enforcement (what stops working when the trial ends)
   are deferred until SaaS subscription billing lands — see Deferred below.

## Deferred (not built yet)

- SaaS subscription billing per tenant (`finance-billing.md` covers tenant-facing payments only).
  Until it lands, an ended/cancelled trial is informational only — nothing is switched off.
- Tenant suspend/delete lifecycle, custom domains, per-tenant usage metrics.
- Audit trail for platform actions (current `audit_events` requires `tenant_id`; needs schema work).
