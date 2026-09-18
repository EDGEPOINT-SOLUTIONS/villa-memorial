import type { Metadata } from "next";

/**
 * Platform operator surface — the one vocabulary home for the three
 * platform-administration screens (PRD screen inventory: "Platform
 * Dashboard/Tenant Management · Platform Login · Tenant Sign-Up",
 * `docs/04-modules/screen-inventory.md`; classification:
 * `docs/02-architecture/platform-administration.md`).
 *
 * WHAT THIS IS: a designed reference for the platform team, on recorded sample
 * data. NO tenancy service, platform identity service or tenant sign-up
 * endpoint exists in this build, and this repository cannot provision a tenant
 * — every screen says so, and nothing here writes anything.
 *
 * The rules quoted below are the platform's own, taken from
 * `platform-administration.md` (platform controllers are never tenant-scoped;
 * platform admins are a separate identity type outside the tenant hierarchy
 * and its RBAC; sign-up creates a tenant + its owner in one transaction; the
 * first platform admin is seeded, never self-service; new workspaces start on
 * a 14-day trial; suspend/delete, custom domains, usage metrics and the
 * platform audit trail are deferred). The platform's detail is never invented
 * here — if a rule is not in that document it does not appear in this file.
 *
 * The surface lives under `/platform`, outside every tenant-scoped gateway:
 * no product menu links here (pinned by tests/unit/platform-screens.test.tsx),
 * `app/robots.ts` closes the prefix to crawlers, and the operator entry point
 * is PLATFORM_OPERATOR_ENTRY — reached by URL, exactly as an operator would
 * keep it.
 */

/** The platform-operator entry point: the operator's own door. */
export const PLATFORM_OPERATOR_ENTRY = "/platform/sign-in";

/**
 * The platform surface is operator-only in every direction: it renders no
 * public SEO tags and `app/robots.ts` disallows the `/platform/` prefix too,
 * so the two independent gates agree (this head rule + the crawler rule).
 */
export const PLATFORM_SURFACE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

/** The platform's three screens — used by the chrome nav and the tests. */
export const PLATFORM_SCREENS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/sign-up", label: "Tenant sign-up" },
  { href: PLATFORM_OPERATOR_ENTRY, label: "Platform sign-in" },
];

/**
 * The marked surface line. `platform-administration.md`: platform admins are a
 * separate identity type and the platform surface is not tenant-scoped — this
 * is the wording that keeps a family or an office member from reading these
 * screens as theirs.
 */
export const PLATFORM_SURFACE_EYEBROW = "Villa Memorial platform · operator surface";

export const PLATFORM_SURFACE_NOTE =
  "This is the platform's operator area — not the funeral product. Staff, families and agents sign in at the product's own doors.";

/** The one line every screen carries: what the platform owns and this build does not. */
export const PLATFORM_SERVICE_NOTE =
  "No tenancy service is connected to this build: provisioning, tenant isolation and operator identities are the platform's to provide.";

/* ------------------------------- tenants --------------------------------- */

export const TENANT_STATES = ["active_trial", "trial_expired", "cancelled"] as const;
export type TenantState = (typeof TENANT_STATES)[number];

/**
 * Trial state vocabulary from `platform-administration.md` decision 9
 * ("active/expired/cancelled, days remaining"). Until subscription billing
 * lands an ended or cancelled trial is informational only — nothing is
 * switched off, and the detail line says so instead of implying an outcome.
 */
export const TENANT_STATE_META: Record<
  TenantState,
  { label: string; tone: "info" | "warning" | "neutral"; detail: string }
> = {
  active_trial: {
    label: "Active trial",
    tone: "info",
    detail: "The 14-day trial is running.",
  },
  trial_expired: {
    label: "Trial ended",
    tone: "warning",
    detail: "The trial has ended; nothing is switched off yet.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
    detail: "Cancelled platform-side; nothing is switched off yet.",
  },
};

/**
 * The only plan that exists: every workspace starts on the 14-day free trial
 * and paid plan selection is deferred with SaaS subscription billing. A paid
 * plan figure or name would be invented, so the vocabulary has exactly one
 * entry.
 */
