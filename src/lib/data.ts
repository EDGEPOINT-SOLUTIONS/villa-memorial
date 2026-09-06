// ============================================================================
// Demo data — purely illustrative, frontend-only. Realistic Filipino names,
// peso amounts, and records so screens read as a believable product.
// ============================================================================

export type Tenant = {
  id: string;
  name: string;
  branch: string;
  facility: string;
};

export const TENANTS: Tenant[] = [
  { id: "villa", name: "Villa Memorial", branch: "Isabela City", facility: "Main Chapel" },
  { id: "loyola", name: "Loyola Gardens", branch: "Quezon City", facility: "Memorial Park" },
  { id: "golden", name: "Golden Haven", branch: "Las Piñas", facility: "Crematorium" },
];

export type Role = {
  id: string;
  label: string;
  description: string;
  scopes: string[];
};

export const ROLES: Role[] = [
  {
    id: "executive",
    label: "Executive",
    description: "Revenue, case volume, branch performance",
    scopes: [
      "catalog:read", "orders:read", "billing:read", "accounting:read",
      "cases:read", "scheduling:read", "property:read", "hr:read", "documents:read",
      "identity:users:manage", "audit:events:read", "tenancy:modules:read",
    ],
  },
  {
    id: "manager",
    label: "Branch Manager",
    description: "Today's activities, pending cases, staff, payments",
    scopes: [
      "catalog:read", "catalog:write", "orders:read", "orders:write",
      "billing:read", "cases:read", "cases:write", "scheduling:read", "scheduling:write",
      "property:read", "hr:read", "documents:read", "audit:events:read",
    ],
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Receivables, journal entries, statements",
    scopes: [
      "orders:read", "billing:read", "billing:write", "accounting:read", "accounting:post",
      "documents:read", "audit:events:read",
    ],
  },
  {
    id: "embalmer",
    label: "Embalmer",
    description: "Case tasks, preparation checklists, schedule",
    scopes: ["cases:read", "cases:write", "scheduling:read", "documents:read"],
  },
  {
    id: "cashier",
    label: "Cashier",
    description: "Payments, collections, receipts",
    scopes: ["orders:read", "billing:read", "billing:write", "cases:read", "documents:read"],
  },
];

// --- Customers / families (Module A) --------------------------------------
export type Customer = {
  id: string;
  name: string;
  type: "Purchaser" | "Next of kin" | "Authorized representative" | "Referral";
  phone: string;
  email: string;
  city: string;
  activeCases: number;
  plans: number;
  lots: number;
  family: { name: string; relation: string }[];
  deceased: { name: string; dates: string; status: string }[];
  serviceHistory: { ref: string; service: string; date: string; amount: string }[];
};

export const CUSTOMERS: Customer[] = [
  {
    id: "cus-1",
    name: "Rosario Dela Cruz",
    type: "Next of kin",
    phone: "0917 555 0143",
    email: "rosario.delacruz@email.com",
    city: "Isabela City",
    activeCases: 1,
    plans: 1,
    lots: 2,
    family: [
      { name: "Rosario Dela Cruz", relation: "Spouse" },
      { name: "Miguel Dela Cruz", relation: "Child" },
      { name: "Ana Dela Cruz", relation: "Child" },
    ],
    deceased: [
      { name: "Ernesto Dela Cruz", dates: "1948 – 2026", status: "Case in progress" },
    ],
    serviceHistory: [
      { ref: "CS-1042", service: "Chapel viewing · 3 days", date: "2026-09-02", amount: "₱ 42,000" },
      { ref: "PL-0321", service: "Pre-need plan · Garden", date: "2019-06-11", amount: "₱ 120,000" },
    ],
  },
  {
    id: "cus-2",
    name: "Benedict Ramos",
    type: "Purchaser",
    phone: "0918 555 0227",
    email: "benedict.ramos@email.com",
    city: "Zamboanga City",
    activeCases: 0,
    plans: 0,
    lots: 1,
    family: [{ name: "Benedict Ramos", relation: "Self" }],
    deceased: [],
    serviceHistory: [
      { ref: "LT-0088", service: "Lot purchase · Block C", date: "2025-03-20", amount: "₱ 185,000" },
    ],
  },
  {
    id: "cus-3",
    name: "Lourdes Santos",
    type: "Purchaser",
    phone: "0920 555 0136",
    email: "lourdes.santos@email.com",
    city: "Isabela City",
    activeCases: 1,
    plans: 1,
    lots: 0,
    family: [
      { name: "Lourdes Santos", relation: "Self" },
      { name: "Paolo Santos", relation: "Child" },
    ],
    deceased: [{ name: "Corazon Santos", dates: "1951 – 2026", status: "Completed" }],
    serviceHistory: [
      { ref: "CS-1031", service: "Cremation package", date: "2026-07-18", amount: "₱ 68,500" },
    ],
  },
  {
    id: "cus-4",
    name: "Fernando Lim",
    type: "Referral",
    phone: "0919 555 0118",
    email: "fernando.lim@email.com",
    city: "Basilan",
    activeCases: 0,
    plans: 2,
    lots: 1,
    family: [{ name: "Fernando Lim", relation: "Self" }],
    deceased: [],
    serviceHistory: [
      { ref: "PL-0401", service: "Pre-need plan · Bronze", date: "2024-11-02", amount: "₱ 85,000" },
    ],
  },
  {
    id: "cus-5",
    name: "Imelda Rivera",
    type: "Authorized representative",
    phone: "0916 555 0291",
    email: "imelda.rivera@email.com",
    city: "Isabela City",
    activeCases: 0,
    plans: 0,
    lots: 0,
    family: [{ name: "Imelda Rivera", relation: "Self" }],
    deceased: [],
    serviceHistory: [],
  },
];

