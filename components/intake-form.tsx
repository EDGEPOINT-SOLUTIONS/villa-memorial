"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CaseIntake } from "@/lib/api-client/operations";

/**
 * Villa's Service Contract intake block, as one form.
 *
 * The same component opens a case at the counter and completes one that arrived from a
 * fulfilled order — the fields are identical, only the verb differs. Every field is
 * optional: staff take what the family can give them on the day, and the contract prints
 * an em dash for the rest rather than blocking on a complete record.
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
  client_address: string;
  client_contact: string;
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
    client_address: "",
    client_contact: "",
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
    client_address: intake?.client_address ?? "",
    client_contact: intake?.client_contact ?? "",
    client_relationship: intake?.client_relationship ?? "",
    client_id_presented: intake?.client_id_presented ?? "",
    client_id_number: intake?.client_id_number ?? "",
    co_maker_name: intake?.co_maker_name ?? "",
    contract_date: intake?.contract_date ?? "",
  });
}

export function IntakeForm({
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
}: {
  initial: IntakeValues;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: IntakeValues) => Promise<string | null>;
}) {
  const [values, setValues] = useState<IntakeValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof IntakeValues>(key: K, value: IntakeValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      setError(await onSubmit(values));
    } finally {
      setPending(false);
    }
  }

  const text = (key: keyof IntakeValues, label: string, hint?: string, type = "text") => (
    <Field label={label} htmlFor={key} hint={hint}>
      <input
        id={key}
        name={key}
        type={type}
        autoComplete="off"
        disabled={pending}
        value={values[key] as string}
        onChange={(e) => set(key, e.target.value as IntakeValues[typeof key])}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="stack">
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}

      <h4>The deceased</h4>
      {text("deceased_name", "Name of deceased")}
      {text("date_of_death", "Date of death", undefined, "date")}
      {text("deceased_date_of_birth", "Date of birth", undefined, "date")}
      <Field label="Gender" htmlFor="deceased_gender">
        <select
          id="deceased_gender"
          name="deceased_gender"
          disabled={pending}
          value={values.deceased_gender}
          onChange={(e) => set("deceased_gender", e.target.value)}
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </Field>
      <Field label="Civil status" htmlFor="deceased_civil_status">
        <select
          id="deceased_civil_status"
          name="deceased_civil_status"
          disabled={pending}
          value={values.deceased_civil_status}
          onChange={(e) => set("deceased_civil_status", e.target.value)}
        >
          <option value="">—</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field
        label="Senior citizen"
        htmlFor="senior_citizen"
        hint="Carries a discount entitlement; prints on the contract only when claimed."
      >
        <input
          id="senior_citizen"
          name="senior_citizen"
          type="checkbox"
          disabled={pending}
          checked={values.senior_citizen}
          onChange={(e) => set("senior_citizen", e.target.checked)}
        />
      </Field>

      <h4>The client</h4>
      {text("client_name", "Name of client", "The person who signs and owes — not always the deceased's next of kin.")}
      {text("client_address", "Address")}
      {text("client_contact", "Telephone / mobile")}
      {text("client_relationship", "Relationship to deceased")}
      {text("client_id_presented", "ID presented", "e.g. Driver's License, UMID, Passport")}
      {text("client_id_number", "ID number")}
      {text("co_maker_name", "Co-maker", "Jointly and solidarily liable with the client. Leave blank if there is none.")}

      <h4>Contract</h4>
      {text(
        "contract_date",
        "Contract date",
        "Starts the 9-day payment clock. Leave blank to use today.",
        "date",
      )}
      {text("assigned_coordinator", "Coordinator of record")}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
