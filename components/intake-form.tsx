"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  emptyIntake,
  intakeToValues,
  type IntakeValues,
} from "@/lib/contracts/intake";

/**
 * Villa's Service Contract intake block, as one form.
 *
 * The same component opens a case at the counter and completes one that arrived from a
 * fulfilled order — the fields are identical, only the verb differs. Every field is
 * optional: staff take what the family can give them on the day, and the contract prints
 * an em dash for the rest rather than blocking on a complete record.
 *
 * The block mirrors the paper's header (`docs/07-client-villa/paper-forms/` transcript):
 * the deceased's identity and the client's identity + contact channels, where the paper
 * has discrete fields — gender M/F, civil status S/M/O, telephone numbers, Facebook,
 * email, ID presented + number, co-maker. The services/deals table and the deductions
 * block below the header are captured on the case's service-contract screen, not here.
 *
 * Layout follows the house capture shell (`capture-section` folios + `field-grid`), the
 * same grammar as the purchase application at /staff/property/[id]/apply.
 */
export { emptyIntake, intakeToValues };
export type { IntakeValues };

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

  const gender = (key: "deceased_gender" | "client_gender", label: string) => (
    <Field label={label} htmlFor={key}>
      <select
        id={key}
        name={key}
        disabled={pending}
        value={values[key] as string}
        onChange={(e) => set(key, e.target.value as IntakeValues[typeof key])}
      >
        <option value="">—</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </Field>
  );

  const civilStatus = (
    key: "deceased_civil_status" | "client_civil_status",
    label: string,
  ) => (
    <Field label={label} htmlFor={key}>
      <select
        id={key}
        name={key}
        disabled={pending}
        value={values[key] as string}
        onChange={(e) => set(key, e.target.value as IntakeValues[typeof key])}
      >
        <option value="">—</option>
        <option value="single">Single</option>
        <option value="married">Married</option>
        <option value="other">Other (widowed, separated…)</option>
      </select>
    </Field>
  );

  return (
    <form onSubmit={submit} className="stack" noValidate>
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}

      {/* 01 — The deceased */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            01
          </span>
          <div>
            <h3 className="capture-section__title">The deceased</h3>
            <p className="capture-section__blurb">
              As written on the death certificate — the contract header prints these.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--3">
            {text("deceased_name", "Name of deceased")}
            {text("date_of_death", "Date of death", undefined, "date")}
            {text("deceased_date_of_birth", "Date of birth", undefined, "date")}
            {gender("deceased_gender", "Gender")}
            {civilStatus("deceased_civil_status", "Civil status")}
            <Field
              label="Senior citizen"
              htmlFor="senior_citizen"
              hint="Carries a discount entitlement; prints on the contract only when claimed."
            >
              <select
                id="senior_citizen"
                name="senior_citizen"
                disabled={pending}
                value={values.senior_citizen === true ? "yes" : values.senior_citizen === false ? "no" : ""}
                onChange={(e) =>
                  set("senior_citizen", e.target.value === "" ? null : e.target.value === "yes")
                }
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
        </div>
      </section>

      {/* 02 — The client */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            02
          </span>
          <div>
            <h3 className="capture-section__title">The client</h3>
            <p className="capture-section__blurb">
              The person who signs and owes — not always the deceased&rsquo;s next of kin.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--1">{text("client_name", "Name of client")}</div>
          <div className="field-grid field-grid--2">
            {gender("client_gender", "Gender")}
            {civilStatus("client_civil_status", "Civil status")}
          </div>
          <div className="field-grid field-grid--1">{text("client_address", "Address")}</div>

          <h4 className="capture-subhead">Contact</h4>
          <div className="field-grid field-grid--3">
            {text(
              "client_contact",
              "Telephone numbers",
              "Landline or mobile the counter can reach the client on.",
            )}
            {text("client_facebook", "Facebook", "The paper prints this blank; used as a contact channel.")}
            {text("client_email", "Email", undefined, "email")}
          </div>

          <h4 className="capture-subhead">Identity</h4>
          <div className="field-grid field-grid--3">
            {text("client_relationship", "Relationship to deceased")}
            {text("client_id_presented", "ID presented", "e.g. Driver's License, UMID, Passport")}
            {text("client_id_number", "ID number")}
          </div>
          <div className="field-grid field-grid--1">
            {text(
              "co_maker_name",
              "Co-maker",
              "Jointly and solidarily liable with the client. Leave blank if there is none.",
            )}
          </div>
        </div>
      </section>

      {/* 03 — Contract */}
      <section className="card capture-section">
        <div className="capture-section__head">
          <span className="capture-section__num" aria-hidden="true">
            03
          </span>
          <div>
            <h3 className="capture-section__title">Contract</h3>
            <p className="capture-section__blurb">
              Two dates that drive everything after the counter.
            </p>
          </div>
        </div>
        <div className="capture-section__body">
          <div className="field-grid field-grid--2">
            {text(
              "contract_date",
              "Contract date",
              "Starts the 9-day payment clock. Leave blank to use today.",
              "date",
            )}
            {text("assigned_coordinator", "Coordinator of record")}
          </div>
        </div>
      </section>

      <div className="capture-actions">
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