export type Inquiry = {
  id: string;
  name: string;
  channel: "Phone" | "Walk-in" | "Facebook" | "Referral" | "Website";
  subject: string;
  status: "New" | "Contacted" | "Consultation" | "Arranged";
  date: string;
};

export const INQUIRIES: Inquiry[] = [
  { id: "INQ-301", name: "Marites Aquino", channel: "Walk-in", subject: "Chapel package inquiry", status: "New", date: "2026-09-02" },
  { id: "INQ-302", name: "Rolando Bautista", channel: "Phone", subject: "Pre-need plan for couple", status: "Contacted", date: "2026-09-01" },
  { id: "INQ-303", name: "Grace Mendoza", channel: "Facebook", subject: "Lot pricing · Garden of Roses", status: "Consultation", date: "2026-08-30" },
  { id: "INQ-304", name: "Joseph Tan", channel: "Referral", subject: "Immediate assistance", status: "Arranged", date: "2026-08-29" },
  { id: "INQ-305", name: "Cecilia Uy", channel: "Phone", subject: "Cremation service", status: "New", date: "2026-09-02" },
];

// --- Plans (Module B) ------------------------------------------------------
export type Plan = {
  id: string;
  name: string;
  price: string;
  term: string;
  holders: number;
  status: "Active" | "Mature" | "Draft";
  benefits: string[];
  installments: { due: string; amount: string; paid: string; status: "Paid" | "Due" | "Overdue" }[];
};

export const PLANS: Plan[] = [
  {
    id: "plan-1",
    name: "Garden of Roses",
    price: "₱ 120,000",
    term: "5 years",
    holders: 24,
    status: "Active",
    benefits: ["Interment right", "Chapel credit", "Monument allowance"],
    installments: [
      { due: "2026-08-15", amount: "₱ 4,000", paid: "₱ 4,000", status: "Paid" },
      { due: "2026-09-15", amount: "₱ 4,000", paid: "₱ 0", status: "Due" },
      { due: "2026-10-15", amount: "₱ 4,000", paid: "₱ 0", status: "Due" },
    ],
  },
  {
    id: "plan-2",
    name: "Heritage Bronze",
    price: "₱ 85,000",
    term: "3 years",
    holders: 41,
    status: "Active",
    benefits: ["Interment right", "Transport allowance"],
    installments: [
      { due: "2026-08-20", amount: "₱ 2,800", paid: "₱ 2,800", status: "Paid" },
      { due: "2026-09-20", amount: "₱ 2,800", paid: "₱ 0", status: "Due" },
    ],
  },
  {
    id: "plan-3",
    name: "Legacy Platinum",
    price: "₱ 250,000",
    term: "7 years",
    holders: 12,
    status: "Active",
    benefits: ["Interment right", "Full chapel", "Vehicle fleet", "Memorial page"],
    installments: [
      { due: "2026-08-10", amount: "₱ 4,200", paid: "₱ 4,200", status: "Paid" },
      { due: "2026-09-10", amount: "₱ 4,200", paid: "₱ 0", status: "Due" },
    ],
  },
  {
    id: "plan-4",
    name: "Golden Crest",
    price: "₱ 180,000",
    term: "5 years",
    holders: 19,
    status: "Mature",
    benefits: ["Interment right", "Chapel credit"],
    installments: [
      { due: "2026-07-30", amount: "₱ 3,600", paid: "₱ 3,600", status: "Paid" },
      { due: "2026-08-30", amount: "₱ 3,600", paid: "₱ 3,600", status: "Paid" },
    ],
  },
];

