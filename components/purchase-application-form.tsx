"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileSignature,
  Landmark,
  MapPin,
  ScrollText,
  Users,
  UserRound,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
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
import type { Lot } from "@/lib/api-client/property";
import {
  buildPurchasePaper,
  purchasePaperFromForm,
} from "@/lib/contracts/purchase-paper";
import { paperFileStem, type PaperBlock } from "@/lib/export/types";

// The editable-values type lives in a server-safe module (lib/contracts/
// purchase-application-values.ts) so the server apply page and this client form share it
// across the "use client" boundary.
import type { PurchaseApplicationFormValues } from "@/lib/contracts/purchase-application-values";
export type { PurchaseApplicationFormValues };

/** Client-side capture gate — keeps preview/export honest without blocking saving. */
function captureIssues(values: PurchaseApplicationFormValues): string[] {
  const issues: string[] = [];
  if (!values.application_date) issues.push("Date the application.");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.application_date))
    issues.push("The application date is not a valid date.");
  const amountKeys = [
    "basic_price_cents",
    "total_contract_price_cents",
    "mcf_cents",
    "vat_cents",
  ] as const;
  for (const key of amountKeys) {
    const raw = values[key].trim();
    if (raw === "") continue;
    if (!/^\d+(\.\d{1,2})?$/.test(raw.replace(/,/g, ""))) {
      issues.push(`“${raw}” is not a valid peso amount (at most two decimals).`);
    }
  }
  for (const ben of values.beneficiaries) {
    if (ben.name.trim() !== "" && ben.age.trim() !== "" && !/^\d+$/.test(ben.age.trim())) {
      issues.push(`Beneficiary ${ben.name.trim()}'s age must be a whole number of years.`);
    }
  }
  if (values.amortization_value.trim() !== "" && !/^\d+$/.test(values.amortization_value.trim())) {
    issues.push("The amortisation term must be a whole number of years or months.");
  }
  return issues;
}

const STEPS = [
  { id: "capture-buyer", num: "01", label: "The buyer", icon: UserRound },
  { id: "capture-beneficiaries", num: "02", label: "Beneficiaries", icon: Users },
  { id: "capture-property", num: "03", label: "Lot, price & terms", icon: Landmark },
  { id: "capture-consent", num: "04", label: "Consent & signatures", icon: FileSignature },
] as const;

