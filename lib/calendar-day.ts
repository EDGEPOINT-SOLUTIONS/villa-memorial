/**
 * The staff calendar's day composition — PURE.
 *
 * The captain's 2026-10-02 direction: "a calendar with labels, when click on that
 * day you will see the whole details." The office already records the facts in
 * six places (burials + their light pickups, chapel bookings, dispatch trips,
 * invoice due dates and work-order due dates); this module is the ONE place that
 * folds them into a single labelled day, so the dashboard and `/staff/calendar`
 * cannot disagree about what a day holds.
 *
 * Rules this module keeps:
 *  · A day is a recorded calendar date (yyyy-mm-dd). A park-time "HH:MM" clock
 *    reading is derived from an instant with Asia/Manila, never from the host clock.
 *  · Nothing here reads a wall clock, so SSR and the browser always agree.
 *  · A kind is NAMED (`CALENDAR_KIND_LABEL`), because colour is never the only signal.
 *  · An amount is the invoice's own balance (total − paid), never a second figure.
 *  · Withheld records are dropped, not invented: a paid invoice and a done work order
 *    leave the calendar, and an item the reader cannot build is simply absent.
 */
import {
  calendarDateOf,
  formatCalendarDay,
  isCalendarDate,
} from "@/lib/chapel-booking";
import { addMonths, formatMonthLabel, monthOf } from "@/lib/chapel-admin";
import type { BurialEntry } from "@/lib/burial-calendar";
import type { Booking } from "@/lib/api-client/scheduling";
import type { Invoice } from "@/lib/api-client/finance";
import type { DispatchTrip } from "@/lib/dispatch";
import type { WorkOrder } from "@/lib/work-orders";
import { workOrderList } from "@/lib/work-orders";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const CALENDAR_KINDS = [
  "burial",
  "light_pickup",
  "chapel",
  "trip",
  "payment_due",
  "work_order",
] as const;
export type CalendarKind = (typeof CALENDAR_KINDS)[number];

/** The day type, named — the legend and every chip read this. */
export const CALENDAR_KIND_LABEL: Record<CalendarKind, string> = {
  burial: "Burial",
  light_pickup: "Light pickup",
  chapel: "Chapel booking",
  trip: "Vehicle trip",
  payment_due: "Payment due",
  work_order: "Work order due",
};

export type CalendarTone = "info" | "warning" | "danger" | "success" | "neutral";

/** The chip tone, matching the product's status palette. */
export const CALENDAR_KIND_TONE: Record<CalendarKind, CalendarTone> = {
  burial: "info",
  light_pickup: "neutral",
  chapel: "warning",
  trip: "neutral",
  payment_due: "danger",
  work_order: "success",
};

/** The order kinds print inside one day: services first, then work, then money. */
export const CALENDAR_KIND_ORDER: Readonly<Record<CalendarKind, number>> = {
  burial: 0,
  light_pickup: 1,
  chapel: 2,
  trip: 3,
  work_order: 4,
  payment_due: 5,
};

export type CalendarItem = {
  id: string;
  /** yyyy-mm-dd. */
  date: string;
  /** A park-time "HH:MM" reading, or null for an all-day item. */
  time: string | null;
  kind: CalendarKind;
  /** The record's own name (deceased, family, crew, invoice customer). */
  title: string;
  /** One supporting line: the reference and what it is. */
  detail: string;
  /** A real staff screen the record opens, or null when no screen exists. */
  href: string | null;
  tone: CalendarTone;
};

export type CalendarComposeInput = {
  burials?: readonly BurialEntry[];
  bookings?: readonly Booking[];
  trips?: readonly DispatchTrip[];
  invoices?: readonly Invoice[];
  workOrders?: readonly WorkOrder[];
  /** The day the work-order overdue rule reads (the list's recorded `as_of`). */
  workOrderAsOf?: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PARK_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** An ISO instant as a park-time "HH:MM" reading, or null when unreadable. */
export function parkClock(iso: string): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return PARK_CLOCK.format(t);
}

function balances(invoice: Invoice): number {
  return Math.max(0, invoice.total_cents - invoice.paid_cents);
}

