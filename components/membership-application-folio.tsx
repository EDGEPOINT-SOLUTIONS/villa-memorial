"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  FileSignature,
  Landmark,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import {
  APPLICATION_NOT_A_COC_NOTE,
  DPA_CONSENT_STATEMENT,
  DPA_CONSENT_WAITS,
  HEALTH_DECLARATION_STATEMENT,
  HEALTH_DECLARATION_WAITS,
  MEMBERSHIP_RELATIONSHIPS,
  MEMBERSHIP_COVERAGE,
  PLAN_RATE_CLASSES,
  planHolderAgeOn,
  planHolderFullName,
  planTermLabel,
  planTermPer,
  membershipApplicationIssues,
  type MembershipApplicationInput,
  type MembershipRelationship,
} from "@/lib/contracts/membership-application";
import {
  buildMembershipApplicationPaper,
  membershipPaperFileStem,
  type MembershipPaperData,
} from "@/lib/contracts/membership-paper";
import { planRateOf, type PlanPricing, type PlanTerm, type PlanTier } from "@/lib/pricing-model";
import { PLAN_TIERS, php2 } from "@/lib/villa-pricing";
import { formatMinorUnits } from "@/lib/money";

/** The folio's editable values — everything a counter types, as strings. */
type FolioValues = {
  application_date: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  date_of_birth: string;
  contact_number: string;
  email: string;
  address: string;
  beneficiaries: Array<{ name: string; relationship: MembershipRelationship }>;
  branch: string;
  plan_tier: PlanTier;
  plan_term: PlanTerm;
  senior: boolean;
  health_declaration: boolean;
  dpa_consent: boolean;
};

function initialValues(today: string): FolioValues {
  return {
    application_date: today,
    last_name: "",
    first_name: "",
    middle_name: "",
    date_of_birth: "",
    contact_number: "",
    email: "",
    address: "",
    beneficiaries: [{ name: "", relationship: "legal_spouse" }],
    branch: "",
    plan_tier: "bronze1",
    plan_term: "monthly",
    senior: false,
    health_declaration: false,
    dpa_consent: false,
  };
}

/** The four folio sections, for the rail's jump list. */
const STEPS = [
  { id: "capture-holder", num: "01", label: "The plan holder", icon: UserRound },
  { id: "capture-protected", num: "02", label: "Who it protects", icon: Users },
  { id: "capture-plan", num: "03", label: "Plan & payment", icon: Landmark },
  { id: "capture-declarations", num: "04", label: "Declarations", icon: FileSignature },
] as const;

/**
 * The membership application folio — the plan holder's enrolment capture (FORMS_PLAN gap 4 /
 * F-18), in the approved folio language the service contract and lot purchase application
 * use: numbered capture sections, a live document rail, a paper preview and the shared
 * Word / PDF exports.
 *
 * WHAT THE SCREEN SAYS OUT LOUD
 * The hero carries the one-line honest state (`APPLICATION_NOT_A_COC_NOTE`): this is an
 * application, not a certificate of coverage. The alert names what waits (no frozen
 * membership record contract, a provisional scope, the unarchived paper). The rate is READ
 * from the pricing document handed down by the server — `planRateOf`, never an input.
 */
