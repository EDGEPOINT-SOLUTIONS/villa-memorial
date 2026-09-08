import type {
  CivilStatus,
  Gender,
  IntermentInclusion,
  ModeOfPayment,
  PurchaseApplication,
} from "@/lib/contracts/purchase-application";

/**
 * Server/client-safe bridge between a stored `PurchaseApplication` (integer minor units)
 * and the capture form's editable values (pesos as a counter types them).
 *
 * Pure value mapping only — no "use client", no server imports — so the same functions
 * shape the initial state server-side on the apply page and inside the client form.
 */
export type PurchaseApplicationFormValues = {
  application_date: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  date_of_birth: string;
  civil_status: CivilStatus | "";
  gender: Gender | "";
  religion: string;
  citizenship: string;
  contact_number: string;
  email: string;
  tin: string;
  gsis_sss_number: string;
  alternative_contact_number: string;
  facebook_account: string;
  address: string;
  occupation: string;
  employer: string;
  employer_address: string;
  employer_telephone: string;
  beneficiaries: Array<{ name: string; age: string; relationship: string }>;
  classification: string;
  basic_price_cents: string;
  total_contract_price_cents: string;
  mcf_cents: string;
  vat_cents: string;
  mode_of_payment: ModeOfPayment | "";
  amortization_value: string;
  amortization_unit: "years" | "months" | "";
  interment_funeral_bundle_inclusion: IntermentInclusion | "";
  others_insurance: string;
  dpa_consent: boolean;
  sales_agent_name: string;
};

/** Cents → the peso string a counter types, for pre-filling the form from a record. */
export function centsToPesoInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

/** A stored application → the form's editable values (empty where nothing was captured). */
export function applicationToValues(
  application: PurchaseApplication | null,
  base: Partial<PurchaseApplicationFormValues> = {},
): PurchaseApplicationFormValues {
  return {
    application_date: application?.application_date ?? new Date().toISOString().slice(0, 10),
    last_name: application?.last_name ?? "",
    first_name: application?.first_name ?? "",
    middle_name: application?.middle_name ?? "",
    date_of_birth: application?.date_of_birth ?? "",
    civil_status: (application?.civil_status as CivilStatus | null) ?? "",
    gender: (application?.gender as Gender | null) ?? "",
    religion: application?.religion ?? "",
    citizenship: application?.citizenship ?? "",
    contact_number: application?.contact_number ?? "",
    email: application?.email ?? "",
    tin: application?.tin ?? "",
    gsis_sss_number: application?.gsis_sss_number ?? "",
    alternative_contact_number: application?.alternative_contact_number ?? "",
    facebook_account: application?.facebook_account ?? "",
    address: application?.address ?? "",
    occupation: application?.occupation ?? "",
    employer: application?.employer ?? "",
    employer_address: application?.employer_address ?? "",
    employer_telephone: application?.employer_telephone ?? "",
    beneficiaries:
      application?.beneficiaries.map((b) => ({
        name: b.name,
        age: b.age === null ? "" : String(b.age),
        relationship: b.relationship,
      })) ?? [],
    classification: application?.classification ?? "",
    basic_price_cents: centsToPesoInput(application?.basic_price_cents ?? null),
    total_contract_price_cents: centsToPesoInput(application?.total_contract_price_cents ?? null),
    mcf_cents: centsToPesoInput(application?.mcf_cents ?? null),
    vat_cents: centsToPesoInput(application?.vat_cents ?? null),
    mode_of_payment: (application?.mode_of_payment as ModeOfPayment | null) ?? "",
    amortization_value:
      application?.amortization_value === null ? "" : String(application?.amortization_value ?? ""),
    amortization_unit: (application?.amortization_unit as "years" | "months" | null) ?? "",
    interment_funeral_bundle_inclusion:
      (application?.interment_funeral_bundle_inclusion as IntermentInclusion | null) ?? "",
    others_insurance: application?.others_insurance ?? "",
    dpa_consent: application?.dpa_consent ?? false,
    sales_agent_name: application?.sales_agent_name ?? "",
    ...base,
  };
}