export function PurchaseApplicationForm({
  initial,
  lotId,
  lotNumber,
  lotHeldFor,
  lotStatus,
  lot,
  submitLabel,
  pendingLabel,
  intro,
}: {
  initial: PurchaseApplicationFormValues;
  lotId: string;
  lotNumber: string;
  lotHeldFor: string | null;
  lotStatus: string;
  /** The lot record — lets the paper document print section/block/area from the record. */
  lot: Pick<Lot, "lot_number" | "section" | "block" | "area_sqm" | "price_cents" | "currency">;
  submitLabel: string;
  pendingLabel: string;
  intro?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PurchaseApplicationFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [paper, setPaper] = useState<{ blocks: PaperBlock[]; title: string } | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function set<K extends keyof PurchaseApplicationFormValues>(
    key: K,
    value: PurchaseApplicationFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setGateMessage(null);
  }

  function setBeneficiary(index: number, patch: Partial<PurchaseApplicationFormValues["beneficiaries"][number]>) {
    setValues((v) => ({
      ...v,
      beneficiaries: v.beneficiaries.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
    setGateMessage(null);
  }

  function addBeneficiary() {
    setValues((v) => ({ ...v, beneficiaries: [...v.beneficiaries, { name: "", age: "", relationship: "" }] }));
    setGateMessage(null);
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

  const buyerName = [values.first_name, values.middle_name, values.last_name]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  const fileStem = useMemo(
    () => paperFileStem([`${terms?.title ?? "Purchase-Application-and-Agreement"}-Lot-${lotNumber}`, buyerName || undefined]),
    [terms, lotNumber, buyerName],
  );

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
        <div className="peso-input">
          <span className="peso-input__mark" aria-hidden="true">
            ₱
          </span>
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
        </div>
      </Field>
    );
  }

  function openPaper() {
    const issues = captureIssues(values);
    if (issues.length > 0) {
      setGateMessage(issues.join(" "));
      return;
    }
    setGateMessage(null);
    try {
      const data = purchasePaperFromForm(
        values,
        lot,
        values.application_date || new Date().toISOString().slice(0, 10),
      );
      const built = buildPurchasePaper(data);
      setPaper({ blocks: built.blocks, title: built.title });
    } catch (err) {
      setGateMessage(err instanceof Error ? err.message : "Could not assemble the paper document.");
    }
  }

  function backToEdit() {
    setPaper(null);
    setGateMessage(null);
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
        interment_funeral_bundle_inclusion: values.interment_funeral_bundle_inclusion || undefined,
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
      router.replace(`/staff/property/${encodeURIComponent(lotId)}`);
      router.refresh();
    } catch {
      setError("Could not save the purchase application.");
    } finally {
      setPending(false);
    }
  }

  function jumpTo(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------------------- paper document mode ---------------------------- */
  if (paper) {
    return (
      <div className="stack paper-view">
        <div className="card paper-view__toolbar">
          <div className="paper-view__toolbar-row">
            <div className="paper-view__toolbar-head">
              <p className="page-header__eyebrow">Document</p>
              <h3>{paper.title}</h3>
              <p className="text-sm text-muted">
                {lotNumber} · {buyerName || "buyer not named yet"} — the same content you
                export as Word and PDF.
              </p>
            </div>
            <PaperExportActions blocks={paper.blocks} filename={fileStem}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={backToEdit}
                title="Back to the capture form"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to editing
              </Button>
            </PaperExportActions>
          </div>
        </div>
        <PaperSheet blocks={paper.blocks} />
      </div>
    );
  }

  const requiredOk = {
    name: buyerName.length > 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(values.application_date),
    consent: values.dpa_consent,
  };
  const writtenPrices = [
    values.basic_price_cents,
    values.total_contract_price_cents,
    values.mcf_cents,
    values.vat_cents,
  ].filter((v) => v.trim() !== "").length;

  return (
    <form onSubmit={submit} className="capture-layout" ref={formRef} noValidate>
      <div className="capture-layout__main">
        {error ? (
          <Alert tone="danger" title="Could not save">
            {error}
          </Alert>
        ) : null}
        {intro ? (
          <Alert tone="info" title="What this form does">
            {intro}
          </Alert>
        ) : null}
        {dateError ? (
          <Alert tone="warning" title="Date outside Villa's papers">
            {dateError}
          </Alert>
        ) : null}
        {gateMessage ? (
          <Alert tone="danger" title="Finish the paper blanks first">
            {gateMessage}
          </Alert>
        ) : null}

        {/* 01 — The buyer */}
        <section id="capture-buyer" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              01
            </span>
            <div>
              <h2 className="capture-section__title">The buyer</h2>
              <p className="capture-section__blurb">
                Exactly as the paper asks — the application reserves the lot in this name.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--3">
              {text("last_name", "Last name", undefined)}
              {text("first_name", "First name", undefined)}
              {text("middle_name", "Middle name", undefined)}
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
              {!is2025 ? null : (
                <>{text("citizenship", "Citizenship", "The 2025 standalone agreement's buyer table asks this; the 2026 merged form does not.")}</>
              )}
            </div>
            <h3 className="capture-subhead">Contact</h3>
            <div className="field-grid field-grid--3">
              {text("contact_number", "Contact no.")}
              {text("alternative_contact_number", "Alternative contact no.")}
              {text("email", "Email address", undefined, "email")}
              {text("facebook_account", "Facebook account")}
              {text("tin", "TIN")}
              {text("gsis_sss_number", "GSIS / SSS no.")}
            </div>
            <h3 className="capture-subhead">Address &amp; work</h3>
            <div className="field-grid field-grid--1">
              {text("address", "Address")}
            </div>
            <div className="field-grid field-grid--3">
              {text("occupation", "Occupation")}
              {text("employer", "Employer")}
              {text("employer_telephone", "Employer's tel. no.")}
            </div>
            <div className="field-grid field-grid--1">
              {text("employer_address", "Employer's address")}
            </div>
          </div>
        </section>

        {/* 02 — Beneficiaries */}
        <section id="capture-beneficiaries" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              02
            </span>
            <div>
              <h2 className="capture-section__title">Beneficiaries</h2>
              <p className="capture-section__blurb">
                Who the buyer names on the form — each with age and relationship as written.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            {values.beneficiaries.length === 0 ? (
              <p className="text-sm text-muted">No beneficiaries recorded yet — add one below.</p>
            ) : (
              <div className="stack">
                {values.beneficiaries.map((beneficiary, index) => (
                  <div className="card capture-beneficiary" key={index}>
                    <div className="card__body">
                      <div className="field-grid field-grid--3">
                        <Field
                          label={`Beneficiary ${index + 1} — name`}
                          htmlFor={`beneficiary-${index}-name`}
                        >
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
                        <Field
                          label={`Beneficiary ${index + 1} — age`}
                          htmlFor={`beneficiary-${index}-age`}
                        >
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
                      </div>
                      <div className="row" style={{ marginTop: "var(--space-2)" }}>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeBeneficiary(index)}>
                          Remove beneficiary
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Button type="button" size="sm" variant="secondary" onClick={addBeneficiary}>
                Add beneficiary
              </Button>
            </div>
          </div>
        </section>

        {/* 03 — Lot, price & terms */}
        <section id="capture-property" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              03
            </span>
            <div>
              <h2 className="capture-section__title">Lot, price &amp; financing</h2>
              <p className="capture-section__blurb">
                The written figures and financing terms — exactly as the counter writes them,
                never computed here.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="lot-strip">
              <span className="lot-strip__tag">{lotNumber}</span>
              <span className="lot-strip__meta">
                {[lot.section, lot.block].filter(Boolean).join(" · ")}
              </span>
              <span className="lot-strip__meta">
                {lot.area_sqm} sqm
              </span>
              <span className="lot-strip__status">
                <Badge tone={lotStatus === "available" ? "success" : "neutral"}>
                  {lotStatus.replace(/_/g, " ")}
                </Badge>
              </span>
              {lotHeldFor ? <span className="lot-strip__meta">for {lotHeldFor}</span> : null}
            </div>

            <div className="field-grid field-grid--3">
              <Field
                label="Date of application"
                htmlFor="application_date"
                hint="Resolves which of Villa's form revisions applies."
              >
                <input
                  id="application_date"
                  name="application_date"
                  type="date"
                  disabled={pending}
                  value={values.application_date}
                  onChange={(e) => set("application_date", e.target.value)}
                />
              </Field>
              <Field
                label="Classification"
                htmlFor="classification"
                hint={terms ? `Villa's own list on the ${terms.title} (${terms.version}).` : "No revision for this date."}
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
              <div className="field" aria-hidden="true" />
            </div>

            <h3 className="capture-subhead">Price rows — written, not derived</h3>
            <div className="field-grid field-grid--4">
              {money("basic_price_cents", "Basic price", "Prefilled from the lot record.")}
              {money("total_contract_price_cents", "Total contract price", "Written as on the paper.")}
              {money("mcf_cents", "Maintenance Care Fund (MCF)", "Written contribution.")}
              {money("vat_cents", "VAT", "Written amount.")}
            </div>
            <p className="text-sm text-muted">
              Nothing here computes these from one another, and nothing validates them
              against the price list — that is finance&rsquo;s domain. The paper prints exactly
              what the counter writes.
            </p>

            <h3 className="capture-subhead">Financing terms</h3>
            <div className="field-grid field-grid--3">
              <Field
                label="Mode of payment"
                htmlFor="mode_of_payment"
                hint="Annual · Semi · Quarterly · Monthly."
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
                hint="One duration and its unit, as the paper's blank reads."
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
                    aria-label="Amortization unit"
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
                <>{text("others_insurance", "Others / Insurance", "The 2025 standalone agreement's row in this slot.")}</>
              ) : (
                <Field
                  label="Interment (1st) / Funeral Bundle Inclusion"
                  htmlFor="interment_funeral_bundle_inclusion"
                  hint="The 2026 form's marker line."
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
            </div>
          </div>
        </section>

        {/* 04 — Consent & signatures */}
        <section id="capture-consent" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              04
            </span>
            <div>
              <h2 className="capture-section__title">Consent &amp; signatures</h2>
              <p className="capture-section__blurb">
                The data-privacy consent the 2026 paper requires and the co-signatory over
                printed name.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="consent-statement">
              <ScrollText size={18} aria-hidden="true" />
              <p>{DPA_CONSENT_STATEMENT}</p>
            </div>
            <div className="field-grid field-grid--3">
              <Field label="Sales agent (co-signs the 2026 form)" htmlFor="sales_agent_name">
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
            </div>
            <label className="check-row check-row--consent">
              <input
                type="checkbox"
                disabled={pending}
                checked={values.dpa_consent}
                onChange={(e) => set("dpa_consent", e.target.checked)}
              />
              <span>The buyer consents to the statement above — recording the application
                requires it.</span>
            </label>
            <p className="text-sm text-muted">
              Consent is recorded with the application. The paper view and the Word / PDF
              exports print the consent block after the notarial part, exactly as the 2026
              paper does.
            </p>
          </div>
        </section>

        <div className="capture-actions">
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={openPaper} disabled={pending}>
            <ScrollText size={16} aria-hidden="true" />
            Preview paper document
          </Button>
        </div>
      </div>

      {/* Right rail: the document at a glance */}
      {/* Right rail: the form's sections and readiness. */}
      <aside className="capture-rail" aria-label="Application steps">
        <div className="card capture-rail__card">
          <div className="capture-rail__head">
            <p className="capture-rail__eyebrow">Paper document</p>
            <h3>{terms?.title ?? "Purchase Application"}</h3>
            <p className="text-sm text-muted">Lot {lotNumber}</p>
          </div>
          <div className="capture-rail__steps">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  className="capture-rail__step"
                  onClick={() => jumpTo(step.id)}
                >
                  <span className="capture-rail__step-num">{step.num}</span>
                  <span className="capture-rail__step-label">
                    <Icon size={14} aria-hidden="true" />
                    {step.label}
                  </span>
                  <ChevronRight size={14} className="capture-rail__step-arrow" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div className="capture-rail__checks">
            <p className="capture-rail__checks-title">Ready for the paper</p>
            <CheckLine ok={requiredOk.name} label="Buyer's name" />
            <CheckLine ok={requiredOk.date} label="Application date" />
            <CheckLine ok={requiredOk.consent} label="DPA consent" />
            <CheckLine ok={writtenPrices > 0} label={`Price rows written (${writtenPrices}/4)`} />
          </div>
          <div className="capture-rail__cta">
            <Button type="button" variant="secondary" onClick={openPaper}>
              Preview paper document
            </Button>
            <p className="text-xs text-muted">
              <MapPin size={12} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> The
              document prints the revision Villa will actually sign for this date.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`capture-rail__check${ok ? " capture-rail__check--ok" : ""}`}>
      <Check size={13} aria-hidden="true" />
      {label}
    </span>
  );
}
