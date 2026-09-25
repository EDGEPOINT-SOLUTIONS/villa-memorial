import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FamilySnapshot } from "@/lib/api-client/family";
import type { PaymentSchedule } from "@/lib/payment-schedule";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

/**
 * The client's minute of 2026-09-21, item 1, rendered on the real family pages:
 * an in-system payment reminder with the client, the payment reference, what is
 * owed and the due date, and clear upcoming-vs-overdue wording.
 *
 * The schedule below is built RELATIVE to the run (today + n days), so the
 * two-days-before boundary is exercised without a fixed calendar that would rot.
 */

function isoOffset(offset: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
  return new Date(base).toISOString().slice(0, 10);
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/payments",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

const state = vi.hoisted(() => ({ snapshot: undefined as FamilySnapshot | undefined }));

vi.mock("@/lib/api-client/family", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/family")>();
  return { ...actual, getFamilySnapshot: async () => state.snapshot };
});

const { default: PaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: NoticesPage } = await import("@/app/(family)/client/notifications/page");

function snapshotWith(schedule?: PaymentSchedule): FamilySnapshot {
  const paid = schedule
    ? schedule.installments.reduce((sum, i) => sum + i.paid_cents, 0)
    : 2000000;
  const total = schedule
    ? schedule.installments.reduce((sum, i) => sum + i.amount_cents, 0)
    : 4200000;
  const remaining = total - paid;
  const peso = (cents: number) => `₱${(cents / 100).toLocaleString("en-PH")}`;
  return {
    tenant_id: "00000000-0000-4000-8000-000000000001",
    family: { display_name: "Cory Customer", email: "customer@vm.demo", primary_contact: "0917 000 1234" },
    loved_one: { name: "Ernesto Dela Cruz", life_dates: "1948 – 2026" },
    plan_summary: { plan_name: "Premium Lawn · Lawn A-01", status: "Active", term: "5 years", next_due: "—" },
    balance: { total: peso(total), paid: peso(paid), remaining: peso(remaining) },
    balance_cents: { total, paid, remaining },
    ...(schedule ? { payment_schedule: schedule } : {}),
    recent_documents: [],
  };
}

function dueSchedule(offset: number, amountCents: number, reference = "VM-PLAN-2026-0188"): PaymentSchedule {
  return {
    reference,
    term: "monthly",
    first_due_on: isoOffset(offset),
    installments: [{ seq: 1, amount_cents: amountCents, paid_cents: 0 }],
  };
}

async function render(page: () => Promise<React.ReactElement>): Promise<string> {
  return renderToStaticMarkup(await page());
}

describe("a payment due in two days", () => {
  it("appears in-system with the client, reference, amount and due date", async () => {
    const dueOn = isoOffset(2);
    state.snapshot = snapshotWith(dueSchedule(2, 1200000));
    const html = await render(NoticesPage);

    expect(html).toContain("One payment reminder.");
    expect(html).toContain("₱12,000 due in 2 days");
    expect(html).toContain("Due soon");
    expect(html).toContain("Cory Customer");
    expect(html).toContain("VM-PLAN-2026-0188");
    expect(html).toContain(`due ${longDate(dueOn)}`);
    assertNoParagraphNesting(html, "Payment reminders");
  });

  it("also lives on the Payments screen under What’s coming", async () => {
    state.snapshot = snapshotWith(dueSchedule(2, 1200000));
    const html = await render(PaymentsPage);

    expect(html).toContain("What’s coming");
    expect(html).toContain("₱12,000 due in 2 days");
    expect(html).toContain("Due soon");
    expect(html).toContain("VM-PLAN-2026-0188 · payment 1 of 1");
  });
});

describe("an overdue payment", () => {
  it("says plainly that it is late, with the day it was due", async () => {
    const dueOn = isoOffset(-5);
    state.snapshot = snapshotWith(dueSchedule(-5, 500000));
    const html = await render(NoticesPage);

    expect(html).toContain("₱5,000 overdue by 5 days");
    expect(html).toContain("Overdue");
    expect(html).toContain(`due ${longDate(dueOn)}`);
  });

  it("is marked Overdue on the Payments screen too", async () => {
    state.snapshot = snapshotWith(dueSchedule(-5, 500000));
    const html = await render(PaymentsPage);
    expect(html).toContain("₱5,000 overdue by 5 days");
    expect(html).toContain("Overdue");
  });
});

describe("nothing to remind about", () => {
  it("keeps the honest empty state when no instalment is due", async () => {
    state.snapshot = snapshotWith(dueSchedule(30, 500000));
    const html = await render(NoticesPage);
    expect(html).toContain("Nothing has been sent to your family yet.");
    expect(html).not.toContain("Due soon");
  });

  it("keeps the honest empty state when the plan has no schedule", async () => {
    state.snapshot = snapshotWith(undefined);
    const html = await render(NoticesPage);
    expect(html).toContain("Nothing has been sent to your family yet.");

    const payments = await render(PaymentsPage);
    expect(payments).not.toContain("What’s coming");
  });

  it("names the channel seam instead of pretending other channels sent something", async () => {
    state.snapshot = snapshotWith(dueSchedule(2, 1200000));
    const html = await render(NoticesPage);
    expect(html).toContain("What this page can’t show yet");
    expect(html).toContain("Email and SMS wait on the notification");
  });
});
