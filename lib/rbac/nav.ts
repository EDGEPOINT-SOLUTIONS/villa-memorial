/**
 * Admin Portal navigation, gated by JWT scopes (jwt-claims-v1:
 * `scopes: [{module}:{action}]`). Nav gating is UX only — authorization is
 * enforced at service boundaries regardless of what renders here.
 *
 * REVISIONED 2026-10-02 (the admin portal plan, wave 1). The groups are now
 * named by the question the admin is asking — Today · Families & inquiries ·
 * Orders & commerce · Pages & content · Park & services · Finance · Settings &
 * admin — and Today leads. Every route that existed before still exists; the
 * changes are group names/order, four renames (Customers→Families,
 * Catalog→Products, Schedule→Schedule & chapel, and Reports moved from Overview
 * into Finance beside the money it reads) and one new destination, Calendar.
 * The plan's brand-new admin screens (Inbox, Media library, Memorials admin,
 * Preparation list) land in wave 2; none is added here as a dead link.
 *
 * Scope semantics: an item is visible when the session holds AT LEAST ONE of
 * its required scopes. Scope reuse is provisional (commented) until each
 * module's contract freezes its own codes.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Any-of: visible if the session holds at least one of these scopes. */
  scopes: string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const STAFF_NAV: NavSection[] = [
  {
    label: "Today",
    items: [
      { href: "/staff/dashboard", label: "Dashboard", scopes: [] },
      // The unified calendar (admin plan wave 1). It reads the scheduling,
      // dispatch, burial, billing and work-order stores, so the scheduling
      // scope is the one it needs; the page prints what it could not read.
      { href: "/staff/calendar", label: "Calendar", scopes: ["scheduling:read"] },
      // No frozen notification scope yet — reuses cases:read provisionally (same
      // precedent as Relationships) until the notification contract brings its scope.
      { href: "/staff/notifications", label: "Notifications", scopes: ["cases:read"] },
      // AI Copilot (PRD S29) — the DESIGNED surface only: no model provider is
      // configured and the governance contract that would attach one is an open client
      // question (lib/copilot.ts carries the boundary; the screen prints it). Provisional
      // scope: rbac-scopes-v1 names no ai:* code and the capability belongs to the
      // platform's ai-orchestration service, so this reuses cases:read — every answer the
      // page gives is a statement about case records. The chapel calendar inside it needs
      // scheduling:read on top, and the page says so when a reader lacks it.
      { href: "/staff/copilot", label: "AI Copilot", scopes: ["cases:read"] },
    ],
  },
  {
    label: "Families & inquiries",
    items: [
      // NOTE: permission codes are provisional until the crm-families contract
      // freezes its own RBAC entries; reusing cases:* avoids inventing scopes.
      { href: "/staff/customers", label: "Families", scopes: ["cases:read"] },
      { href: "/staff/inquiries", label: "Inquiries", scopes: ["cases:read"] },
      { href: "/staff/pipeline", label: "Sales pipeline", scopes: ["cases:read"] },
      // Membership application folio (F-18 / FORMS_PLAN gap 4). Provisional scope:
      // rbac-scopes-v1 names no membership/plan-holder code, so this reuses the
      // Commerce plans' catalog:write until a plans:*/memberships:* scope freezes
      // (the page says so). Never invent a token the guard cannot match.
      { href: "/staff/plans/membership", label: "Memberships", scopes: ["catalog:write"] },
    ],
  },
  {
    label: "Orders & commerce",
    items: [
      { href: "/staff/orders", label: "Orders", scopes: ["orders:read"] },
      // The item catalogue: casket models · packages · service lines. The label
      // reads "Products" (the admin's own word); the route and editor are unchanged.
      { href: "/staff/catalog", label: "Products", scopes: ["catalog:read"] },
      // ONE rate source (Phase 4 nav consolidation): the plan tiers AND the lot
      // families edit one pricing document, so they share this home. /staff/plans
      // redirects here; the membership folio keeps its own nested route below.
      { href: "/staff/pricing", label: "Pricing rules", scopes: ["catalog:write"] },
      // Inventory gates on catalog:write (admin-manage) rather than catalog:read —
      // the customer persona holds catalog:read for the storefront.
      { href: "/staff/inventory", label: "Inventory", scopes: ["catalog:write"] },
      // Commission (captain checklist F-12): no commission scope exists in
      // rbac-scopes-v1 and the engine is deferred platform scope, so the screen
      // reuses billing:read provisionally — commission statements/payouts are
      // the finance module (finance-billing.md §Commissions).
      { href: "/staff/commission", label: "Commission", scopes: ["billing:read"] },
    ],
  },
  {
    label: "Pages & content",
    items: [
      // The page home: every public surface's page document (content-catalogue
      // Phase 1 + the admin plan's seven new surfaces). ONE content editor
      // (captain, 2026-09-18): /staff/store redirects here. Gates on catalog:write
      // provisionally (front-end CMS seam) until the content contract freezes its
      // own scope. The label stays "Pages & content" (captain-approved).
      { href: "/staff/landing", label: "Pages & content", scopes: ["catalog:write"] },
    ],
  },
  {
    label: "Park & services",
    items: [
      { href: "/staff/property", label: "Property map", scopes: ["property:read"] },
      { href: "/staff/schedule", label: "Schedule & chapel", scopes: ["scheduling:read"] },
      // The morning screen (blueprint §36, facilities-scheduling.md): every case in the
      // lane of the stage it is in, with the case screen's own two writes. Gates on
      // cases:read like its siblings; the move/tick controls need cases:write.
      { href: "/staff/ops", label: "Operations board", scopes: ["cases:read"] },
      { href: "/staff/cases", label: "Cases", scopes: ["cases:read"] },
      // Dispatch reuses scheduling:read (vehicles are scheduling resources) until a
      // dedicated scope freezes; work orders reuse property:read (lot maintenance).
      { href: "/staff/dispatch", label: "Vehicle dispatch", scopes: ["scheduling:read"] },
      { href: "/staff/work-orders", label: "Work orders", scopes: ["property:read"] },
      { href: "/staff/hr", label: "Staff directory", scopes: ["hr:read"] },
      { href: "/staff/documents", label: "Documents", scopes: ["documents:read"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/staff/billing", label: "Billing & collections", scopes: ["billing:read"] },
      { href: "/staff/accounting", label: "Accounting", scopes: ["accounting:read"] },
      // Reports moved here from Overview (admin plan): the office looks for it
      // beside the money it reads. Gates on finance scopes provisionally until
      // reporting-analytics freezes its own scope (the page says as much).
      { href: "/staff/reports", label: "Reports", scopes: ["accounting:read", "billing:read"] },
    ],
  },
  {
    label: "Settings & admin",
    items: [
      { href: "/staff/users", label: "Users & roles", scopes: ["identity:users:manage"] },
      // Workflows and Tenant settings are the designed read-only admin screens (S31/S32):
      // recorded process definitions + in-flight records, and the park's applied
      // configuration. Scopes are provisional until the config-engine contracts freeze;
      // tenants:manage keeps them admin-only.
      { href: "/staff/workflows", label: "Workflows", scopes: ["tenancy:tenants:manage"] },
      { href: "/staff/audit", label: "Audit trail", scopes: ["audit:events:read"] },
      { href: "/staff/settings", label: "Tenant settings", scopes: ["tenancy:tenants:manage"] },
    ],
  },
];

export function visibleNav(scopes: string[]): NavSection[] {
  return STAFF_NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.scopes.length === 0 || item.scopes.some((s) => scopes.includes(s)),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Any-of scope check for page-level gating (graceful 403 UI). */
export function hasAnyScope(scopes: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((s) => scopes.includes(s));
}

/**
 * The ONE nav entry a pathname belongs to: the longest href that is the path itself or
 * an ancestor of it. A nested route (`/staff/plans/membership`) lights only its own
 * entry — never the parent it lives under — while a drill-down
 * (`/staff/plans/membership/3`) keeps its section active. One helper so the sidebar,
 * the portal rail and the phone tabs cannot disagree about the current page.
 */
export function activeNavHref(pathname: string, sections: NavSection[]): string | null {
  const candidates = sections
    .flatMap((section) => section.items)
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return candidates.sort((a, b) => b.length - a.length)[0] ?? null;
}
