/**
 * Portal navigation data (family + agent) — mirror of villa-memorial's
 * CLIENT_NAV / AGENT_NAV order and labels. Icons are resolved by key inside
 * the client PortalFrame (lucide), keeping this file renderer-agnostic.
 */
export type PortalNavItem = {
  key: string;
  label: string;
  to: string;
};

export const FAMILY_PORTAL_NAV: PortalNavItem[] = [
  { key: "dashboard", label: "Dashboard", to: "/client/dashboard" },
  { key: "profile", label: "My Profile", to: "/client/profile" },
  { key: "plans", label: "My Memorial Plans", to: "/client/plans" },
  { key: "property", label: "My Memorial Property", to: "/client/property" },
  { key: "payments", label: "My Payments", to: "/client/payments" },
  { key: "memorials", label: "My Memorials", to: "/client/memorials" },
  { key: "cases", label: "My Funeral Cases", to: "/client/cases" },
  { key: "documents", label: "My Documents", to: "/client/documents" },
  { key: "appointments", label: "My Appointments", to: "/client/appointments" },
  { key: "requests", label: "My Requests", to: "/client/requests" },
  { key: "notifications", label: "Notifications", to: "/client/notifications" },
  { key: "support", label: "Support & Tickets", to: "/client/support" },
  { key: "privacy", label: "Privacy Center", to: "/client/privacy" },
];

export const AGENT_PORTAL_NAV: PortalNavItem[] = [
  { key: "dashboard", label: "Dashboard", to: "/agent/dashboard" },
  { key: "clients", label: "Clients", to: "/agent/clients" },
  { key: "prospects", label: "Prospects", to: "/agent/prospects" },
  { key: "applications", label: "Applications", to: "/agent/applications" },
  { key: "sales", label: "Sales & Commissions", to: "/agent/sales" },
  { key: "marketing", label: "Marketing Materials", to: "/agent/marketing" },
];