export function MembershipApplicationFolio({
  pricing,
  today,
}: {
  /** The CURRENT plan tables (`loadPricingDocument()`), handed down by the server page. */
  pricing: PlanPricing;
  /** Server-resolved today (ISO), so the default date cannot differ between server and client. */
  today: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FolioValues>(() => initialValues(today));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [paper, setPaper] = useState<{ blocks: ReturnType<typeof buildMembershipApplicationPaper>["blocks"]; title: string } | null>(null);

  function set<K extends keyof FolioValues>(key: K, value: FolioValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setGateMessage(null);
  }

  function setBeneficiary(index: number, patch: Partial<FolioValues["beneficiaries"][number]>) {
    setValues((v) => ({
      ...v,
      beneficiaries: v.beneficiaries.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
    setGateMessage(null);
  }

  const holderName = planHolderFullName(values);
  const age = planHolderAgeOn(values.date_of_birth || null, values.application_date || today);
  const rate = planRateOf(pricing, values.plan_tier, values.plan_term, values.senior);
  const rateCents = rate * 100;
  const per = planTermPer(values.plan_term);
  const tierName = PLAN_TIERS.find((t) => t.id === values.plan_tier)?.name ?? values.plan_tier;
  const rateClass = PLAN_RATE_CLASSES.find((k) => (k.value === "senior") === values.senior);

  /** One normalised input assembled from the folio's strings — the paper, the save and the
   * readiness gate all read these same values. */
  const draftInput = useMemo<MembershipApplicationInput>(
    () => ({
      application_date: values.application_date,
      last_name: values.last_name.trim(),
      first_name: values.first_name.trim(),
      middle_name: values.middle_name.trim(),
      date_of_birth: values.date_of_birth || null,
      contact_number: values.contact_number.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      beneficiaries: values.beneficiaries
        .filter((b) => b.name.trim() !== "")
        .map((b) => ({ name: b.name.trim(), relationship: b.relationship })),
      branch: values.branch.trim(),
      plan_tier: values.plan_tier,
      plan_term: values.plan_term,
      senior: values.senior,
      health_declaration: values.health_declaration,
      dpa_consent: values.dpa_consent,
      // Not yet recorded: the store stamps the consent moment and the recorder on write.
      dpa_consented_at: null,
    }),
    [values],
  );

  /** The paper data both the preview and a save assemble from the same values. */
  const paperData = useMemo<MembershipPaperData>(
    () => ({
      ...draftInput,
      rate_cents: rateCents,
      pricing_updated_at: null,
      recorded_by: null,
    }),
    [draftInput, rateCents],
  );

  /** The readiness gate runs the SAME rules the server store runs (one rules home). */
  const readinessIssues = useMemo(
    () => membershipApplicationIssues(draftInput),
    [draftInput],
  );

  const fileStem = useMemo(
    () => membershipPaperFileStem(paperData),
    [paperData],
  );

  function openPaper() {
    if (readinessIssues.length > 0) {
      setGateMessage(readinessIssues.join(" "));
      return;
    }
    setGateMessage(null);
    const built = buildMembershipApplicationPaper(paperData);
    setPaper({ blocks: built.blocks, title: built.title });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readinessIssues.length > 0) {
      setGateMessage(readinessIssues.join(" "));
      return;
    }
    setError(null);
    setGateMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/memberships/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          application_date: values.application_date,
          last_name: values.last_name,
          first_name: values.first_name,
          middle_name: values.middle_name,
          date_of_birth: values.date_of_birth,
          contact_number: values.contact_number,
          email: values.email,
          address: values.address,
          beneficiaries: values.beneficiaries,
          branch: values.branch,
          plan_tier: values.plan_tier,
          plan_term: values.plan_term,
          senior: values.senior,
          health_declaration: values.health_declaration,
          dpa_consent: values.dpa_consent,
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not record the membership application.";
        setError(message);
        return;
      }
      const id =
        typeof payload === "object" && payload !== null && "application" in payload
          ? (payload as { application: { id?: unknown } }).application?.id
          : undefined;
      router.push(
        typeof id === "number" ? `/staff/plans/membership/${id}` : "/staff/plans/membership",
      );
      router.refresh();
    } catch {
      setError("Could not record the membership application.");
    } finally {
      setPending(false);
    }
  }

  function jumpTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ------------------------------ paper view ------------------------------ */
  if (paper) {
    return (
      <div className="stack paper-view">
        <div className="card paper-view__toolbar">
          <div className="paper-view__toolbar-row">
            <div className="paper-view__toolbar-head">
              <p className="page-header__eyebrow">Document</p>
              <h3>{paper.title}</h3>
              <p className="text-sm text-muted">
                {holderName || "plan holder not named yet"} · {tierName} ·{" "}
                {php2(rate)} {per} — the same content you export as Word and PDF.
              </p>
            </div>
            <PaperExportActions blocks={paper.blocks} filename={fileStem}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPaper(null)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back to editing
              </Button>
            </PaperExportActions>
          </div>
        </div>
        <Alert tone="info" title="This paper is the application, not the membership document">
          {APPLICATION_NOT_A_COC_NOTE} Print it for the office&rsquo;s working record; the
          office issues the real document from its own paper.
        </Alert>
        <PaperSheet blocks={paper.blocks} />
      </div>
    );
  }

  const ready = readinessIssues.length === 0;

  return (
    <form onSubmit={submit} className="capture-layout" noValidate>
      <div className="capture-layout__main">
        {/* At a glance: who is being enrolled and which plan — legible before any scrolling. */}
        <div className="membership-glance" aria-label="This application at a glance">
          <div className="membership-glance__cell">
            <p className="membership-glance__label">Being enrolled</p>
            <p className="membership-glance__value">
              {holderName || "Plan holder not named yet"}
            </p>
          </div>
          <div className="membership-glance__cell">
            <p className="membership-glance__label">Plan</p>
            <p className="membership-glance__value">
              {tierName} · {planTermLabel(values.plan_term)}
            </p>
          </div>
          <div className="membership-glance__cell">
            <p className="membership-glance__label">Published rate</p>
            <p className="membership-glance__value">
              {formatMinorUnits(rateCents)} {per}
            </p>
          </div>
          <p className="membership-glance__note">{APPLICATION_NOT_A_COC_NOTE}</p>
        </div>

        {error ? (
          <Alert tone="danger" title="Could not record the application">
            {error}
          </Alert>
        ) : null}
        <Alert tone="info" title="What this folio records — and what waits">
          The enrolment details the office keeps: the plan holder, the people the plan
          protects, the branch and the published plan chosen. No membership/COC record
          contract is frozen yet and the signed paper is not archived in this project, so
          this screen reproduces no document and mints no COC number — the office issues the
          certificate of coverage. The scope here reuses <code>catalog:write</code>
          provisionally until the plan-holder scope freezes.
        </Alert>
        {gateMessage ? (
          <Alert tone="danger" title="Finish the folio first">
            {gateMessage}
          </Alert>
        ) : null}

        {/* 01 — The plan holder */}
        <section id="capture-holder" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              01
            </span>
            <div>
              <h3 className="capture-section__title">The plan holder</h3>
              <p className="capture-section__blurb">
                Exactly who the plan is recorded in. The date of birth is what the two
                published rate classes key on.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--3">
              <Field label="Last name" htmlFor="last_name">
                <input
                  id="last_name"
                  name="last_name"
                  autoComplete="off"
                  disabled={pending}
                  value={values.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </Field>
              <Field label="First name" htmlFor="first_name">
                <input
                  id="first_name"
                  name="first_name"
                  autoComplete="off"
                  disabled={pending}
                  value={values.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </Field>
              <Field label="Middle name" htmlFor="middle_name">
                <input
                  id="middle_name"
                  name="middle_name"
                  autoComplete="off"
                  disabled={pending}
                  value={values.middle_name}
                  onChange={(e) => set("middle_name", e.target.value)}
                />
              </Field>
              <Field
                label="Date of birth"
                htmlFor="date_of_birth"
                hint={age === null ? undefined : `Age ${age} on the application date.`}
              >
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  disabled={pending}
                  value={values.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                />
              </Field>
              <Field label="Contact number" htmlFor="contact_number">
                <input
                  id="contact_number"
                  name="contact_number"
                  autoComplete="off"
                  disabled={pending}
                  value={values.contact_number}
                  onChange={(e) => set("contact_number", e.target.value)}
                />
              </Field>
              <Field label="Email address" htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  disabled={pending}
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
            </div>
            <div className="field-grid field-grid--3">
              <Field label="Address" htmlFor="address">
                <input
                  id="address"
                  name="address"
                  autoComplete="off"
                  disabled={pending}
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field
                label="Date of application"
                htmlFor="application_date"
                hint="Dates the enrolment — the rate is the one published on this day."
              >
                <input
                  id="application_date"
                  name="application_date"
                  type="date"
                  required
                  disabled={pending}
                  value={values.application_date}
                  onChange={(e) => set("application_date", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* 02 — Who the plan protects */}
        <section id="capture-protected" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              02
            </span>
            <div>
              <h3 className="capture-section__title">Who the plan protects</h3>
              <p className="capture-section__blurb">
                The client&rsquo;s own relationship list: legal spouse, child of legal age,
                parent or sibling. Add a row for each person.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            {values.beneficiaries.map((beneficiary, index) => (
              <div className="field-grid field-grid--3" key={index}>
                <Field label="Beneficiary" htmlFor={`beneficiary-name-${index}`}>
                  <input
                    id={`beneficiary-name-${index}`}
                    autoComplete="off"
                    disabled={pending}
                    value={beneficiary.name}
                    onChange={(e) => setBeneficiary(index, { name: e.target.value })}
                  />
                </Field>
                <Field label="Relationship" htmlFor={`beneficiary-relationship-${index}`}>
                  <select
                    id={`beneficiary-relationship-${index}`}
                    disabled={pending}
                    value={beneficiary.relationship}
                    onChange={(e) =>
                      setBeneficiary(index, {
                        relationship: e.target.value as MembershipRelationship,
                      })
                    }
                  >
                    {MEMBERSHIP_RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {values.beneficiaries.length > 1 ? (
                  <div className="field">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        setValues((v) => ({
                          ...v,
                          beneficiaries: v.beneficiaries.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove row
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setValues((v) => ({
                    ...v,
                    beneficiaries: [
                      ...v.beneficiaries,
                      { name: "", relationship: "child_of_legal_age" },
                    ],
                  }));
                  setGateMessage(null);
                }}
              >
                <Users size={15} aria-hidden="true" />
                Add another person
              </Button>
            </div>
          </div>
        </section>

        {/* 03 — Plan & payment */}
        <section id="capture-plan" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              03
            </span>
            <div>
              <h3 className="capture-section__title">Plan &amp; payment</h3>
              <p className="capture-section__blurb">
                The tier and payment mode the family chose. The rate prints from the
                office&rsquo;s rate card — the folio never types an amount.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="field-grid field-grid--3">
              <Field label="Plan tier" htmlFor="plan_tier">
                <select
                  id="plan_tier"
                  disabled={pending}
                  value={values.plan_tier}
                  onChange={(e) => set("plan_tier", e.target.value as PlanTier)}
                >
                  {PLAN_TIERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment mode" htmlFor="plan_term">
                <select
                  id="plan_term"
                  disabled={pending}
                  value={values.plan_term}
                  onChange={(e) => set("plan_term", e.target.value as PlanTerm)}
                >
                  {(["monthly", "quarterly", "semi", "annual"] as const).map((term) => (
                    <option key={term} value={term}>
                      {planTermLabel(term)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Branch enrolling the plan"
                htmlFor="branch"
                hint="As the office writes it — the branch structure is still an open client question."
              >
                <input
                  id="branch"
                  name="branch"
                  autoComplete="off"
                  disabled={pending}
                  value={values.branch}
                  onChange={(e) => set("branch", e.target.value)}
                />
              </Field>
            </div>

            <fieldset className="field-grid field-grid--3">
              <legend className="capture-subhead" style={{ marginTop: 0 }}>
                Rate class — age determines eligibility
              </legend>
              {PLAN_RATE_CLASSES.map((klass) => (
                <label className="check-row" key={klass.value}>
                  <input
                    type="radio"
                    name="rate_class"
                    disabled={pending}
                    checked={values.senior === (klass.value === "senior")}
                    onChange={() => set("senior", klass.value === "senior")}
                  />
                  <span>
                    <strong>{klass.label}</strong> — {klass.eligibility}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="membership-rate" aria-live="polite">
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <p className="membership-rate__value">
                  {formatMinorUnits(rateCents)} {per}
                </p>
                <p className="membership-rate__meta">
                  {tierName} · {planTermLabel(values.plan_term)} · {rateClass?.label} rate —
                  read from the office&rsquo;s published 2026 rate card. An office rate
                  change is what a later application quotes.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Coverage: {MEMBERSHIP_COVERAGE}.
            </p>
          </div>
        </section>

        {/* 04 — Declarations */}
        <section id="capture-declarations" className="card capture-section">
          <div className="capture-section__head">
            <span className="capture-section__num" aria-hidden="true">
              04
            </span>
            <div>
              <h3 className="capture-section__title">Declarations</h3>
              <p className="capture-section__blurb">
                The two declarations the plan&rsquo;s paper carries. They are recorded with
                the application and print on it.
              </p>
            </div>
          </div>
          <div className="capture-section__body">
            <div className="consent-statement">
              <ScrollText size={18} aria-hidden="true" />
              <p>{HEALTH_DECLARATION_STATEMENT}</p>
            </div>
            <label className="check-row check-row--consent">
              <input
                type="checkbox"
                disabled={pending}
                checked={values.health_declaration}
                onChange={(e) => set("health_declaration", e.target.checked)}
              />
              <span>The plan holder makes the good-health declaration above.</span>
            </label>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              {HEALTH_DECLARATION_WAITS}
            </p>

            <div className="consent-statement">
              <ScrollText size={18} aria-hidden="true" />
              <p>{DPA_CONSENT_STATEMENT}</p>
            </div>
            <label className="check-row check-row--consent">
              <input
                type="checkbox"
                disabled={pending}
                checked={values.dpa_consent}
                onChange={(e) => set("dpa_consent", e.target.checked)}
              />
              <span>
                The plan holder consents — recording the application requires it.
              </span>
            </label>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              {DPA_CONSENT_WAITS}
            </p>
          </div>
        </section>

        <div className="capture-actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record application"}
          </Button>
          <Button type="button" variant="secondary" onClick={openPaper} disabled={pending}>
            <ScrollText size={16} aria-hidden="true" />
            Preview application paper
          </Button>
        </div>
      </div>

      {/* Right rail: the folio's sections, readiness and the paper action. */}
      <aside className="capture-rail">
        <div className="card capture-rail__card">
          <div className="capture-rail__head">
            <p className="capture-rail__eyebrow">Application folio</p>
            <h3>Villa Memorial Plan</h3>
            <p className="text-sm text-muted">
              {holderName || "plan holder not named yet"}
            </p>
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
            <p className="capture-rail__checks-title">Ready to record</p>
            <CheckLine ok={holderName.length > 0} label="Plan holder's name" />
            <CheckLine
              ok={values.beneficiaries.some((b) => b.name.trim() !== "")}
              label="Who the plan protects"
            />
            <CheckLine ok={values.branch.trim() !== ""} label="Branch" />
            <CheckLine
              ok={values.health_declaration && values.dpa_consent}
              label="Declarations"
            />
            {ready ? null : (
              <p className="capture-rail__checks-wait">
                {readinessIssues.length} detail
                {readinessIssues.length === 1 ? "" : "s"} still to record before the paper
                prints.
              </p>
            )}
          </div>
          <div className="capture-rail__cta">
            <Button type="button" variant="secondary" onClick={openPaper}>
              <ScrollText size={16} aria-hidden="true" />
              Preview application paper
            </Button>
            <p className="text-xs text-muted">
              <CircleHelp size={12} style={{ verticalAlign: "-2px" }} aria-hidden="true" />{" "}
              The paper is the application; the office issues the certificate of coverage.
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
