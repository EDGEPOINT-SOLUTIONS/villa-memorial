"use client";

/**
 * Tenant sign-up flow — the designed capture for onboarding a new funeral
 * business (PRD screen inventory "Tenant Sign-Up").
 *
 * A DESIGNED FLOW ON RECORDED DATA; IT CREATES NOTHING. Two steps — the
 * business and its address, then its first administrator — followed by a
 * review that submits nowhere: the platform has no provisioning endpoint, and
 * the honest state says so. The one gate is `validateTenantSignUpDraft` in
 * `lib/platform-admin.ts` (the same function the fixture surface and the tests
 * use), so no rule is re-declared here.
 */
import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import {
  SUBDOMAIN_PATTERN,
  TENANT_TRIAL_NOTE,
  subdomainFromName,
  validateTenantSignUpDraft,
  type TenantSignUpDraft,
  type TenantSignUpErrors,
} from "@/lib/platform-admin";

const EMPTY_DRAFT: TenantSignUpDraft = {
  business_name: "",
  business_email: "",
  subdomain: "",
  admin_name: "",
  admin_email: "",
};

/** Which controls each step owns — the step gate validates only its own fields. */
const STEP_FIELDS: Record<1 | 2, ReadonlyArray<keyof TenantSignUpDraft>> = {
  1: ["business_name", "business_email", "subdomain"],
  2: ["admin_name", "admin_email"],
};

export function SignUpFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<TenantSignUpDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<TenantSignUpErrors>({});
  const [created, setCreated] = useState(false);
  const baseId = useId();

  function set<K extends keyof TenantSignUpDraft>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** Run the shared gate but keep only the fields a step owns. */
  function stepErrors(target: 1 | 2): TenantSignUpErrors {
    const all = validateTenantSignUpDraft(draft);
    const kept: TenantSignUpErrors = {};
    for (const key of STEP_FIELDS[target]) {
      if (all[key]) kept[key] = all[key];
    }
    return kept;
  }

  function continueToAdmin() {
    const next = stepErrors(1);
    setErrors(next);
    if (Object.keys(next).length === 0) setStep(2);
  }

  function submit() {
    const next = validateTenantSignUpDraft(draft);
    setErrors(next);
    if (Object.keys(next).length === 0) setCreated(true);
  }

  return (
    <Card header={<h2 id="tenant-sign-up-form">Start a tenant</h2>}>
      <ol className="platform-flow__steps" aria-label="Sign-up steps">
        <li aria-current={step === 1 && !created ? "step" : undefined}>1. The business</li>
        <li aria-current={step === 2 && !created ? "step" : undefined}>
          2. The first administrator
        </li>
      </ol>

      {created ? (
        <div className="platform-stack">
          <Alert tone="warning" title="Nothing was created.">
            No tenant provisioning endpoint exists in this build. The platform&rsquo;s tenancy
            service must create the business and its first administrator together.
          </Alert>
          <Review draft={draft} />
          <p className="platform-form-note">
            The flow above is the design the platform team can build against.
          </p>
        </div>
      ) : step === 1 ? (
        <div className="stack">
          <Field
            label="Business name"
            htmlFor={`${baseId}-business`}
            hint="As it will appear on the platform."
            error={errors.business_name}
          >
            <input
              id={`${baseId}-business`}
              className="input"
              value={draft.business_name}
              onChange={(event) => set("business_name", event.target.value)}
            />
          </Field>
          <Field
            label="Business contact email"
            htmlFor={`${baseId}-business-email`}
            hint="Where the platform reaches the new business."
            error={errors.business_email}
          >
            <input
              id={`${baseId}-business-email`}
              className="input"
              type="email"
              value={draft.business_email}
              onChange={(event) => set("business_email", event.target.value)}
            />
          </Field>
          <Field
            label="Subdomain"
            htmlFor={`${baseId}-subdomain`}
            hint="3–30 lowercase letters, numbers or hyphens — the business's own address."
            error={errors.subdomain}
          >
            <input
              id={`${baseId}-subdomain`}
              className="input platform-input--mono"
              value={draft.subdomain}
              onChange={(event) => set("subdomain", event.target.value)}
              aria-describedby={`${baseId}-subdomain-preview`}
            />
          </Field>
          <p className="platform-form-note" id={`${baseId}-subdomain-preview`}>
            Address preview:{" "}
            <code>{SUBDOMAIN_PATTERN.test(draft.subdomain) ? draft.subdomain : "your-name"}</code>{" "}
            — served on the platform&rsquo;s own host; custom domains are deferred.
          </p>
          {draft.business_name.trim() ? (
            <div className="platform-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set("subdomain", subdomainFromName(draft.business_name))}
              >
                Suggest an address from the name
              </Button>
            </div>
          ) : null}
          <div className="platform-actions">
            <Button onClick={continueToAdmin}>Continue to the administrator</Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <Field
            label="Administrator full name"
            htmlFor={`${baseId}-admin`}
            hint="The first account created with the tenant."
            error={errors.admin_name}
          >
            <input
              id={`${baseId}-admin`}
              className="input"
              value={draft.admin_name}
              onChange={(event) => set("admin_name", event.target.value)}
            />
          </Field>
          <Field
            label="Administrator email"
            htmlFor={`${baseId}-admin-email`}
            hint="This address must be confirmed before the workspace opens."
            error={errors.admin_email}
          >
            <input
              id={`${baseId}-admin-email`}
              className="input"
              type="email"
              value={draft.admin_email}
              onChange={(event) => set("admin_email", event.target.value)}
            />
          </Field>
          <Review draft={draft} />
          <p className="platform-form-note">{TENANT_TRIAL_NOTE}</p>
          <div className="platform-actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back to the business
            </Button>
            <Button onClick={submit}>Check and send</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** What the flow would submit — read back exactly as entered, nothing derived. */
function Review({ draft }: { draft: TenantSignUpDraft }) {
  return (
    <dl className="kv platform-kv">
      <div>
        <dt>Business</dt>
        <dd>{draft.business_name.trim() || "Not entered"}</dd>
      </div>
      <div>
        <dt>Contact</dt>
        <dd>{draft.business_email.trim() || "Not entered"}</dd>
      </div>
      <div>
        <dt>Address</dt>
        <dd className="platform-kv__mono">{draft.subdomain.trim() || "Not chosen"}</dd>
      </div>
      <div>
        <dt>First administrator</dt>
        <dd>
          {draft.admin_name.trim() || "Not entered"}
          {draft.admin_email.trim() ? (
            <span className="platform-kv__mono">{draft.admin_email.trim()}</span>
          ) : null}
        </dd>
      </div>
    </dl>
  );
}
