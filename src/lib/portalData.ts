// ============================================================================
// portalData.ts — demo data for the Agent portal and Client (family) portal.
// Kept small and coherent with the COO portal dashboards (same personas,
// amounts, and status vocabulary). No backend — demo only.
// ============================================================================

// ---------- Agent portal (sales agent "Maria Fernandez") --------------------

export type AgentProspect = {
  id: string;
  name: string;
  interest: string;
  channel: "Walk-in" | "Facebook" | "Referral" | "Call-in";
  date: string;
  status: "New" | "Contacted" | "Consultation" | "Arranged";
};

export type AgentClient = {
  id: string;
  name: string;
  account: string;
  plans: number;
  active: boolean;
  since: string;
};

export type AgentApplication = {
  id: string;
  name: string;
  plan: string;
  submitted: string;
  status: "Processing" | "Approved" | "Pending Info" | "Draft";
};

export type AgentSale = {
  id: string;
  date: string;
  client: string;
  item: string;
  amount: string;
  commission: string;
};

export const AGENT_PROSPECTS: AgentProspect[] = [
  { id: "P-2101", name: "Sarah Jenkins", interest: "Traditional Burial Plan", channel: "Facebook", date: "Oct 12", status: "Contacted" },
  { id: "P-2098", name: "Michael Torres", interest: "Cremation Memorial", channel: "Walk-in", date: "Oct 10", status: "Consultation" },
  { id: "P-2095", name: "Eleanor Vance", interest: "Pre-need Package", channel: "Referral", date: "Oct 08", status: "New" },
  { id: "P-2090", name: "Angelo Reyes", interest: "Premium Lawn Lot", channel: "Call-in", date: "Oct 04", status: "Arranged" },
  { id: "P-2087", name: "Carmen Lee", interest: "Garden Niches", channel: "Facebook", date: "Oct 01", status: "New" },
];

export const AGENT_CLIENTS: AgentClient[] = [
  { id: "C-1142", name: "Rosario Dela Cruz", account: "Family Account", plans: 2, active: true, since: "2019" },
  { id: "C-1136", name: "Benedict Ramos", account: "Individual", plans: 1, active: true, since: "2021" },
  { id: "C-1129", name: "Lourdes Santos", account: "Family Account", plans: 3, active: true, since: "2017" },
  { id: "C-1121", name: "Fernando Lim", account: "Individual", plans: 1, active: false, since: "2020" },
  { id: "C-1114", name: "Imelda Rivera", account: "Family Account", plans: 2, active: true, since: "2018" },
];

export const AGENT_APPLICATIONS: AgentApplication[] = [
  { id: "APP-458", name: "Sarah Jenkins", plan: "Traditional Burial Plan", submitted: "Oct 12", status: "Processing" },
  { id: "APP-455", name: "Michael Torres", plan: "Cremation Memorial", submitted: "Oct 10", status: "Approved" },
  { id: "APP-451", name: "Eleanor Vance", plan: "Pre-need Package", submitted: "Oct 08", status: "Pending Info" },
  { id: "APP-447", name: "Angelo Reyes", plan: "Premium Lawn Lot", submitted: "Oct 04", status: "Approved" },
  { id: "APP-440", name: "Carmen Lee", plan: "Garden Niches", submitted: "Oct 01", status: "Draft" },
];

export const AGENT_SALES: AgentSale[] = [
  { id: "S-881", date: "Oct 12", client: "Angelo Reyes", item: "Premium Lawn Lot", amount: "₱120,000", commission: "₱6,000" },
  { id: "S-879", date: "Oct 10", client: "Michael Torres", item: "Cremation Memorial", amount: "₱85,000", commission: "₱4,250" },
  { id: "S-874", date: "Oct 06", client: "Rosario Dela Cruz", item: "Garden of Roses Plan", amount: "₱120,000", commission: "₱6,000" },
  { id: "S-869", date: "Oct 02", client: "Imelda Rivera", item: "Heritage Bronze Plan", amount: "₱85,000", commission: "₱4,250" },
  { id: "S-862", date: "Sep 28", client: "Benedict Ramos", item: "Legacy Platinum Plan", amount: "₱250,000", commission: "₱12,500" },
];

