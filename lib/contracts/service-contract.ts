/**
 * Builds the `agreement` payload for Villa's at-need Service Contract from the records the
 * platform already holds: the case (who the services were for) and its linked order (what
 * was rendered, and at what price).
 *
 * documents ⓡ holds no funeral vocabulary (ADR-005), so every Villa word on the printed
 * page is assembled here and passed in as a template variable. The terms themselves come
 * from `villa-terms.ts`, versioned by effective date.
 *
 * The intake block — who died, when, their civil status and senior-citizen entitlement,
 * who the client is, how they are related, what ID they showed, and who co-signs — comes
 * from the case, captured at the counter. A case that arrived from a fulfilled order has
 * no intake until staff complete it, and those fields print as an em dash rather than a
 * guess: a printed legal artifact is the last place to fabricate data.
 *
 * STILL NOT CAPTURED: the guarantee deductions (LGU / DSWD / SSS / GSIS / life plan),
 * which are third-party receivables with their own 3-day deadline and reversal rule, not
 * a form field. Until that sub-ledger exists the deductions section is omitted.
 */
import type { Case } from "@/lib/api-client/operations";
import type { OrderResponse } from "@/lib/api-client/commerce";
import { resolveTerms, termsByVersion, type TermsRevision } from "@/lib/contracts/villa-terms";

/** Request body of `POST /documents/api/v1/documents/generate` (contract KEB-D4-02). */
export type GenerateDocumentInput = {
  template: string;
  variables: Record<string, unknown>;
  related_case_number?: string;
  related_order_number?: string;
};

type Row = { label: string; value?: string; note?: string; amount_minor_units?: number | string };

/**
 * Villa's clause 1: the balance falls due nine days after the contract date. Computed here
 * so the printed contract states an actual date rather than asking the counter to count.
 */
export const PAYMENT_TERM_DAYS = 9;

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    throw new Error(`not a date: ${isoDate}`);
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function buildServiceContract({
  kase,
  order,
  tenantName,
  signedOn,
  termsVersion,
}: {
  kase: Case;
  order: OrderResponse | null;
  tenantName: string;
  /** ISO date the contract is dated — the day it is printed and signed. */
  signedOn: string;
  /** Set when re-rendering an existing contract; omitted for a new one. */
  termsVersion?: string;
}): GenerateDocumentInput {
  const terms: TermsRevision = termsVersion
    ? (termsByVersion(termsVersion) ??
      (() => {
        throw new Error(`unknown terms version ${termsVersion}`);
      })())
    : resolveTerms("service_contract", signedOn);

  const currency = order?.currency ?? "PHP";
  const intake = kase.intake;

  // Villa's clause 1 runs from the date on the contract, which the counter owns — a
  // contract signed Monday and entered Tuesday is still due nine days from Monday.
  const contractDate = (intake?.contract_date || signedOn).slice(0, 10);
  const dueDate = addDays(contractDate, PAYMENT_TERM_DAYS);

  // The order's lines are what was rendered. Quantity rides in the label rather than in a
  // column of its own: Villa's paper form has a label and an amount, nothing else.
  const schedule: Row[] = (order?.items ?? []).map((item) => ({
    label: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name,
    amount_minor_units: item.unit_price_cents * item.quantity,
  }));

  // Services recorded on the case but absent from the order still belong on the contract —
  // as lines with no price, not as lines with a zero.
  const ordered = new Set((order?.items ?? []).map((i) => i.name));
  for (const service of kase.services) {
    if (!ordered.has(service)) {
      schedule.push({ label: service, note: "not priced on the linked order" });
    }
  }

  const totals: Row[] = [];
  if (order) {
    totals.push({
      label: "Total cost of services rendered",
      amount_minor_units: order.total_cents,
    });
    totals.push({
      label: "Grand total after deductions",
      note: "no guarantee instruments recorded",
      amount_minor_units: order.total_cents,
    });
    totals.push({
      label: "Balance and due date",
      note: `on or before ${dueDate} (${PAYMENT_TERM_DAYS} days from the date of this contract)`,
      amount_minor_units: order.status === "paid" ? 0 : order.total_cents,
    });
  }

  const idPresented = [intake?.client_id_presented, intake?.client_id_number]
    .filter(Boolean)
    .join(" — ");

  const particulars: Row[] = [
    { label: "Name of deceased", value: kase.deceased_name },
    { label: "Date of death", value: intake?.date_of_death ?? "" },
    { label: "Date of birth", value: intake?.deceased_date_of_birth ?? "" },
    { label: "Gender", value: intake?.deceased_gender ?? "" },
    { label: "Civil status", value: intake?.deceased_civil_status ?? "" },
    // Printed only when true: the paper form's checkbox carries an entitlement, and an
    // explicit "no" on a contract reads as a claim nobody made.
    ...(intake?.senior_citizen ? [{ label: "Senior citizen", value: "Yes" }] : []),
    { label: "Name of client", value: intake?.client_name ?? order?.customer_name ?? "" },
    { label: "Address", value: intake?.client_address ?? "" },
    { label: "Contact", value: intake?.client_contact ?? "" },
    { label: "Relationship to deceased", value: intake?.client_relationship ?? "" },
    { label: "ID presented", value: idPresented },
    { label: "Case number", value: kase.case_number },
    { label: "Coordinator of record", value: kase.assigned_coordinator },
    { label: "Linked order", value: order?.number ?? kase.linked_order_number ?? "" },
  ];

  return {
    template: "agreement",
    related_case_number: kase.case_number,
    related_order_number: order?.number ?? kase.linked_order_number ?? undefined,
    variables: {
      agreement_title: terms.title,
      reference: kase.case_number,
      reference_label: "Case",
      party_first: terms.partyFirst,
      party_first_role: terms.partyFirstRole,
      // The client is who signs, which is not always who paid: the paper contract names a
      // client and an optional co-maker, jointly and solidarily liable.
      party_second: intake?.client_name || order?.customer_name || "—",
      party_third: intake?.co_maker_name ?? undefined,
      party_second_role: terms.partySecondRole,
      party_third_role: terms.partyThirdRole,
      effective_date: contractDate,
      terms_version: terms.version,
      tenant_name: tenantName,
      currency,
      particulars_title: "Particulars",
      particulars,
      schedule_title: terms.scheduleTitle,
      schedule,
      // Deductions have no source yet; the heading would print above an empty table, so
      // the section is omitted entirely until the guarantee sub-ledger exists.
      adjustments: [],
      totals,
      clauses_title: "Terms and conditions",
      clauses: terms.clauses,
      signatories: [
        {
          name: intake?.client_name || order?.customer_name || "",
          role: "Client (sign over printed name)",
        },
        { name: intake?.co_maker_name || "", role: "Co-maker (sign over printed name)" },
        { name: "Armando A. Villa", role: "Funeraria Villa" },
      ],
      notarial_note: terms.notarialNote,
    },
  };
}