export const TENANT_PLANS = ["free_trial"] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];
export const TENANT_PLAN_LABEL = "Free trial";
export const TENANT_PLAN_NOTE =
  "Paid plans are not sold yet: SaaS subscription billing is deferred platform scope.";

export type TenantAdministrator = {
  name: string;
  email: string;
};

export type PlatformTenant = {
  id: string;
  name: string;
  /** The tenant's own address on the platform (its slug). */
  subdomain: string;
  /** The host the tenant is served from. */
  hostname: string;
  state: TenantState;
  plan: TenantPlan;
  /** Recorded by the tenancy service — never recomputed here. null when unknown. */
  trial_days_remaining: number | null;
  trial_ends_on: string | null;
  provisioned_on: string;
  administrator: TenantAdministrator;
  /** Every recorded row is a sample in this build; a page may never hide one. */
  sample: boolean;
};

/** The record-level marker the list and detail screens must show. */
export const PLATFORM_SAMPLE_NOTE =
  "Sample records — no tenancy service is connected. These rows demonstrate the design and are not real customers.";

/**
 * The trial line beside a tenant's state — one phrase per recorded state, so
 * the two tenant screens cannot phrase the same record differently. Dates are
 * printed as recorded (the tenancy service's own record), never recomputed.
 */
export function tenantTrialLine(tenant: {
  state: TenantState;
  trial_days_remaining: number | null;
  trial_ends_on: string | null;
}): string {
  if (tenant.state === "cancelled") {
    return tenant.trial_ends_on
      ? `Trial was due to end ${tenant.trial_ends_on}`
      : "Trial dates not recorded";
  }
  if (tenant.state === "trial_expired") {
    return tenant.trial_ends_on ? `Ended ${tenant.trial_ends_on}` : "End date not recorded";
  }
  if (tenant.trial_days_remaining === null) return "Days remaining not recorded";
  return `${tenant.trial_days_remaining} days remaining`;
}

/** What provisioning a new tenant would require of the platform (not of this app). */
export const TENANT_PROVISIONING_REQUIREMENTS: ReadonlyArray<{
  title: string;
  detail: string;
}> = [
  {
    title: "The tenancy service",
    detail: "It creates the tenant and its first administrator together, in one transaction.",
  },
  {
    title: "A unique address",
    detail: "The chosen subdomain must be free and must resolve to the tenant's own workspace.",
  },
  {
    title: "The owner role",
    detail: "The first account is the owner — the rank above admin that alone configures the account.",
  },
  {
    title: "The trial clock",
    detail: "Provisioning starts the 14-day trial; today that clock is bookkeeping only.",
  },
  {
    title: "Tenant isolation",
    detail: "Every tenant's records stay inside its own boundary; the platform surface touches none of them.",
  },
];

/** Deferred upstream (platform-administration.md §Deferred) — named, never implied built. */
export const PLATFORM_DEFERRED: ReadonlyArray<string> = [
  "Suspending or deleting a tenant.",
  "Custom domains for a tenant.",
  "Per-tenant usage metrics.",
  "An audit trail for platform-operator actions.",
  "Paid plan selection and subscription billing.",
];

/** What the platform's own sign-in must provide (platform-administration.md decisions 2 + 5). */
export const PLATFORM_AUTH_REQUIREMENTS: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: "A separate operator identity",
    detail: "Platform admins are their own identity type — never a user row inside a tenant.",
  },
  {
    title: "No tenant RBAC",
    detail: "An operator signs in outside the tenant hierarchy and inherits no business's permissions.",
  },
  {
    title: "A seeded first operator",
    detail: "The first platform admin comes from a console seed — public sign-up can never mint one.",
  },
  {
    title: "Platform-action records",
    detail: "An audit trail for operator actions needs platform-level storage, deferred upstream.",
  },
];

/* ------------------------------- sign-up --------------------------------- */

