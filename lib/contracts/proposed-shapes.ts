/**
 * Proposed contract shapes (platform-contract pre-wire).
 *
 * These are the field lists of the packets the platform dev is being asked to
 * freeze (`data/villa-platform-contracts-plan/report.md` §3). They are NOT a
 * contract: nothing here is served or validated at runtime. They exist so the
 * pre-wire is executable — `tests/fixture-contract/proposed-contracts.test.ts`
 * reads today's recorded fixtures through the shared validation layer
 * (`lib/contracts/validate.ts`) against these specs, so a fixture that drifts from
 * the proposed shape fails loudly, and a future live `toX` reader can import the
 * same spec instead of re-deriving it.
 *
 * Vocabulary note: a field marked `optional` may be absent today. When the
 * contract freezes and the field becomes required, tighten the spec — never the
 * other way.
 */
import type { ShapeField } from "@/lib/contracts/validate";

const S = (key: string): ShapeField => ({ key, type: "string" });
const I = (key: string): ShapeField => ({ key, type: "integer" });
const N = (key: string): ShapeField => ({ key, type: "number" });
const B = (key: string): ShapeField => ({ key, type: "boolean" });
const O = (key: string): ShapeField => ({ key, type: "object" });
const A = (key: string): ShapeField => ({ key, type: "array" });
const optNullable = (key: string, type: ShapeField["type"]): ShapeField => ({
  key,
  type,
  optional: true,
  nullable: true,
});

export const PROPOSED_SHAPES = {
  /** C1 crm-families — a customer row. */
  "crm.customer": [
    S("id"),
    S("first_name"),
    S("last_name"),
    S("email"),
    S("phone"),
    S("status"),
    optNullable("family_id", "string"),
    S("registered_at"),
  ],
  /** C1 crm-families — an enquiry row. */
  "crm.inquiry": [
    S("id"),
    S("reference"),
    O("person"),
    S("source"),
    S("topic"),
    S("message"),
    S("assigned_to"),
    S("status"),
    S("received_at"),
  ],
  /** C2 hr — an employee row. */
  "hr.employee": [
    S("id"),
    S("employee_number"),
    S("first_name"),
    S("last_name"),
    S("role"),
    S("department"),
    S("employment_status"),
    S("hire_date"),
    S("phone"),
    S("email"),
    A("attendance"),
    A("leave"),
  ],
  /** C8 family API — the family snapshot envelope. */
  "family.snapshot": [
    S("tenant_id"),
    O("family"),
    O("loved_one"),
    O("plan_summary"),
    O("balance"),
    { key: "balance_cents", type: "object", optional: true },
    A("recent_documents"),
  ],
  /** C9 agent workspace — a prospect row. */
  "agent.prospect": [
    S("id"),
    S("name"),
    S("phone"),
    S("email"),
    S("source"),
    S("interest"),
    S("want"),
    S("stage"),
    S("owner"),
    N("possible_value_cents"),
    S("first_contact_at"),
    S("last_contact_at"),
    A("stage_history"),
    S("next_action"),
    S("urgency"),
    S("best_time"),
    S("notes"),
  ],
  /** C15 commission engine — the recorded engine state. */
  "commission.engine": [
    B("configured"),
    S("placeholder_note"),
    O("statement_period"),
    O("target"),
  ],
  /** C7 notifications — a template row. */
  "notification.template": [
    S("id"),
    S("message"),
    S("event"),
    S("when"),
    A("audiences"),
    A("channels"),
  ],
  /** C28 inventory — a stock item row (price is never stored here). */
  "inventory.item": [
    S("id"),
    S("sku"),
    S("name"),
    S("category"),
    S("unit"),
    optNullable("supplier", "string"),
    optNullable("catalogue_sku", "string"),
    optNullable("cost_cents", "integer"),
    I("on_hand"),
    optNullable("location", "string"),
    I("reorder_level"),
  ],
  /** C4 accounting — a journal entry row. */
  "accounting.entry": [
    S("id"),
    S("date"),
    S("reference"),
    S("description"),
    optNullable("case_number", "string"),
    optNullable("order_number", "string"),
    A("lines"),
  ],
  /** C18 digital memorials — the recorded store envelope (no memorial is published). */
  "memorials.envelope": [
    S("service_state"),
    A("memorials"),
    { key: "consent_record", type: "object", optional: true },
  ],
} as const satisfies Record<string, readonly ShapeField[]>;

export type ProposedShapeKey = keyof typeof PROPOSED_SHAPES;
