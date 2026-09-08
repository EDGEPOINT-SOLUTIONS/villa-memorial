"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type {
  CivilStatus,
  Gender,
  IntermentInclusion,
  ModeOfPayment,
} from "@/lib/contracts/purchase-application";
import {
  DPA_CONSENT_STATEMENT,
  MODES_OF_PAYMENT,
  purchaseTerms,
} from "@/lib/contracts/purchase-application";
import type { TermsRevision } from "@/lib/contracts/villa-terms";

/**
 * Villa's lot Purchase Application (Track B, FORMS_PLAN gap 2) as one capture screen.
 *
 * The paper being digitized is the 2026 combined Purchase Application + Agreement; this
 * form captures its full buyer block, beneficiaries (age + relationship), lot selection
 * with Villa's own classification words, the written price rows (basic price, MCF, VAT,
 * total contract price — entered as the counter writes them, NEVER computed here), the
 * mode of payment and amortisation term, the data-privacy consent, and the sales-agent
 * co-signature. The classification options and the revision-specific rows follow the
 * terms revision the application date resolves to, so the capture matches the paper Villa
 * will actually sign.
 *
 * Business-rule boundary: nothing here prices, derives, or validates against the price
 * list — every figure is the counter's written number, and the screen says so. Finance
 * rules are dev domain. The shape itself is not frozen by any contract; the BFF answers
 * honestly when it cannot persist (see lib/api-client/purchase-applications.ts).
 */

// The editable-values type lives in a server-safe module (lib/contracts/
// purchase-application-values.ts) so the server apply page and this client form share it
// across the "use client" boundary.
import type { PurchaseApplicationFormValues } from "@/lib/contracts/purchase-application-values";
export type { PurchaseApplicationFormValues };