export const AGENT_MARKETING = [
  { id: "b1", title: "2024 Brochure", desc: "Full Villa Memorial service overview for print & sharing.", file: "PDF" },
  { id: "b2", title: "Presentation Deck", desc: "Client-ready deck covering plans, lots and packages.", file: "Slides" },
  { id: "b3", title: "Memorial Plans One-Pager", desc: "Quick reference for the pre-need plans page.", file: "PDF" },
  { id: "b4", title: "Sanctuario Map Handout", desc: "Printable park map with section legend.", file: "PDF" },
];

// ---------- Client (family) portal (client "Maria") -------------------------

export const CLIENT_PROFILE = {
  name: "Maria Dela Cruz",
  familyAccount: "Dela Cruz Family Account",
  email: "family@example.com",
  phone: "+63 917 555 0147",
  address: "Isabela City, Basilan",
  memberSince: "2024",
};

export type ClientPlan = {
  id: string;
  name: string;
  holder: string;
  status: "Active" | "Mature" | "Completed";
  purchased: string;
  value: string;
};

export const CLIENT_PLANS: ClientPlan[] = [
  { id: "PL-1001", name: "Premium Lawn Lot — Block 4", holder: "Maria Dela Cruz", status: "Active", purchased: "Jul 2024", value: "₱200,000" },
  { id: "PL-1004", name: "Garden of Roses Plan", holder: "Ernesto Dela Cruz †", status: "Completed", purchased: "2019", value: "₱120,000" },
];

export type ClientPayment = {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "Completed" | "Upcoming";
};