/** The office's peso figure, whole pesos, tabular — no invented decimals. */
function pesos(minor: number, currency: string): string {
  const symbol = currency === "PHP" ? "₱" : "";
  return `${symbol}${Math.round(minor / 100).toLocaleString("en-PH")}`;
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export function composeCalendar(input: CalendarComposeInput): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const burial of input.burials ?? []) {
    if (!isCalendarDate(burial.date)) continue;
    items.push({
      id: `burial-${burial.id}`,
      date: burial.date,
      time: burial.time || null,
      kind: "burial",
      title: burial.deceased_name,
      detail: `${burial.case_number} · Lot ${burial.section}-${burial.lot_number}`,
      href: "/staff/schedule",
      tone: CALENDAR_KIND_TONE.burial,
    });
    if (burial.light_pickup) {
      items.push({
        id: `pickup-${burial.id}`,
        date: burial.date,
        time: burial.light_pickup.time || null,
        kind: "light_pickup",
        title: burial.light_pickup.crew,
        detail: `${burial.deceased_name} · lights`,
        href: null,
        tone: CALENDAR_KIND_TONE.light_pickup,
      });
    }
  }

  for (const booking of input.bookings ?? []) {
    const date = calendarDateOf(booking.starts_at);
    if (!isCalendarDate(date)) continue;
    items.push({
      id: `booking-${booking.id}`,
      date,
      time: parkClock(booking.starts_at),
      kind: "chapel",
      title: booking.title,
      detail: `${booking.resource_name}${booking.status === "cancelled" ? " · cancelled" : ""}`,
      href: "/staff/schedule",
      tone: CALENDAR_KIND_TONE.chapel,
    });
  }

  for (const trip of input.trips ?? []) {
    const date = calendarDateOf(trip.starts_at);
    if (!isCalendarDate(date)) continue;
    items.push({
      id: `trip-${trip.id}`,
      date,
      time: parkClock(trip.starts_at),
      kind: "trip",
      title: trip.case_number ?? trip.kind,
      detail: `${trip.origin} → ${trip.destination}${trip.status === "completed" ? " · done" : ""}`,
      href: "/staff/dispatch",
      tone: CALENDAR_KIND_TONE.trip,
    });
  }

  for (const invoice of input.invoices ?? []) {
    const date = calendarDateOf(invoice.due_at);
    if (!isCalendarDate(date)) continue;
    const balance = balances(invoice);
    if (balance <= 0) continue;
    items.push({
      id: `invoice-${invoice.id}`,
      date,
      time: null,
      kind: "payment_due",
      title: invoice.customer_name,
      detail: `${invoice.invoice_number} · ${pesos(balance, invoice.currency)}`,
      href: "/staff/billing",
      tone: CALENDAR_KIND_TONE.payment_due,
    });
  }

  if (input.workOrders && input.workOrders.length > 0 && input.workOrderAsOf) {
    for (const view of workOrderList(input.workOrders, input.workOrderAsOf)) {
      if (view.state === "done") continue;
      const due = view.order.due_on;
      if (!due || !isCalendarDate(due)) continue;
      items.push({
        id: `work-order-${view.order.id}`,
        date: due,
        time: null,
        kind: "work_order",
        title: view.order.title,
        detail: view.overdue ? `Overdue ${view.days_overdue ?? 0} d` : "Due",
        href: "/staff/work-orders",
        tone: view.overdue ? "danger" : CALENDAR_KIND_TONE.work_order,
      });
    }
  }

  return items.sort(compareItems);
}

function compareItems(a: CalendarItem, b: CalendarItem): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  const at = a.time ?? "24:00";
  const bt = b.time ?? "24:00";
  if (at !== bt) return at.localeCompare(bt);
  return CALENDAR_KIND_ORDER[a.kind] - CALENDAR_KIND_ORDER[b.kind];
}

export type CalendarDay = {
  date: string;
  items: CalendarItem[];
};

export function groupByDay(items: readonly CalendarItem[]): Map<string, CalendarItem[]> {
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const list = byDay.get(item.date) ?? [];
    list.push(item);
    byDay.set(item.date, list);
  }
  return byDay;
}

/** Every day that carries at least one item, newest last. */
export function calendarDays(items: readonly CalendarItem[]): CalendarDay[] {
  return [...groupByDay(items).entries()]
    .map(([date, dayItems]) => ({ date, items: dayItems }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/* The month grid                                                      */
/* ------------------------------------------------------------------ */

export const CALENDAR_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** A Monday-first grid of a "YYYY-MM" month; null cells pad the first/last week. */
export function calendarMonthGrid(month: string): (string | null)[][] {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (firstDow + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export { addMonths, formatMonthLabel, monthOf, formatCalendarDay };

/** The first day in `items` on or after `from`, or null. Used by the empty state. */
export function nextDayWithItems(
  items: readonly CalendarItem[],
  from: string,
): string | null {
  const dates = [...new Set(items.map((item) => item.date))]
    .filter((date) => date >= from)
    .sort((a, b) => a.localeCompare(b));
  return dates[0] ?? null;
}
