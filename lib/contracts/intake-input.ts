import type { CaseIntakeInput } from "@/lib/api-client/operations";

/**
 * Normalises a browser form body into the intake payload funeral-cases accepts.
 *
 * An untouched form field arrives as `""`, which is not the same as "clear this value" and
 * certainly not the same as intake having been captured — the service treats a blank as
 * absent, and sending them through would mark a coordinator reassignment as completed
 * intake. So empty strings are dropped rather than forwarded.
 */
const TEXT_FIELDS = [
  "deceased_name",
  "assigned_coordinator",
  "date_of_death",
  "deceased_date_of_birth",
  "deceased_gender",
  "deceased_civil_status",
  "client_name",
  "client_gender",
  "client_civil_status",
  "client_address",
  "client_contact",
  "client_facebook",
  "client_email",
  "client_relationship",
  "client_id_presented",
  "client_id_number",
  "co_maker_name",
  "contract_date",
] as const;

export function intakeFromForm(body: unknown): CaseIntakeInput {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = typeof raw[field] === "string" ? (raw[field] as string).trim() : "";
    if (value !== "") {
      out[field] = value;
    }
  }
  // A checkbox is meaningful in both states, so it is sent whenever the form supplied it.
  if (typeof raw.senior_citizen === "boolean") {
    out.senior_citizen = raw.senior_citizen;
  }
  return out as CaseIntakeInput;
}
