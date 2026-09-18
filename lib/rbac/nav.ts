/**
 * Staff portal navigation, gated by JWT scopes (jwt-claims-v1:
 * `scopes: [{module}:{action}]`). Nav gating is UX only — authorization is
 * enforced at service boundaries regardless of what renders here.
 *
 * Section order and labels mirror villa-memorial's staff nav exactly.
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
    label: "Overview",
    items: [
      { href: "/staff/dashboard", label: "Dashboard", scopes: [] },
      // No frozen notification scope yet — reuses cases:read provisionally (same
      // precedent as Relationships) until the notification contract brings its scope.
      { href: "/staff/notifications", label: "Notifications", scopes: ["cases:read"] },
      // Reports gate on finance scopes provisionally until reporting-analytics
      // freezes its own scope (page says as much).
      { href: "/staff/reports", label: "Reports", scopes: ["accounting:read", "billing:read"] },
    ],
  },
  {
    label: "Relationships",
    items: [
      // NOTE: permission codes are provisional until the crm-families contract
      // freezes its own RBAC entries; reusing cases:* avoids inventing scopes.
      { href: "/staff/customers", label: "Customers", scopes: ["cases:read"] },
      { href: "/staff/inquiries", label: "Inquiries", scopes: ["cases:read"] },
      { href: "/staff/pipeline", label: "Sales pipeline", scopes: ["cases:read"] },
    ],
  },
  {
    label: "Commerce",
    items: [
      // Staff plan management — gates on catalog:write so the customer persona
      // (which legitimately holds catalog:read) never sees it.
      { href: "/staff/plans", label: "Plans", scopes: ["catalog:write"] },
      { href: "/staff/catalog", label: "Catalog", scopes: ["catalog:read"] },
      // Inventory/pricing/store gate on catalog:write (admin-manage) rather than
      // catalog:read — the customer persona holds catalog:read for the storefront.
      { href: "/staff/inventory", label: "Inventory", scopes: ["catalog:write"] },
      { href: "/staff/pricing", label: "Pricing rules", scopes: ["catalog:write"] },
      // ONE content editor (captain, 2026-09-18): the old "Store & content" stub
      // was merged into the real editor, which now holds the landing page AND the
      // FAQ page. /staff/store redirects here. Gates on catalog:write provisionally
      // (front-end CMS seam) until the content contract freezes its own scope.
      // See app/(staff)/staff/landing + lib/api-client/landing.ts.
      { href: "/staff/landing", label: "Pages & content", scopes: ["catalog:write"] },
      { href: "/staff/orders", label: "Orders", scopes: ["orders:read"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/staff/billing", label: "Billing & collections", scopes: ["billing:read"] },
      { href: "/staff/accounting", label: "Accounting", scopes: ["accounting:read"] },
      // Commission (captain checklist F-12): no commission scope exists in
      // rbac-scopes-v1 and the engine is deferred platform scope, so the screen
      // reuses billing:read provisionally — commission statements/payouts are
      // the finance module (finance-billing.md §Commissions).
      { href: "/staff/commission", label: "Commission", scopes: ["billing:read"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/staff/cases", label: "Cases", scopes: ["cases:read"] },
      { href: "/staff/schedule", label: "Schedule", scopes: ["scheduling:read"] },
      // Dispatch reuses scheduling:read (vehicles are scheduling resources) until a
      // dedicated scope freezes; work orders reuse property:read (lot maintenance).
      { href: "/staff/dispatch", label: "Vehicle dispatch", scopes: ["scheduling:read"] },
      { href: "/staff/property", label: "Property map", scopes: ["property:read"] },
      { href: "/staff/work-orders", label: "Work orders", scopes: ["property:read"] },
      { href: "/staff/hr", label: "Staff directory", scopes: ["hr:read"] },
      { href: "/staff/documents", label: "Documents", scopes: ["documents:read"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff/users", label: "Users & roles", scopes: ["identity:users:manage"] },
      // Workflows/settings are not-wired admin stubs; scopes provisional until the
      // config-engine contracts freeze. tenants:manage keeps them admin-only.
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