// --- Catalog (Module C) ----------------------------------------------------
export type CatalogItem = {
  id: string;
  name: string;
  category: "Service" | "Merchandise" | "Package";
  price: string;
  stock?: string;
};

export const CATALOG: CatalogItem[] = [
  { id: "cat-1", name: "Traditional embalming", category: "Service", price: "₱ 8,500" },
  { id: "cat-2", name: "Chapel viewing (per day)", category: "Service", price: "₱ 6,000" },
  { id: "cat-3", name: "Interment service", category: "Service", price: "₱ 15,000" },
  { id: "cat-4", name: "Cremation package", category: "Package", price: "₱ 68,500" },
  { id: "cat-5", name: "Transfer / transport", category: "Service", price: "₱ 5,500" },
  { id: "cat-6", name: "Memorial urn · standard", category: "Merchandise", price: "₱ 4,200", stock: "In stock" },
  { id: "cat-7", name: "Casket · premium hardwood", category: "Merchandise", price: "₱ 48,000", stock: "3 left" },
  { id: "cat-8", name: "Flower arrangement", category: "Merchandise", price: "₱ 2,500", stock: "In stock" },
];

// --- Orders ----------------------------------------------------------------
export type Order = {
  id: string;
  customer: string;
  items: number;
  total: string;
  status: "Quote" | "Confirmed" | "Fulfilled" | "Cancelled";
  date: string;
};

export const ORDERS: Order[] = [
  { id: "ORD-5021", customer: "Rosario Dela Cruz", items: 4, total: "₱ 42,000", status: "Confirmed", date: "2026-09-02" },
  { id: "ORD-5019", customer: "Lourdes Santos", items: 2, total: "₱ 68,500", status: "Fulfilled", date: "2026-07-18" },
  { id: "ORD-5015", customer: "Benedict Ramos", items: 1, total: "₱ 185,000", status: "Fulfilled", date: "2025-03-20" },
  { id: "ORD-5024", customer: "Marites Aquino", items: 3, total: "₱ 26,000", status: "Quote", date: "2026-09-02" },
];

// --- Cases (Module H) ------------------------------------------------------
export type Case = {
  id: string;
  deceased: string;
  type: "Burial" | "Cremation" | "Transfer";
  status: "Arrangement" | "Scheduled" | "In service" | "Completed" | "Archived";
  date: string;
  location: string;
  assignee: string;
};

export const CASES: Case[] = [
  { id: "CS-1042", deceased: "Ernesto Dela Cruz", type: "Burial", status: "Arrangement", date: "2026-09-02", location: "Main Chapel", assignee: "A. Villanueva" },
  { id: "CS-1041", deceased: "Corazon Santos", type: "Cremation", status: "Scheduled", date: "2026-09-01", location: "Crematorium", assignee: "J. Navarro" },
  { id: "CS-1040", deceased: "Rodolfo Mercado", type: "Burial", status: "In service", date: "2026-08-31", location: "Chapel B", assignee: "M. Ocampo" },
  { id: "CS-1039", deceased: "Estrella Villanueva", type: "Transfer", status: "Completed", date: "2026-08-28", location: "Provincial", assignee: "A. Villanueva" },
  { id: "CS-1038", deceased: "Andres Bautista", type: "Burial", status: "Completed", date: "2026-08-25", location: "Garden of Roses", assignee: "J. Navarro" },
];

// --- Schedule --------------------------------------------------------------
export type Booking = {
  id: string;
  resource: string;
  kind: "Chapel" | "Vehicle" | "Staff";
  title: string;
  date: string;
  time: string;
  status: "Booked" | "Tentative" | "Complete";
};

export const SCHEDULE: Booking[] = [
  { id: "bk-1", resource: "Main Chapel", kind: "Chapel", title: "Viewing — Dela Cruz", date: "2026-09-03", time: "09:00", status: "Booked" },
  { id: "bk-2", resource: "Chapel B", kind: "Chapel", title: "Viewing — Mercado", date: "2026-09-03", time: "10:00", status: "Booked" },
  { id: "bk-3", resource: "Van 2", kind: "Vehicle", title: "Transport — Santos", date: "2026-09-04", time: "13:00", status: "Tentative" },
  { id: "bk-4", resource: "Embalming Bay", kind: "Staff", title: "Preparation — Dela Cruz", date: "2026-09-02", time: "16:00", status: "Complete" },
];

