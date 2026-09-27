/**
 * Field lists + submit gates for the public "Reach us" forms — contact,
 * quote request and appointment request.
 *
 * ⚠ NO SERVICE CONTRACT backs these forms: crm-families (enquiries) and
 * scheduling are unbuilt. These validators check what the visitor typed; they are
 * NOT a request payload for an upstream service.
 *
 * 2026-09-27: they ARE the veto on the app's own write. A contact or quote submission
 * is now posted to `POST /api/inquiries` and recorded in the office's durable journal
 * (`lib/api-client/inquiry-store.ts`), and the route re-runs these same gates through
 * `lib/inquiry-intake.ts` — so the sentence a family sees in the browser and the
 * sentence the server refuses with cannot drift. (Before this, both forms wrote to
 * `lib/demo-inquiry-captures.ts` in the visitor's own browser and the office received
 * nothing; that module is deleted.)
 *
 * Labels never carry `*` or `(optional)`: optionality lives in the field hints
 * and in these gates (forms-UI report §2 rules; D2 public short measure).
 */

export type FieldErrors = Record<string, string>;

export type ContactValues = {
  full_name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
};

export type QuoteValues = {
  full_name: string;
  email: string;
  phone: string;
  /** The funeral service the quote is for (a Request-for-Quote link prefills it). */
  service: string;
  /** The family's preferred date, when one applies (optional). */
  preferred_date: string;
  /** Everything else the office should weigh (additional requirements). */
  notes: string;
  consent: boolean;
};

export type AppointmentValues = {
  full_name: string;
  email: string;
  phone: string;
  reason: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
};

/**
 * Suggested services for a quote request — the legacy mock-up's option list
 * (report row 5), offered as hints. The field is free text because a
 * Request-for-Quote link prefills the exact service a visitor clicked.
 */
export const QUOTE_INTERESTS = [
  "Pre-need memorial plan",
  "Memorial lot",
  "Wake / funeral package",
  "Product (casket, urn, flowers…)",
  "Transportation",
  "Other / not sure yet",
] as const;

/**
 * ⚠ PROVISIONAL: the report (row 6) records that no shared appointment-reason
 * taxonomy exists anywhere in the app. This list mirrors the legacy mock-up
 * until scheduling freezes one — do not treat it as a domain enum.
 */
export const APPOINTMENT_REASONS = [
  "Planning consultation (pre-need)",
  "Visit a memorial lot",
  "Chapel / facility viewing",
  "Discuss a service arrangement",
  "Other",
] as const;

/** Same proposal status as APPOINTMENT_REASONS — slots are indicative, not a booking contract. */
export const APPOINTMENT_TIMES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "08:00", label: "8:00 am" },
  { value: "10:00", label: "10:00 am" },
  { value: "13:00", label: "1:00 pm" },
  { value: "15:00", label: "3:00 pm" },
  { value: "17:00", label: "5:00 pm" },
];

/** Matches the app's existing checkout/register gate (an @), not a stricter RFC check. */
function emailIssue(email: string): string | undefined {
  if (!email.trim()) return "Enter the email address the reply should go to.";
  if (!email.includes("@")) return "That does not look like an email address — include the @.";
  return undefined;
}

export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.full_name.trim()) errors.full_name = "Enter your name so the coordinator knows who to ask for.";
  const email = emailIssue(values.email);
  if (email) errors.email = email;
  // Phone stays optional — see the field hint.
  if (!values.message.trim()) errors.message = "Tell us briefly how we can help.";
  if (!values.consent) errors.consent = "Tick the consent box so the office may store this enquiry.";
  return errors;
}

export function validateQuote(values: QuoteValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.full_name.trim()) errors.full_name = "Enter your name.";
  const email = emailIssue(values.email);
  if (email) errors.email = email;
  if (!values.service.trim()) errors.service = "Tell us which service the quote is for.";
  // Phone, preferred date and notes stay optional — the office confirms the rest.
  const date = values.preferred_date.trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    errors.preferred_date = "Enter a valid date.";
  if (!values.consent) errors.consent = "Tick the consent box so the office may use these details for the quote.";
  return errors;
}

export function validateAppointment(values: AppointmentValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.full_name.trim()) errors.full_name = "Enter the name of the person visiting.";
  const email = emailIssue(values.email);
  if (email) errors.email = email;
  if (!values.phone.trim()) errors.phone = "Enter a phone number the office can confirm on.";
  if (!values.preferred_date.trim()) errors.preferred_date = "Choose a preferred date.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.preferred_date.trim()))
    errors.preferred_date = "Enter a valid date.";
  // Past dates are left to the coordinator to rebook — no scheduling rule is frozen.
  if (!values.preferred_time.trim()) errors.preferred_time = "Choose a preferred time.";
  return errors;
}
