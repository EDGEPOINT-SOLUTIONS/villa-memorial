// ============================================================================
// Navigation + role → scope mapping (mirrors the platform's `web/lib/rbac/nav.ts`
// pattern). Visibility is UX only; a real deployment enforces authorization at
// the service boundary. Scope strings mirror the frozen `rbac-scopes-v1` vocab.
// ============================================================================

export type NavItem = {
  href: string;
  label: string;
  scopes: string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", scopes: [] },
      { href: "/notifications", label: "Notifications", scopes: [] },
      { href: "/reports", label: "Reports", scopes: ["billing:read", "accounting:read", "cases:read"] },
    ],
  },
  {
    label: "Relationships",
    items: [
      { href: "/customers", label: "Customers", scopes: ["cases:read"] },
      { href: "/inquiries", label: "Inquiries", scopes: ["cases:read"] },
      { href: "/pipeline", label: "Sales pipeline", scopes: ["cases:read"] },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/plans", label: "Plans", scopes: ["catalog:read"] },
      { href: "/catalog", label: "Catalog", scopes: ["catalog:read"] },
      { href: "/inventory", label: "Inventory", scopes: ["catalog:read"] },
      { href: "/pricing", label: "Pricing rules", scopes: ["catalog:read"] },
      { href: "/admin/store", label: "Store & content", scopes: ["catalog:read"] },
      { href: "/orders", label: "Orders", scopes: ["orders:read"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/billing", label: "Billing & collections", scopes: ["billing:read"] },
      { href: "/accounting", label: "Accounting", scopes: ["accounting:read"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/cases", label: "Cases", scopes: ["cases:read"] },
      { href: "/schedule", label: "Schedule", scopes: ["scheduling:read"] },
      { href: "/dispatch", label: "Vehicle dispatch", scopes: ["scheduling:read"] },
      { href: "/property", label: "Property map", scopes: ["property:read"] },
      { href: "/work-orders", label: "Work orders", scopes: ["property:read"] },
      { href: "/hr", label: "Staff directory", scopes: ["hr:read"] },
      { href: "/documents", label: "Documents", scopes: ["documents:read"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users & roles", scopes: ["identity:users:manage"] },
      { href: "/admin/workflows", label: "Workflows", scopes: ["tenancy:modules:read"] },
      { href: "/admin/audit", label: "Audit trail", scopes: ["audit:events:read"] },
      { href: "/admin/settings", label: "Tenant settings", scopes: ["tenancy:modules:read"] },
    ],
  },
];

export function visibleNav(scopes: string[]): NavSection[] {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.scopes.length === 0 || item.scopes.some((s) => scopes.includes(s)),
    ),
  })).filter((section) => section.items.length > 0);
}

export function hasAnyScope(scopes: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((s) => scopes.includes(s));
}
