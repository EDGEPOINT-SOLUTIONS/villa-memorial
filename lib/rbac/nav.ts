/**
 * Admin Portal navigation, gated by JWT scopes (jwt-claims-v1:
 * `scopes: [{module}:{action}]`). Nav gating is UX only — authorization is
 * enforced at service boundaries regardless of what renders here.
 *
 * REVISIONED 2026-10-02 (the admin portal plan; the captain asked for the plan's
 * own revision, not just a regroup). The seven groups are named by the question
 * the admin is asking and Today leads. Every route that existed before still
 * resolves — the changes are group names/order, the merge of Notifications into
 * the Inbox (the durable family/agent threads, §9.6), Reports moving into Finance
 * beside the money, and the plan additions (Inbox · Memorials · Media library ·
 * Preparation). Work orders and AI Copilot leave the curated rail but keep their
 * routes: work orders are opened from the calendar and the needs-you queue, and
 * AI Copilot from the workspace topbar. Nothing is deleted and no screen is left
 * without a door.
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
  /** An optional unread count the shell renders beside the label (the Inbox). */
  badge?: number;
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
      // The unified calendar: the scheduling, dispatch, burial, billing and
      // work-order stores, so the scheduling scope is the one it needs; the page
      // prints what it could not read.
      { href: "/staff/calendar", label: "Calendar", scopes: ["scheduling:read"] },
      // The Inbox (the admin plan's chat, §9.6): the durable family/agent ↔ office
      // threads, which the layout decorates with the office's unread count. It is
      // also the notice surface the dashboard's triaged queue feeds (notifications ·
      // family requests · inquiries · payments), so a family's message and a due
      // payment share one door. cases:read lists; cases:write sends (both provisional
      // reuses while rbac-scopes-v1 names no messaging code).
      { href: "/staff/inbox", label: "Inbox", scopes: ["cases:read"] },
    ],
  },
  {
    label: "Families & inquiries",
    items: [
      // Permission codes are provisional until crm-families freezes its own RBAC
      // entries; reusing cases:* avoids inventing scopes.
      { href: "/staff/customers", label: "Families", scopes: ["cases:read"] },
      { href: "/staff/inquiries", label: "Inquiries", scopes: ["cases:read"] },
      { href: "/staff/pipeline", label: "Sales pipeline", scopes: ["cases:read"] },
      // Membership application folio (F-18 / FORMS_PLAN gap 4). Provisional scope:
      // rbac-scopes-v1 names no membership/plan-holder code, so this reuses the
      // Commerce plans' catalog:write until a plans:*/memberships:* scope freezes.
      { href: "/staff/plans/membership", label: "Memberships", scopes: ["catalog:write"] },
      // The published memorials the office holds — the family's consent switch is
      // the reader's gate, so this is a family record; it reuses cases:read.
      { href: "/staff/memorials", label: "Memorials", scopes: ["cases:read"] },
    ],
  },
  {
    label: "Orders & commerce",
    items: [
      { href: "/staff/orders", label: "Orders", scopes: ["orders:read"] },
      // The item catalogue: casket models · packages · service lines. The label
      // reads "Products" (the admin's own word); the route and editor are unchanged.
      { href: "/staff/catalog", label: "Products", scopes: ["catalog:read"] },
      // ONE rate source: the plan tiers AND the lot families edit one pricing
      // document. /staff/plans redirects here; the membership folio nests below.
      { href: "/staff/pricing", label: "Pricing rules", scopes: ["catalog:write"] },
      // Inventory gates on catalog:write (admin-manage) rather than catalog:read —
      // the customer persona holds catalog:read for the storefront.
      { href: "/staff/inventory", label: "Inventory", scopes: ["catalog:write"] },
      // Commission (F-12): no commission scope exists in rbac-scopes-v1, so the
      // screen reuses billing:read provisionally — statements/payouts are finance.
      { href: "/staff/commission", label: "Commission", scopes: ["billing:read"] },
    ],
  },
  {
    label: "Pages & content",
    items: [
      // The page home: every public surface's page document. ONE content editor
      // (captain, 2026-09-18): /staff/store redirects here. Gates on catalog:write
      // provisionally (front-end CMS seam) until the content contract freezes its
      // own scope.
      { href: "/staff/landing", label: "Every public page", scopes: ["catalog:write"] },
      // The shipped assets a staff editor may attach: upload once, reference by
      // URL. Media uploads otherwise need D7 public-web media.
      { href: "/staff/media", label: "Media library", scopes: ["catalog:write"] },
    ],
  },
  {
    label: "Park & services",
    items: [
      { href: "/staff/property", label: "Property map", scopes: ["property:read"] },
      { href: "/staff/schedule", label: "Schedule & chapel", scopes: ["scheduling:read"] },
      { href: "/staff/cases", label: "Cases", scopes: ["cases:read"] },
      // The morning screen (blueprint §36): every case in the lane of the stage it
      // is in, with the case screen's own two writes. cases:read like its siblings;
      // the move/tick controls need cases:write.
      { href: "/staff/ops", label: "Operations board", scopes: ["cases:read"] },
      // Dispatch reuses scheduling:read (vehicles are scheduling resources) until a
      // dedicated scope freezes.
      { href: "/staff/dispatch", label: "Vehicle dispatch", scopes: ["scheduling:read"] },
      // The embalming / preparation lane across every open case (PROVISIONAL
      // recorded fixture; no preparation contract). cases:read, like the case it
      // belongs to.
      { href: "/staff/preparation", label: "Preparation", scopes: ["cases:read"] },
      { href: "/staff/hr", label: "Staff directory", scopes: ["hr:read"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/staff/billing", label: "Billing & collections", scopes: ["billing:read"] },
      { href: "/staff/accounting", label: "Accounting", scopes: ["accounting:read"] },
      // Analytics (admin plan §9.1): collections, dues, sales and the pipeline. No
      // analytics scope exists in rbac-scopes-v1, so it reuses the finance reads it
      // aggregates (the same any-of gate `/staff/reports` carries).
      {
        href: "/staff/analytics",
        label: "Analytics",
        scopes: ["accounting:read", "billing:read"],
      },
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
      // Workflows and Tenant settings are the designed read-only admin screens
      // (S31/S32). Scopes are provisional until the config-engine contracts freeze;
      // tenants:manage keeps them admin-only.
      { href: "/staff/workflows", label: "Workflows", scopes: ["tenancy:tenants:manage"] },
      { href: "/staff/audit", label: "Audit trail", scopes: ["audit:events:read"] },
      { href: "/staff/settings", label: "Tenant settings", scopes: ["tenancy:tenants:manage"] },
      // The document repository (frozen documents-api-v1 read): the office's papers
      // live with the park's configuration, not with the grounds.
      { href: "/staff/documents", label: "Documents", scopes: ["documents:read"] },
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
