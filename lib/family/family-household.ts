/**
 * The household's own view logic — the parts of “one account, many loved ones”
 * that must be testable without a browser or a service.
 *
 * Everything here is DERIVED from what the family fixtures actually carry: the
 * people on the account, each one's next obligation and next visit, and the
 * stable `?person=` address the switcher uses. Nothing is invented and nothing
 * is blended — a household's money is never summed across two loved ones.
 *
 * The address is a query parameter (`?person=<id>`) rather than a path segment,
 * so the existing per-person routes keep working and a single-person household
 * reads exactly as it always did. An unknown or absent id resolves to the first
 * loved one (the API client's own fallback), so a stale link still shows the
 * family their records.
 */
import type {
  FamilyAppointment,
  FamilyPerson,
  FamilyPersonSummary,
  FamilySnapshot,
} from "@/lib/api-client/family";
import {
  paymentAmountLabel,
  unpaidPaymentDues,
  type PaymentDueState,
} from "@/lib/payment-schedule";

/** Next's page `searchParams` (already awaited), read defensively. */
export type FamilySearchParams =
  | Record<string, string | string[] | undefined>
  | undefined;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const found = value.find((entry) => typeof entry === "string" && entry.trim());
    return found?.trim();
  }
  return undefined;
}

/**
 * The requested loved one's id from the address, or undefined for “everyone” /
 * no choice. The value is untrusted input: it is only ever matched against the
 * household's own ids, never interpolated into a URL or a record.
 */
export function personIdFrom(params: FamilySearchParams): string | undefined {
  return firstValue(params?.person);
}

/** The people the switcher shows, from the snapshot the page already holds. */
export function householdPeople(snapshot: Pick<FamilySnapshot, "household">): FamilyPersonSummary[] {
  return snapshot.household ?? [];
}

/** True when the account looks after more than one loved one. */
export function isHousehold(snapshot: Pick<FamilySnapshot, "household">): boolean {
  return householdPeople(snapshot).length > 1;
}

/**
 * The loved one's next real visit: the earliest appointment that is not in the
 * past, in park time. A “waiting” time is not yet confirmed but is still the
 * next thing the family is arranging, so it counts — the card says which it is.
 */
export function nextFamilyVisit(
  appointments: readonly FamilyAppointment[],
  now: Date = new Date(),
): FamilyAppointment | null {
  const upcoming = appointments
    .filter((appointment) => {
      if (appointment.state === "past") return false;
      const at = Date.parse(appointment.starts_at);
      return Number.isNaN(at) ? false : at >= now.getTime();
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return upcoming[0] ?? null;
}

/** One loved one's next open instalment, normalised for the household summary. */
export type FamilyObligation = {
  /** What is still owed on the instalment, display text. */
  amount: string;
  /** The derived due date (yyyy-mm-dd). */
  due_on: string;
  /** Negative when the date has passed, 0 today. */
  days_until_due: number;
  state: PaymentDueState;
  reference: string;
};

/**
 * The next instalment still carrying a balance, or null when the plan is paid
 * up (or the record cannot be trusted). `now` is passed in so the state is
 * testable against a fixed clock.
 */
export function nextFamilyObligation(
  person: Pick<FamilyPerson, "payment_schedule">,
  now: Date = new Date(),
): FamilyObligation | null {
  const schedule = person.payment_schedule;
  if (!schedule) return null;
  const first = unpaidPaymentDues(schedule, now)[0];
  if (!first) return null;
  return {
    amount: paymentAmountLabel(first.due_cents),
    due_on: first.due_on,
    days_until_due: first.days_until_due,
    state: first.state,
    reference: first.reference,
  };
}