// --- Property / lots (Module D) --------------------------------------------
export type LotStatus =
  | "Available"
  | "Reserved"
  | "Sold"
  | "Occupied"
  | "Maintenance"
  | "Transferred";

export type Lot = {
  id: string;
  code: string;
  section: string;
  block: string;
  status: LotStatus;
  price: string;
  x: number; // map grid coordinate (0-100)
  y: number;
  owner?: string;
  history: { event: string; date: string }[];
};

export const LOTS: Lot[] = [
  { id: "lot-104", code: "A-104", section: "Garden of Roses", block: "Block A", status: "Available", price: "₱ 120,000", x: 18, y: 22, history: [{ event: "Lot surveyed", date: "2021-05-01" }] },
  { id: "lot-105", code: "A-105", section: "Garden of Roses", block: "Block A", status: "Sold", price: "₱ 120,000", x: 26, y: 22, owner: "Benedict Ramos", history: [{ event: "Sold to Benedict Ramos", date: "2025-03-20" }] },
  { id: "lot-106", code: "A-106", section: "Garden of Roses", block: "Block A", status: "Reserved", price: "₱ 120,000", x: 34, y: 22, history: [{ event: "Reserved", date: "2026-08-30" }] },
  { id: "lot-107", code: "A-107", section: "Garden of Roses", block: "Block A", status: "Occupied", price: "₱ 120,000", x: 42, y: 22, owner: "Del Rosario family", history: [{ event: "Interment", date: "2024-11-02" }] },
  { id: "lot-108", code: "A-108", section: "Garden of Roses", block: "Block A", status: "Maintenance", price: "₱ 120,000", x: 50, y: 22, history: [{ event: "Work order opened", date: "2026-08-15" }] },
  { id: "lot-201", code: "B-201", section: "Garden of Remembrance", block: "Block B", status: "Available", price: "₱ 185,000", x: 18, y: 40, history: [{ event: "Lot surveyed", date: "2021-05-01" }] },
  { id: "lot-202", code: "B-202", section: "Garden of Remembrance", block: "Block B", status: "Sold", price: "₱ 185,000", x: 26, y: 40, owner: "Dela Cruz family", history: [{ event: "Sold", date: "2019-06-11" }] },
  { id: "lot-203", code: "B-203", section: "Garden of Remembrance", block: "Block B", status: "Transferred", price: "₱ 185,000", x: 34, y: 40, owner: "Lim family", history: [{ event: "Transferred", date: "2026-01-12" }] },
  { id: "lot-204", code: "B-204", section: "Garden of Remembrance", block: "Block B", status: "Available", price: "₱ 185,000", x: 42, y: 40, history: [{ event: "Lot surveyed", date: "2021-05-01" }] },
  { id: "lot-205", code: "B-205", section: "Garden of Remembrance", block: "Block B", status: "Occupied", price: "₱ 185,000", x: 50, y: 40, owner: "Santos family", history: [{ event: "Interment", date: "2026-07-20" }] },
  { id: "lot-301", code: "C-301", section: "Evergreen Hill", block: "Block C", status: "Available", price: "₱ 250,000", x: 18, y: 58, history: [{ event: "Lot surveyed", date: "2021-05-01" }] },
  { id: "lot-302", code: "C-302", section: "Evergreen Hill", block: "Block C", status: "Reserved", price: "₱ 250,000", x: 26, y: 58, history: [{ event: "Reserved", date: "2026-08-28" }] },
  { id: "lot-303", code: "C-303", section: "Evergreen Hill", block: "Block C", status: "Sold", price: "₱ 250,000", x: 34, y: 58, owner: "Uy family", history: [{ event: "Sold", date: "2024-04-15" }] },
  { id: "lot-304", code: "C-304", section: "Evergreen Hill", block: "Block C", status: "Available", price: "₱ 250,000", x: 42, y: 58, history: [{ event: "Lot surveyed", date: "2021-05-01" }] },
];

// --- Billing (Module E) ----------------------------------------------------
export type Invoice = {
  id: string;
  customer: string;
  reference: string;
  total: string;
  balance: string;
  aging: "Current" | "1–30" | "31–60" | "61–90" | "90+";
  installments: { n: number; due: string; amount: string; paid: string; balance: string; status: "Overdue" | "Upcoming" | "Paid" }[];
};

