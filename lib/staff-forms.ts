/**
 * The office's form register — ONE list behind the Forms hub (`/staff/forms`).
 *
 * The captain's follow-up: "all forms should have a dedicated page for it, all in
 * one place so it's much easier for admin to navigate." This module is that one
 * place's data: every form the office fills, where its dedicated page lives, and
 * — honestly — whether that page works today or waits on a service.
 *
 * It is deliberately STATIC and hand-checked: an entry is only "working" when its
 * page writes a durable store (the enquiry journal, the case store, the billing
 * store, the membership store). A form whose page exists but whose service does not
 * is marked `waits`; a form the office only opens from a record is marked
 * `contextual`. `tests/unit/forms-hub.test.ts` walks every entry and fails a page
 * file that is missing, so this list cannot point at a 404.
 */

export type StaffFormStatus = "working" | "waits" | "public" | "contextual";

export type StaffForm = {
  key: string;
  name: string;
  /** One line: what the form is for. */
  purpose: string;
  /** The dedicated page. */
  href: string;
  status: StaffFormStatus;
};

export type StaffFormGroup = {
  key: string;
  label: string;
  /** One line: what the group gathers. */
  blurb: string;
  forms: StaffForm[];
};

export const STAFF_FORMS: StaffFormGroup[] = [
  {
    key: "counter",
    label: "Counter & cases",
    blurb: "What the front desk fills while a family is in front of it.",
    forms: [
      {
        key: "inquiry",
        name: "Log an inquiry",
        purpose: "A call, a walk-in or a message, recorded once and shown on the board.",
        href: "/staff/inquiries/new",
        status: "working",
      },
      {
        key: "case",
        name: "Open a case",
        purpose: "The funeral arrangement intake — the case that carries the family's request.",
        href: "/staff/cases/new",
        status: "working",
      },
      {
        key: "service_contract",
        name: "Service contract",
        purpose: "The priced contract for a case, from its intake and its order.",
        href: "/staff/cases",
        status: "contextual",
      },
      {
        key: "document",
        name: "Upload a document",
        purpose: "File a paper against the office repository, with a case or order link.",
        href: "/staff/documents/new",
        status: "working",
      },
    ],
  },
  {
    key: "money",
    label: "Money",
    blurb: "The counter's receipts and the payments they settle.",
    forms: [
      {
        key: "payment",
        name: "Record a payment",
        purpose: "Post a payment against an invoice and issue its official receipt.",
        href: "/staff/billing/record-payment",
        status: "working",
      },
      {
        key: "provisional_receipt",
        name: "Issue a provisional receipt",
        purpose: "The counter's paper slip before the official receipt exists.",
        href: "/staff/billing/provisional-receipts/new",
        status: "working",
      },
    ],
  },
  {
    key: "plans",
    label: "Plans & property",
    blurb: "Pre-need plans and the park's lots.",
    forms: [
      {
        key: "membership",
        name: "Membership application",
        purpose: "The Villa Memorial Plan enrolment folio, at the published rate.",
        href: "/staff/plans/membership/new",
        status: "working",
      },
      {
        key: "lot_application",
        name: "Lot purchase application",
        purpose: "The lot buyer's demographics, beneficiaries and financing.",
        href: "/staff/property",
        status: "contextual",
      },
    ],
  },
  {
    key: "people",
    label: "People & staff",
    blurb: "The records the office keeps about people.",
    forms: [
      {
        key: "customer",
        name: "Customer record",
        purpose: "A family account. Writes to crm-families, which is not built.",
        href: "/staff/customers/new",
        status: "waits",
      },
      {
        key: "employee",
        name: "Employee record",
        purpose: "A staff member. The hr service is not built.",
        href: "/staff/hr/new",
        status: "waits",
      },
    ],
  },
  {
    key: "public",
    label: "Public forms",
    blurb: "What families fill in themselves — the office reads the result.",
    forms: [
      {
        key: "contact",
        name: "Contact us",
        purpose: "The public message form; a coordinator answers it.",
        href: "/contact",
        status: "public",
      },
      {
        key: "appointment",
        name: "Book an appointment",
        purpose: "A time to sit down with a coordinator at the office.",
        href: "/appointments",
        status: "public",
      },
      {
        key: "quote",
        name: "Request a quote",
        purpose: "A priced request for services, caskets, lots or plans.",
        href: "/quote",
        status: "public",
      },
    ],
  },
];

/** Every entry, flattened — the hub's list and the test's walk. */
export function allStaffForms(): StaffForm[] {
  return STAFF_FORMS.flatMap((group) => group.forms);
}