export const CLIENT_PAYMENTS: ClientPayment[] = [
  { id: "R-4401", date: "Sep 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
  { id: "R-4402", date: "Aug 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
  { id: "R-4403", date: "Jul 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
  { id: "R-4404", date: "Oct 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Upcoming" },
];

export const CLIENT_CONTRACT = {
  title: "Premium Lawn Lot — Block 4",
  property: "Serenity Gardens · Phase 1 · Block 4, Lot 12",
  total: "₱200,000",
  paid: "₱135,000",
  progress: 65,
};

export type ClientProperty = {
  id: string;
  label: string;
  detail: string;
  status: "Owned" | "Reserved";
};

export const CLIENT_PROPERTIES: ClientProperty[] = [
  { id: "L-12", label: "Block 4, Lot 12", detail: "Serenity Gardens Phase 1 · Premium Lawn", status: "Owned" },
  { id: "L-27", label: "Block 2, Lot 27", detail: "Serenity Gardens Phase 1 · Premium Lawn", status: "Reserved" },
];

export type ClientRequest = {
  id: string;
  title: string;
  detail: string;
  status: "Pending" | "In Progress" | "Completed";
  date: string;
};

export const CLIENT_REQUESTS: ClientRequest[] = [
  { id: "REQ-301", title: "Floral Arrangement Upgrade", detail: "Add premium flower arrangement for October visit.", status: "Pending", date: "Oct 10" },
  { id: "REQ-298", title: "Maintenance Request", detail: "Please clean around Block 4, Lot 12 marker.", status: "In Progress", date: "Oct 02" },
  { id: "REQ-290", title: "Document Request", detail: "Copy of service contract and receipts.", status: "Completed", date: "Sep 20" },
];

export type ClientNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
};

export const CLIENT_NOTIFICATIONS: ClientNotification[] = [
  { id: "N-501", title: "Payment due Oct 15", detail: "Your monthly installment of ₱2,500 is scheduled.", time: "2h", unread: true },
  { id: "N-499", title: "Request update", detail: "Maintenance around Block 4, Lot 12 is in progress.", time: "1d", unread: true },
  { id: "N-494", title: "New document available", detail: "Official receipt R-4403 is ready to download.", time: "3d", unread: true },
  { id: "N-488", title: "Payment received", detail: "Your September installment was received. Thank you.", time: "5d", unread: false },
];

// ---------- Client documents (My Documents) --------------------------------

export type ClientDocument = {
  id: string;
  name: string;
  type: string;
  related: string;
  issued: string;
  status: "Ready" | "Processing" | "Requested";
};

export const CLIENT_DOCUMENTS: ClientDocument[] = [
  { id: "CD-1", name: "Lot Purchase Agreement — Block 4, Lot 12", type: "Purchase agreement", related: "PL-1001", issued: "Jul 2024", status: "Ready" },
  { id: "CD-2", name: "Official Receipt R-4403", type: "Official receipt", related: "R-4403", issued: "Sep 15, 2024", status: "Ready" },
  { id: "CD-3", name: "Certificate of Ownership — Block 4, Lot 12", type: "Certificate", related: "PL-1001", issued: "Aug 2024", status: "Ready" },
  { id: "CD-4", name: "Plan Statement of Account", type: "Statement", related: "PL-1004", issued: "Oct 01, 2024", status: "Processing" },
  { id: "CD-5", name: "Interment Authorization Form", type: "Authorization", related: "PL-1004", issued: "—", status: "Requested" },
];

// ---------- Client memorials (My Memorials / digital memorials) ------------

export type ClientMemorial = {
  id: string;
  name: string;
  years: string;
  location: string;
  status: "Published" | "Draft";
  visitors: number;
  updated: string;
};

export const CLIENT_MEMORIALS: ClientMemorial[] = [
  { id: "M-2001", name: "Ernesto Dela Cruz", years: "1948 – 2026", location: "Block 4, Lot 12 · Serenity Gardens", status: "Published", visitors: 148, updated: "Oct 12, 2024" },
];

// ---------- Client funeral cases (My Funeral Cases) ------------------------

export type ClientCase = {
  id: string;
  title: string;
  date: string;
  status: "In progress" | "Scheduled" | "Completed";
  nextStep: string;
};

export const CLIENT_CASES: ClientCase[] = [
  {
    id: "CS-1042",
    title: "Funeral arrangement — Ernesto Dela Cruz",
    date: "Started Sep 02, 2026",
    status: "In progress",
    nextStep: "Chapel viewing booked · interment Sep 6",
  },
  {
    id: "CS-0981",
    title: "Memorial service — Ernesto Dela Cruz",
    date: "Completed Mar 2019",
    status: "Completed",
    nextStep: "Records archived in family account",
  },
];

// ---------- Client appointments (My Appointments) ---------------------------

export type ClientAppointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  with: string;
  status: "Upcoming" | "Completed" | "Requested";
};

export const CLIENT_APPOINTMENTS: ClientAppointment[] = [
  { id: "AP-701", title: "Visit Block 4, Lot 12", date: "Oct 20, 2024", time: "10:00 am", with: "Park grounds team", status: "Upcoming" },
  { id: "AP-699", title: "Planning consultation", date: "Oct 12, 2024", time: "2:00 pm", with: "Care team advisor", status: "Completed" },
  { id: "AP-705", title: "Annual garden cleanup review", date: "Requested", time: "—", with: "Care team", status: "Requested" },
];

// ---------- Client support tickets (Support / Ticket) -----------------------

export type ClientTicket = {
  id: string;
  subject: string;
  detail: string;
  status: "Open" | "In progress" | "Resolved";
  updated: string;
};

export const CLIENT_TICKETS: ClientTicket[] = [
  { id: "TK-9004", subject: "Update contact number on record", detail: "Please update the primary phone for the account.", status: "In progress", updated: "Oct 11, 2024" },
  { id: "TK-8990", subject: "Question about statement of account", detail: "Requesting a breakdown of the latest bill.", status: "Resolved", updated: "Oct 02, 2024" },
];