export const INVOICES: Invoice[] = [
  {
    id: "INV-7701",
    customer: "Rosario Dela Cruz",
    reference: "CS-1042",
    total: "₱ 42,000",
    balance: "₱ 22,000",
    aging: "Current",
    installments: [
      { n: 1, due: "2026-09-05", amount: "₱ 20,000", paid: "₱ 20,000", balance: "₱ 0", status: "Paid" },
      { n: 2, due: "2026-09-15", amount: "₱ 12,000", paid: "₱ 0", balance: "₱ 12,000", status: "Upcoming" },
      { n: 3, due: "2026-10-15", amount: "₱ 10,000", paid: "₱ 0", balance: "₱ 10,000", status: "Upcoming" },
    ],
  },
  {
    id: "INV-7698",
    customer: "Fernando Lim",
    reference: "PL-0401",
    total: "₱ 85,000",
    balance: "₱ 2,800",
    aging: "1–30",
    installments: [
      { n: 7, due: "2026-08-20", amount: "₱ 2,800", paid: "₱ 0", balance: "₱ 2,800", status: "Overdue" },
    ],
  },
  {
    id: "INV-7690",
    customer: "Lourdes Santos",
    reference: "CS-1031",
    total: "₱ 68,500",
    balance: "₱ 18,500",
    aging: "31–60",
    installments: [
      { n: 1, due: "2026-07-18", amount: "₱ 50,000", paid: "₱ 50,000", balance: "₱ 0", status: "Paid" },
      { n: 2, due: "2026-08-18", amount: "₱ 18,500", paid: "₱ 0", balance: "₱ 18,500", status: "Overdue" },
    ],
  },
  {
    id: "INV-7681",
    customer: "Benedict Ramos",
    reference: "LT-0088",
    total: "₱ 185,000",
    balance: "₱ 0",
    aging: "Current",
    installments: [
      { n: 1, due: "2025-03-20", amount: "₱ 185,000", paid: "₱ 185,000", balance: "₱ 0", status: "Paid" },
    ],
  },
];

// --- Accounting (Module F) --------------------------------------------------
export type JournalEntry = {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: string;
  credit: string;
  reference: string;
};

export const JOURNAL: JournalEntry[] = [
  { id: "JE-1180", date: "2026-09-02", description: "Cash receipt — chapel deposit", account: "Cash on hand", debit: "₱ 20,000", credit: "—", reference: "INV-7701" },
  { id: "JE-1180", date: "2026-09-02", description: "Cash receipt — chapel deposit", account: "Service revenue", debit: "—", credit: "₱ 20,000", reference: "INV-7701" },
  { id: "JE-1179", date: "2026-09-01", description: "Collection — installment", account: "Cash on hand", debit: "₱ 3,600", credit: "—", reference: "INV-7698" },
  { id: "JE-1179", date: "2026-09-01", description: "Collection — installment", account: "Receivables", debit: "—", credit: "₱ 3,600", reference: "INV-7698" },
  { id: "JE-1178", date: "2026-08-31", description: "Disbursement — flower supplier", account: "Cost of goods", debit: "₱ 4,800", credit: "—", reference: "DIS-204" },
  { id: "JE-1178", date: "2026-08-31", description: "Disbursement — flower supplier", account: "Cash on hand", debit: "—", credit: "₱ 4,800", reference: "DIS-204" },
];

// --- HR (Module G) ----------------------------------------------------------
export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "Active" | "On leave" | "Off duty";
  attendance: string;
  leaves: { type: string; remaining: number }[];
};

export const EMPLOYEES: Employee[] = [
  { id: "emp-1", name: "Althea Villanueva", role: "Funeral Director", department: "Operations", status: "Active", attendance: "8/8 this week", leaves: [{ type: "Vacation", remaining: 5 }, { type: "Sick", remaining: 10 }] },
  { id: "emp-2", name: "Jerome Navarro", role: "Embalmer", department: "Preparation", status: "On leave", attendance: "6/8 this week", leaves: [{ type: "Vacation", remaining: 2 }, { type: "Sick", remaining: 8 }] },
  { id: "emp-3", name: "Marisol Ocampo", role: "Chapel Coordinator", department: "Operations", status: "Active", attendance: "8/8 this week", leaves: [{ type: "Vacation", remaining: 7 }, { type: "Sick", remaining: 10 }] },
  { id: "emp-4", name: "Reynaldo Cruz", role: "Driver", department: "Fleet", status: "Off duty", attendance: "7/8 this week", leaves: [{ type: "Vacation", remaining: 3 }, { type: "Sick", remaining: 6 }] },
  { id: "emp-5", name: "Divina Ramos", role: "Cashier", department: "Finance", status: "Active", attendance: "8/8 this week", leaves: [{ type: "Vacation", remaining: 5 }, { type: "Sick", remaining: 10 }] },
];

