// Single source of truth for portal navigation (Agent + Client portals).
import type { PortalItem } from "../components/PortalFrame";

export const AGENT_NAV: PortalItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", to: "/agent/dashboard" },
  { key: "clients", label: "Clients", icon: "group", to: "/agent/clients" },
  { key: "prospects", label: "Prospects", icon: "person_search", to: "/agent/prospects" },
  { key: "applications", label: "Applications", icon: "description", to: "/agent/applications" },
  { key: "sales", label: "Sales & Commissions", icon: "payments", to: "/agent/sales" },
  { key: "marketing", label: "Marketing Materials", icon: "campaign", to: "/agent/marketing" },
];

export const CLIENT_NAV: PortalItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", to: "/client/dashboard" },
  { key: "profile", label: "My Profile", icon: "person", to: "/client/profile" },
  { key: "plans", label: "My Memorial Plans", icon: "description", to: "/client/plans" },
  { key: "property", label: "My Memorial Property", icon: "park", to: "/client/property" },
  { key: "payments", label: "My Payments", icon: "payments", to: "/client/payments" },
  { key: "memorials", label: "My Memorials", icon: "volunteer_activism", to: "/client/memorials" },
  { key: "cases", label: "My Funeral Cases", icon: "local_florist", to: "/client/cases" },
  { key: "documents", label: "My Documents", icon: "folder_open", to: "/client/documents" },
  { key: "appointments", label: "My Appointments", icon: "event", to: "/client/appointments" },
  { key: "requests", label: "My Requests", icon: "assignment", to: "/client/requests" },
  { key: "notifications", label: "Notifications", icon: "notifications", to: "/client/notifications" },
  { key: "support", label: "Support & Tickets", icon: "support_agent", to: "/client/support" },
  { key: "privacy", label: "Privacy Center", icon: "privacy_tip", to: "/client/privacy" },
];
