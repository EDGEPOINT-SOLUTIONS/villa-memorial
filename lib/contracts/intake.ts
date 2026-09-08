import type { CaseIntake } from "@/lib/api-client/operations";

/**
 * The intake form's value shape + its mapping to/from the case record.
 *
 * Pure functions (no React) so the round-trip — form values → case intake → form
 * values — is unit-testable, mirroring how `CaseIntake` is additive and tolerant:
 * a blank form field is `""`, an uncaptured record field is `null`, and the mapping
 * keeps the two honest rather than blurring them.
 *
 * Client-visible wording is the component's job; this module only carries values.
 */
export type IntakeValues = {
  deceased_name: string;
  assigned_coordinator: string;
  date_of_death: string;
  deceased_date_of_birth: string;
  deceased_gender: string;
  deceased_civil_status: string;
  senior_citizen: boolean;
  client_name: string;
  client_gender: string;
  client_civil_status: string;
  client_address: string;
  client_contact: string;
  client_facebook: string;
  client_email: string;
  client_relationship: string;
  client_id_presented: string;
  client_id_number: string;
  co_maker_name: string;
  contract_date: string;
};

export function emptyIntake(overrides: Partial<IntakeValues> = {}): IntakeValues {
  return {
    deceased_name: "",
    assigned_coordinator: "",
    date_of_death: "",
    deceased_date_of_birth: "",
    deceased_gender: "",
    deceased_civil_status: "",
    senior_citizen: false,
    client_name: "",
    client_gender: "",
    client_civil_status: "",
    client_address: "",
    client_contact: "",
    client_facebook: "",
    client_email: "",
    client_relationship: "",
    client_id_presented: "",
    client_id_number: "",
    co_maker_name: "",
    contract_date: "",
    ...overrides,
  };
}

export function intakeToValues(
  intake: CaseIntake | null,
  base: Partial<IntakeValues>,
): IntakeValues {
  return emptyIntake({
    ...base,
    date_of_death: intake?.date_of_death ?? "",
    deceased_date_of_birth: intake?.deceased_date_of_birth ?? "",
    deceased_gender: intake?.deceased_gender ?? "",
    deceased_civil_status: intake?.deceased_civil_status ?? "",
    senior_citizen: intake?.senior_citizen ?? false,
    client_name: intake?.client_name ?? "",
    client_gender: intake?.client_gender ?? "",
    client_civil_status: intake?.client_civil_status ?? "",
    client_address: intake?.client_address ?? "",
    client_contact: intake?.client_contact ?? "",
    client_facebook: intake?.client_facebook ?? "",
    client_email: intake?.client_email ?? "",
    client_relationship: intake?.client_relationship ?? "",
    client_id_presented: intake?.client_id_presented ?? "",
    client_id_number: intake?.client_id_number ?? "",
    co_maker_name: intake?.co_maker_name ?? "",
    contract_date: intake?.contract_date ?? "",
  });
}