// --- Documents (Module J) ---------------------------------------------------
export type Document = {
  id: string;
  name: string;
  type: string;
  related: string;
  status: "Draft" | "Generated" | "Sent" | "Signed";
  date: string;
};

export const DOCUMENTS: Document[] = [
  { id: "doc-1", name: "Service contract — Dela Cruz", type: "Service contract", related: "CS-1042", status: "Generated", date: "2026-09-02" },
  { id: "doc-2", name: "Official receipt — INV-7701", type: "Official receipt", related: "INV-7701", status: "Sent", date: "2026-09-02" },
  { id: "doc-3", name: "Interment authorization — Santos", type: "Authorization", related: "CS-1031", status: "Signed", date: "2026-07-18" },
  { id: "doc-4", name: "Lot purchase agreement — Ramos", type: "Purchase agreement", related: "LT-0088", status: "Signed", date: "2025-03-20" },
  { id: "doc-5", name: "Certificate of ownership — Dela Cruz", type: "Certificate", related: "LT-0088", status: "Draft", date: "2026-08-28" },
];

// --- Audit (Module J admin) ------------------------------------------------
export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  when: string;
  branch: string;
};

export const AUDIT: AuditEntry[] = [
  { id: "a-1", actor: "divina.ramos", action: "Recorded payment", target: "INV-7701", when: "2026-09-02 14:22", branch: "Isabela City" },
  { id: "a-2", actor: "althea.villanueva", action: "Opened case", target: "CS-1042", when: "2026-09-02 10:05", branch: "Isabela City" },
  { id: "a-3", actor: "admin", action: "Updated role permissions", target: "Cashier", when: "2026-09-01 16:40", branch: "Head Office" },
  { id: "a-4", actor: "jerome.navarro", action: "Completed preparation checklist", target: "CS-1040", when: "2026-08-31 18:10", branch: "Isabela City" },
  { id: "a-5", actor: "marisol.ocampo", action: "Reserved chapel", target: "Chapel B", when: "2026-08-31 11:02", branch: "Isabela City" },
];

// --- Users & roles (admin) -------------------------------------------------
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: "Active" | "Invited" | "Disabled" | "On leave";
};

export const USERS: User[] = [
  { id: "u-1", name: "Admin", email: "admin@gmail.com", role: "Super Administrator", branch: "Head Office", status: "Active" },
  { id: "u-2", name: "Althea Villanueva", email: "althea@villamemorial.ph", role: "Funeral Director", branch: "Isabela City", status: "Active" },
  { id: "u-3", name: "Divina Ramos", email: "divina@villamemorial.ph", role: "Cashier", branch: "Isabela City", status: "Active" },
  { id: "u-4", name: "Jerome Navarro", email: "jerome@villamemorial.ph", role: "Embalmer", branch: "Isabela City", status: "On leave" },
  { id: "u-5", name: "Marisol Ocampo", email: "marisol@villamemorial.ph", role: "Chapel Coordinator", branch: "Isabela City", status: "Active" },
  { id: "u-6", name: "Reynaldo Cruz", email: "reynaldo@villamemorial.ph", role: "Driver", branch: "Isabela City", status: "Active" },
];

// --- Workflows (admin) -----------------------------------------------------
export type WorkflowStage = {
  id: string;
  name: string;
  requiredDocs: string[];
  requiredTasks: string[];
  deadline: string;
};

export type Workflow = {
  id: string;
  name: string;
  stages: WorkflowStage[];
};

export const WORKFLOWS: Workflow[] = [
  {
    id: "wf-funeral",
    name: "Funeral case",
    stages: [
      { id: "s1", name: "Inquiry", requiredDocs: [], requiredTasks: ["Capture intake"], deadline: "" },
      { id: "s2", name: "Arrangement", requiredDocs: ["Death certificate", "Authorization"], requiredTasks: ["Select services"], deadline: "+48h" },
      { id: "s3", name: "Schedule", requiredDocs: [], requiredTasks: ["Assign chapel", "Assign vehicle"], deadline: "+24h" },
      { id: "s4", name: "Service delivery", requiredDocs: [], requiredTasks: ["Run checklists"], deadline: "" },
      { id: "s5", name: "Close", requiredDocs: ["Official receipt"], requiredTasks: ["Archive"], deadline: "" },
    ],
  },
  {
    id: "wf-interment",
    name: "Interment",
    stages: [
      { id: "i1", name: "Verify deceased", requiredDocs: ["Death certificate"], requiredTasks: [], deadline: "" },
      { id: "i2", name: "Verify lot", requiredDocs: ["Lot records"], requiredTasks: [], deadline: "" },
      { id: "i3", name: "Verify payment", requiredDocs: ["Official receipt"], requiredTasks: [], deadline: "" },
      { id: "i4", name: "Schedule & assign", requiredDocs: ["Permits"], requiredTasks: ["Assign team"], deadline: "+24h" },
      { id: "i5", name: "Interment", requiredDocs: [], requiredTasks: ["Update GIS"], deadline: "" },
    ],
  },
];

