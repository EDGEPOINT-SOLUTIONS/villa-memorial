/**
 * The staff calendar's read — the ONE place the six date-bearing stores are
 * joined for the dashboard AND `/staff/calendar` (admin plan wave 1).
 *
 * Each source is read independently and tolerantly: a store that cannot be read
 * (live mode without a contract, an upstream error) is NAMED in `unreadable`
 * and simply contributes no days — it never takes the whole calendar down and it
 * never fabricates a record. Money is read only for a session that holds a
 * finance scope; lots maintenance only for `property:read`.
 */
import { composeCalendar, type CalendarItem, type CalendarService } from "@/lib/calendar-day";
import { burialScheduleAsOf, loadBurialSchedule } from "@/lib/api-client/burial-schedule";
import { listBookings, type Booking } from "@/lib/api-client/scheduling";
import { listEngagements } from "@/lib/api-client/lifecycle-store";
import { loadDispatchBoard } from "@/lib/api-client/dispatch";
import { loadWorkOrders, type WorkOrderList } from "@/lib/api-client/work-orders";
import { listFixtureInvoices } from "@/lib/api-client/billing-store";
import { hasAnyScope } from "@/lib/rbac/nav";
import type { BurialSchedule } from "@/lib/burial-calendar";
import type { DispatchBoard } from "@/lib/dispatch";
import type { Invoice } from "@/lib/api-client/finance";

async function safe<T>(promise: Promise<T>, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    return { value: await promise, ok: true };
  } catch {
    return { value: fallback, ok: false };
  }
}

export type StaffCalendarRead = {
  items: CalendarItem[];
  /** The stores that could not be read, by their human name. */
  unreadable: string[];
  /** The recorded day the calendar opens on when the URL names no day. */
  anchor: string;
};

export async function loadStaffCalendar(scopes: string[]): Promise<StaffCalendarRead> {
  const canSeeMoney = hasAnyScope(scopes, ["billing:read", "accounting:read"]);
  const canSeeProperty = hasAnyScope(scopes, ["property:read"]);

  const [burials, bookings, services, dispatch, workOrders, invoices] = await Promise.all([
    safe<BurialSchedule>(loadBurialSchedule(), { as_of: burialScheduleAsOf(), burials: [] }),
    safe<Booking[]>(listBookings(), []),
    safe<CalendarService[]>(lifecycleServices(), []),
    safe<DispatchBoard>(loadDispatchBoard(), { as_of: "", vehicles: [], drivers: [], trips: [] }),
    canSeeProperty
      ? safe<WorkOrderList>(loadWorkOrders(), { as_of: burialScheduleAsOf(), work_orders: [] })
      : Promise.resolve({ value: { as_of: burialScheduleAsOf(), work_orders: [] } as WorkOrderList, ok: true }),
    canSeeMoney
      ? safe<Invoice[]>(listFixtureInvoices(), [])
      : Promise.resolve({ value: [] as Invoice[], ok: true }),
  ]);

  const items = composeCalendar({
    burials: burials.value.burials,
    bookings: bookings.value,
    services: services.value,
    trips: dispatch.value.trips,
    invoices: invoices.value,
    workOrders: workOrders.value.work_orders,
    workOrderAsOf: workOrders.value.as_of,
  });

  const unreadable = [
    !burials.ok ? "burials" : null,
    !bookings.ok ? "chapel bookings" : null,
    !services.ok ? "services" : null,
    !dispatch.ok ? "dispatch" : null,
    canSeeProperty && !workOrders.ok ? "work orders" : null,
    canSeeMoney && !invoices.ok ? "invoices" : null,
  ].filter((value): value is string => value !== null);

  return { items, unreadable, anchor: burialScheduleAsOf() };
}

/** The lifecycle outcomes that carry a calendar slot — the office's booked services. */
async function lifecycleServices(): Promise<CalendarService[]> {
  const engagements = await listEngagements();
  return engagements
    .filter((engagement) => engagement.kind === "service" && engagement.schedule)
    .map((engagement) => ({
      id: engagement.id,
      reference: engagement.reference,
      client: { name: engagement.client.name },
      item: { name: engagement.item.name },
      schedule: engagement.schedule,
    }));
}