export function PurchaseApplicationForm({
  initial,
  lotId,
  lotNumber,
  lotHeldFor,
  lotStatus,
  submitLabel,
  pendingLabel,
  intro,
}: {
  initial: PurchaseApplicationFormValues;
  lotId: string;
  lotNumber: string;
  lotHeldFor: string | null;
  lotStatus: string;
  submitLabel: string;
  pendingLabel: string;
  intro?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PurchaseApplicationFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof PurchaseApplicationFormValues>(
    key: K,
    value: PurchaseApplicationFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setBeneficiary(index: number, patch: Partial<PurchaseApplicationFormValues["beneficiaries"][number]>) {
    setValues((v) => ({
      ...v,
      beneficiaries: v.beneficiaries.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function addBeneficiary() {
    setValues((v) => ({ ...v, beneficiaries: [...v.beneficiaries, { name: "", age: "", relationship: "" }] }));
  }

  function removeBeneficiary(index: number) {
    setValues((v) => ({ ...v, beneficiaries: v.beneficiaries.filter((_, i) => i !== index) }));
  }

  // The classification options are the governing revision's own list, resolved from the
  // application date — Villa's 2025 and 2026 papers list different products.
  let terms: TermsRevision | null = null;
  let dateError: string | null = null;
  try {
    terms = purchaseTerms(values.application_date || new Date().toISOString().slice(0, 10));
  } catch {
    dateError = "No lot-purchase terms cover that date — Villa's papers run from 2025.";
  }
  const is2025 = terms?.version === "lot-purchase-2025";
  const classifications = terms?.classifications ?? [];

  function text(key: keyof PurchaseApplicationFormValues, label: string, hint?: string, type = "text") {
    return (
      <Field label={label} htmlFor={`${key}`} hint={hint}>
        <input
          id={`${key}`}
          name={`${key}`}
          type={type}
          autoComplete="off"
          disabled={pending}
          value={values[key] as string}
          onChange={(e) => set(key, e.target.value as PurchaseApplicationFormValues[typeof key])}
        />
      </Field>
    );
  }

  function money(
    key: "basic_price_cents" | "total_contract_price_cents" | "mcf_cents" | "vat_cents",
    label: string,
    hint?: string,
  ) {
    return (
      <Field label={label} htmlFor={key} hint={hint}>
        <input
          id={key}
          name={key}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={pending}
          placeholder="0.00"
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      </Field>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body = {
        application_date: values.application_date,
        last_name: values.last_name,
        first_name: values.first_name,
        middle_name: values.middle_name,
        date_of_birth: values.date_of_birth || undefined,
        civil_status: values.civil_status || undefined,
        gender: values.gender || undefined,
        religion: values.religion || undefined,
        citizenship: values.citizenship || undefined,
        contact_number: values.contact_number || undefined,
        email: values.email || undefined,
        tin: values.tin || undefined,
        gsis_sss_number: values.gsis_sss_number || undefined,
        alternative_contact_number: values.alternative_contact_number || undefined,
        facebook_account: values.facebook_account || undefined,
        address: values.address || undefined,
        occupation: values.occupation || undefined,
        employer: values.employer || undefined,
        employer_address: values.employer_address || undefined,
        employer_telephone: values.employer_telephone || undefined,
        beneficiaries: values.beneficiaries.map((b) => ({
          name: b.name,
          age: b.age || undefined,
          relationship: b.relationship,
        })),
        classification: values.classification || undefined,
        basic_price_cents: values.basic_price_cents,
        total_contract_price_cents: values.total_contract_price_cents,
        mcf_cents: values.mcf_cents,
        vat_cents: values.vat_cents,
        mode_of_payment: values.mode_of_payment || undefined,
        amortization_value: values.amortization_value ? Number(values.amortization_value) : undefined,
        amortization_unit: values.amortization_unit || undefined,
        interment_funeral_bundle_inclusion:
          values.interment_funeral_bundle_inclusion || undefined,
        others_insurance: values.others_insurance || undefined,
        dpa_consent: values.dpa_consent,
        sales_agent_name: values.sales_agent_name || undefined,
      };

      const res = await fetch(
        `/api/property/lots/${encodeURIComponent(lotId)}/purchase-application`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not save the purchase application.";
        setError(message);
        return;
      }
      router.push(`/staff/property/${encodeURIComponent(lotId)}`);
      router.refresh();
    } catch {
      setError("Could not save the purchase application.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}
      {intro ? <p className="text-sm text-muted">{intro}</p> : null}
      {dateError ? (
        <Alert tone="warning" title="Date outside Villa's papers">
          {dateError}
        </Alert>
      ) : null}

      <h4>The buyer</h4>
      {text("first_name", "First name")}
      {text("middle_name", "Middle name")}
      {text("last_name", "Last name")}
      {text("date_of_birth", "Date of birth", undefined, "date")}
      <Field label="Civil status" htmlFor="civil_status">
        <select
          id="civil_status"
          name="civil_status"
          disabled={pending}
          value={values.civil_status}
          onChange={(e) => set("civil_status", e.target.value as CivilStatus | "")}
        >
          <option value="">—</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="widowed">Widowed</option>
          <option value="legally_separated">Legally separated</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Gender" htmlFor="gender">
        <select
          id="gender"
          name="gender"
          disabled={pending}
          value={values.gender}
          onChange={(e) => set("gender", e.target.value as Gender | "")}
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </Field>
      {text("religion", "Religion")}
      {text("citizenship", "Citizenship", "The 2025 standalone agreement's buyer table asks this; the 2026 merged form does not.")}
      {text("contact_number", "Contact no.")}
      {text("email", "Email address", undefined, "email")}
      {text("tin", "TIN")}
      {text("gsis_sss_number", "GSIS / SSS no.")}
      {text("alternative_contact_number", "Alternative contact no.")}
      {text("facebook_account", "Facebook account")}
      {text("address", "Address")}
      {text("occupation", "Occupation")}
      {text("employer", "Employer")}
      {text("employer_address", "Employer's address")}
      {text("employer_telephone", "Employer's tel. no.")}

      <h4>Beneficiaries</h4>
      <p className="text-sm text-muted">
        Who the buyer names on the form, each with age and relationship as written.
      </p>
      {values.beneficiaries.length === 0 ? (
        <p className="text-sm text-muted">No beneficiaries recorded yet.</p>
      ) : null}
      {values.beneficiaries.map((beneficiary, index) => (
        <div key={index} className="stack">
          <div className="card">
            <div className="card__body stack">
              <Field label={`Beneficiary ${index + 1} — name`} htmlFor={`beneficiary-${index}-name`}>
                <input
                  id={`beneficiary-${index}-name`}
                  name={`beneficiary-${index}-name`}
                  type="text"
                  autoComplete="off"
                  disabled={pending}
                  value={beneficiary.name}
                  onChange={(e) => setBeneficiary(index, { name: e.target.value })}
                />
              </Field>
              <Field label={`Beneficiary ${index + 1} — age`} htmlFor={`beneficiary-${index}-age`}>
                <input
                  id={`beneficiary-${index}-age`}
                  name={`beneficiary-${index}-age`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={pending}
                  value={beneficiary.age}
                  onChange={(e) => setBeneficiary(index, { age: e.target.value })}
                />
              </Field>
              <Field
                label={`Beneficiary ${index + 1} — relationship`}
                htmlFor={`beneficiary-${index}-relationship`}
              >
                <input
                  id={`beneficiary-${index}-relationship`}
                  name={`beneficiary-${index}-relationship`}
                  type="text"
                  autoComplete="off"
                  disabled={pending}
                  value={beneficiary.relationship}
                  onChange={(e) => setBeneficiary(index, { relationship: e.target.value })}
                />
              </Field>
              <div>
                <Button type="button" size="sm" variant="secondary" onClick={() => removeBeneficiary(index)}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="secondary" onClick={addBeneficiary}>
          Add beneficiary
        </Button>
      </div>

      <h4>Lot &amp; price</h4>
      <p className="text-sm text-muted">
        {lotNumber}
        {lotStatus === "available"
          ? " is available — saving this application reserves it for the buyer."
          : ` is currently ${lotStatus.replace(/_/g, " ")}${lotHeldFor ? ` for ${lotHeldFor}` : ""}.`}
      </p>
      {text(
        "application_date",
        "Date of application",
        "The day the application is taken; it resolves which of Villa's form revisions applies.",
        "date",
      )}
      <Field
        label="Classification"
        htmlFor="classification"
        error={
          values.classification &&
          classifications.length > 0 &&
          !classifications.includes(values.classification)
            ? `Not on the ${terms?.title ?? "current"} form.`
            : undefined
        }
        hint={
          terms
            ? `Villa's own list on the ${terms.title} (${terms.version}).`
            : "No revision for this date."
        }
      >
        <select
          id="classification"
          name="classification"
          disabled={pending || !terms}
          value={values.classification}
          onChange={(e) => set("classification", e.target.value)}
        >
          <option value="">—</option>
          {classifications.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      {money("basic_price_cents", "Basic price", "Prefilled from the lot record; correct it if the counter's figure differs.")}
      {money("total_contract_price_cents", "Total contract price", "Written as on the paper — nothing computes this from the other rows (finance rules are the dev's).")}
      {money("mcf_cents", "Maintenance Care Fund (MCF)", "Written contribution, not derived here.")}
      {money("vat_cents", "VAT", "Written amount. Whether the price is VAT-inclusive and how VAT is derived are dev/business rules.")}
      <Field
        label="Mode of payment"
        htmlFor="mode_of_payment"
        hint="Annual · Semi · Quarterly · Monthly — as the paper's row prints."
      >
        <select
          id="mode_of_payment"
          name="mode_of_payment"
          disabled={pending}
          value={values.mode_of_payment}
          onChange={(e) => set("mode_of_payment", e.target.value as ModeOfPayment | "")}
        >
          <option value="">—</option>
          {MODES_OF_PAYMENT.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Amortisation term"
        htmlFor="amortization_value"
        hint="The paper's blank reads '______ years/months' — one duration and its unit."
      >
        <div className="row">
          <input
            id="amortization_value"
            name="amortization_value"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={pending}
            value={values.amortization_value}
            onChange={(e) => set("amortization_value", e.target.value)}
            style={{ maxWidth: "8rem" }}
          />
          <select
            id="amortization_unit"
            name="amortization_unit"
            disabled={pending}
            value={values.amortization_unit}
            onChange={(e) => set("amortization_unit", e.target.value as "years" | "months" | "")}
          >
            <option value="">—</option>
            <option value="years">years</option>
            <option value="months">months</option>
          </select>
        </div>
      </Field>
      {is2025 ? (
        text("others_insurance", "Others / Insurance", "The 2025 standalone agreement's row in this slot.")
      ) : (
        <Field
          label="Interment (1st) / Funeral Bundle Inclusion"
          htmlFor="interment_funeral_bundle_inclusion"
          hint="The 2026 combined form's marker — ticked when the price includes first interment / the funeral bundle."
        >
          <select
            id="interment_funeral_bundle_inclusion"
            name="interment_funeral_bundle_inclusion"
            disabled={pending}
            value={values.interment_funeral_bundle_inclusion}
            onChange={(e) =>
              set("interment_funeral_bundle_inclusion", e.target.value as IntermentInclusion | "")
            }
          >
            <option value="">—</option>
            <option value="included">Included</option>
            <option value="not_included">Not included</option>
          </select>
        </Field>
      )}

      <h4>Consent &amp; signatures</h4>
      <Field label="Sales agent" htmlFor="sales_agent_name" hint="Co-signs the 2026 combined form over a printed name.">
        <input
          id="sales_agent_name"
          name="sales_agent_name"
          type="text"
          autoComplete="off"
          disabled={pending}
          value={values.sales_agent_name}
          onChange={(e) => set("sales_agent_name", e.target.value)}
        />
      </Field>
      <div className="stack">
        <p className="text-sm">{DPA_CONSENT_STATEMENT}</p>
        <Field label="The buyer consents to the statement above" htmlFor="dpa_consent">
          <input
            id="dpa_consent"
            name="dpa_consent"
            type="checkbox"
            disabled={pending}
            checked={values.dpa_consent}
            onChange={(e) => set("dpa_consent", e.target.checked)}
          />
        </Field>
        <p className="text-sm text-muted">
          Consent is recorded on the application. The frozen agreement template has no
          block for it after the notarial part, so v1 keeps it on the record and this
          screen; printing it waits on a documents template update (waits on dev).
        </p>
      </div>

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