// --- Tenant settings (admin) ----------------------------------------------
export const MODULE_FLAGS = [
  { key: "A", name: "Customers & families", on: true },
  { key: "B", name: "Memorial plans", on: true },
  { key: "C", name: "Catalog & chapels", on: true },
  { key: "D", name: "Lots & cemetery map", on: true },
  { key: "E", name: "Billing & collections", on: true },
  { key: "F", name: "Accounting", on: true },
  { key: "G", name: "HR", on: true },
  { key: "H", name: "Cases & ops board", on: true },
  { key: "I", name: "Dashboards & reports", on: true },
  { key: "J", name: "Documents", on: true },
];

export const TERMINOLOGY = [
  { key: "property", default: "Property", villa: "Lots", loyola: "Plots" },
  { key: "customer", default: "Customer", villa: "Customer", loyola: "Client" },
  { key: "case", default: "Case", villa: "Case", loyola: "Service" },
  { key: "package", default: "Package", villa: "Package", loyola: "Bundle" },
];

// --- Inventory (Module C) --------------------------------------------------
export type StockItem = {
  id: string;
  name: string;
  category: "Casket" | "Urn" | "Flowers" | "Marker" | "Keepsake";
  onHand: number;
  reorderAt: number;
  unit: string;
};

export const INVENTORY: StockItem[] = [
  { id: "inv-1", name: "Premium hardwood casket", category: "Casket", onHand: 4, reorderAt: 2, unit: "pcs" },
  { id: "inv-2", name: "Classic metal casket", category: "Casket", onHand: 1, reorderAt: 3, unit: "pcs" },
  { id: "inv-3", name: "Oak keepsake urn", category: "Urn", onHand: 12, reorderAt: 5, unit: "pcs" },
  { id: "inv-4", name: "Ceramic memorial urn", category: "Urn", onHand: 8, reorderAt: 5, unit: "pcs" },
  { id: "inv-5", name: "White lily arrangement", category: "Flowers", onHand: 6, reorderAt: 3, unit: "sets" },
  { id: "inv-6", name: "Rose memorial spray", category: "Flowers", onHand: 2, reorderAt: 4, unit: "sets" },
  { id: "inv-7", name: "Granite lawn marker", category: "Marker", onHand: 9, reorderAt: 4, unit: "pcs" },
  { id: "inv-8", name: "Bronze memorial plaque", category: "Marker", onHand: 3, reorderAt: 2, unit: "pcs" },
  { id: "inv-9", name: "Memorial candle set", category: "Keepsake", onHand: 20, reorderAt: 10, unit: "sets" },
  { id: "inv-10", name: "Leather guest book", category: "Keepsake", onHand: 14, reorderAt: 6, unit: "pcs" },
];

// --- Pricing rules (Module C) ----------------------------------------------
export type PricingRule = {
  id: string;
  scope: string;
  appliesTo: string;
  base: string;
  rule: string;
};

export const PRICING_RULES: PricingRule[] = [
  { id: "pr-1", scope: "All plans", appliesTo: "Memorial plans", base: "List price", rule: "Senior citizens receive a 5% discount" },
  { id: "pr-2", scope: "Garden of Roses", appliesTo: "Plan", base: "₱ 120,000", rule: "10% down · balance over 5 years" },
  { id: "pr-3", scope: "Heritage Bronze", appliesTo: "Plan", base: "₱ 85,000", rule: "10% down · balance over 3 years" },
  { id: "pr-4", scope: "Chapel viewing", appliesTo: "Service", base: "₱ 6,000", rule: "Day 4+ billed at 50%" },
  { id: "pr-5", scope: "Cremation package", appliesTo: "Package", base: "₱ 68,500", rule: "Includes urn (base model)" },
  { id: "pr-6", scope: "Flowers", appliesTo: "Merchandise", base: "List price", rule: "Wake bookings receive 10% off" },
];