/**
 * The onboarding sequence after provisioning (`platform-administration.md`
 * decision 3, `configuration-engine.md`): the owner configures, imports,
 * trains and goes live. The platform provides the workspace; the business
 * provides the running of it.
 */
export const TENANT_ONBOARDING_STEPS: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: "Configure",
    detail: "The owner sets the workspace up: profile, branches, services, prices.",
  },
  {
    title: "Import data",
    detail: "Records move in: people, cases, lots, plans and papers.",
  },
  {
    title: "Train users",
    detail: "The owner's staff learn the screens they will run each day.",
  },
  {
    title: "Go live",
    detail: "The business opens its doors on the platform, inside the trial window.",
  },
];

export const TENANT_TRIAL_NOTE =
  "New workspaces start on a 14-day free trial. Paid plan selection and payment are deferred.";

/** What the platform must provide before a tenant sign-up can really create anything. */
export const TENANT_SIGN_UP_REQUIREMENTS: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: "A provisioning endpoint",
    detail: "Sign-up must create the tenant and its first administrator together — never a half-created business.",
  },
  {
    title: "Subdomain reservation",
    detail: "The platform must check the chosen address, reserve it and serve it on its own host.",
  },
  {
    title: "Email verification",
    detail: "The first administrator's address must be confirmed before the workspace opens.",
  },
  {
    title: "Trial bookkeeping",
    detail: "The 14-day trial is recorded at provisioning; nothing is switched off when it ends yet.",
  },
];

/* ------------------------- sign-up validation ---------------------------- */

export type TenantSignUpDraft = {
  business_name: string;
  business_email: string;
  subdomain: string;
  admin_name: string;
  admin_email: string;
};

/** 3–30 characters, lowercase letters/digits/hyphens, no leading or trailing hyphen. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

/** Host names the platform itself needs — the tenancy service owns the real list. */
export const SUBDOMAIN_RESERVED: ReadonlyArray<string> = [
  "www",
  "api",
  "app",
  "platform",
  "admin",
  "staff",
  "support",
];

/** A suggested address from the business name — a suggestion the person edits, never an assignment. */
export function subdomainFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

/** Matches the app's existing form gates (an @), not a stricter RFC check. */
function emailIssue(email: string): string | undefined {
  if (!email.trim()) return "Enter the email address this account should use.";
  if (!email.includes("@")) return "That does not look like an email address — include the @.";
  return undefined;
}

export type TenantSignUpErrors = Partial<Record<keyof TenantSignUpDraft, string>>;

/**
 * The sign-up flow's one gate: the form runs it live, the flow runs it before
 * advancing and before the final review. Nothing is sent anywhere — the
 * platform has no endpoint — so this is the whole submit contract.
 */
export function validateTenantSignUpDraft(draft: TenantSignUpDraft): TenantSignUpErrors {
  const errors: TenantSignUpErrors = {};
  if (!draft.business_name.trim()) {
    errors.business_name = "Enter the business's name as it will appear on the platform.";
  } else if (draft.business_name.trim().length > 80) {
    errors.business_name = "Keep the business name to 80 characters or fewer.";
  }
  const businessEmail = emailIssue(draft.business_email);
  if (businessEmail) errors.business_email = businessEmail;

  const subdomain = draft.subdomain.trim();
  if (!subdomain) {
    errors.subdomain = "Choose the address the business will be served from.";
  } else if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    errors.subdomain =
      "Use 3–30 lowercase letters, numbers or hyphens — starting and ending with a letter or number.";
  } else if (SUBDOMAIN_RESERVED.includes(subdomain)) {
    errors.subdomain = "That address is reserved for the platform itself.";
  }

  if (!draft.admin_name.trim()) {
    errors.admin_name = "Enter the first administrator's full name.";
  }
  const adminEmail = emailIssue(draft.admin_email);
  if (adminEmail) errors.admin_email = adminEmail;
  return errors;
}

/** True when the draft would pass the gate — the flow's review/confirm switch. */
export function tenantSignUpDraftReady(draft: TenantSignUpDraft): boolean {
  return Object.keys(validateTenantSignUpDraft(draft)).length === 0;
}