// --- Vehicle dispatch (Module H) -------------------------------------------
export type DispatchTrip = {
  id: string;
  vehicle: string;
  driver: string;
  title: string;
  date: string;
  status: "Assigned" | "In transit" | "Completed";
};

export const DISPATCH_TRIPS: DispatchTrip[] = [
  { id: "tr-1", vehicle: "Hearse 1", driver: "Reynaldo Cruz", title: "Dela Cruz — chapel to park", date: "2026-09-03 09:00", status: "Assigned" },
  { id: "tr-2", vehicle: "Van 2", driver: "Reynaldo Cruz", title: "Santos — retrieval", date: "2026-09-04 13:00", status: "In transit" },
  { id: "tr-3", vehicle: "Family SUV", driver: "B. Ocampo", title: "Mercado — family procession", date: "2026-09-03 14:00", status: "Completed" },
];

// --- Work orders / maintenance (Module D) ----------------------------------
export type WorkOrder = {
  id: string;
  lot: string;
  title: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In progress" | "Done";
  opened: string;
  assignee: string;
};

export const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-501", lot: "A-108", title: "Reset leaning lawn marker", priority: "Medium", status: "In progress", opened: "2026-08-15", assignee: "Grounds team" },
  { id: "WO-502", lot: "B-204", title: "Clear overgrowth around lot", priority: "Low", status: "Open", opened: "2026-09-01", assignee: "Grounds team" },
  { id: "WO-503", lot: "C-302", title: "Repair pathway paver near lot", priority: "High", status: "Open", opened: "2026-09-02", assignee: "Maintenance" },
  { id: "WO-504", lot: "A-105", title: "Restore urn vase", priority: "Low", status: "Done", opened: "2026-08-20", assignee: "Grounds team" },
];

// --- Staff notifications (admin/ops) ---------------------------------------
export type StaffNotice = {
  id: string;
  title: string;
  detail: string;
  channel: string;
  time: string;
  unread: boolean;
};

export const STAFF_NOTICES: StaffNotice[] = [
  { id: "SN-1", title: "New web order placed", detail: "ORD-5021 from the public site is awaiting confirmation.", channel: "Commerce", time: "2h", unread: true },
  { id: "SN-2", title: "Case ready for intake", detail: "CS-1042 needs the deceased's details completed.", channel: "Operations", time: "4h", unread: true },
  { id: "SN-3", title: "Payment received", detail: "INV-7698 installment of ₱3,600 was collected.", channel: "Finance", time: "1d", unread: true },
  { id: "SN-4", title: "Low stock alert", detail: "Classic metal casket is below its reorder point.", channel: "Catalog", time: "1d", unread: false },
  { id: "SN-5", title: "Website inquiry", detail: "Marites Aquino asked about chapel packages.", channel: "CRM", time: "2d", unread: false },
];

// --- Sales pipeline (Module A/B staff view) --------------------------------
export type PipelineStage = {
  id: string;
  name: string;
  count: number;
  amount: string;
};

export const PIPELINE: PipelineStage[] = [
  { id: "ps-1", name: "New inquiry", count: 5, amount: "₱ 0" },
  { id: "ps-2", name: "Consultation booked", count: 3, amount: "₱ 0" },
  { id: "ps-3", name: "Quote sent", count: 4, amount: "₱ 640,000" },
  { id: "ps-4", name: "Arrangement / contract", count: 2, amount: "₱ 380,000" },
  { id: "ps-5", name: "Closed", count: 6, amount: "₱ 920,000" },
];

export type PipelineRow = {
  id: string;
  name: string;
  interest: string;
  stage: string;
  value: string;
  owner: string;
};

export const PIPELINE_ROWS: PipelineRow[] = [
  { id: "P-2101", name: "Sarah Jenkins", interest: "Traditional Burial Plan", stage: "Quote sent", value: "₱ 120,000", owner: "Maria F." },
  { id: "P-2098", name: "Michael Torres", interest: "Cremation Memorial", stage: "Consultation booked", value: "₱ 85,000", owner: "Maria F." },
  { id: "P-2095", name: "Eleanor Vance", interest: "Pre-need Package", stage: "New inquiry", value: "₱ 96,000", owner: "Maria F." },
  { id: "P-2090", name: "Angelo Reyes", interest: "Premium Lawn Lot", stage: "Arrangement / contract", value: "₱ 185,000", owner: "Maria F." },
  { id: "P-2087", name: "Carmen Lee", interest: "Garden Niches", stage: "Quote sent", value: "₱ 567,000", owner: "Maria F." },
];
