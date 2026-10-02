import { describe, expect, it } from "vitest";
import {
  CALENDAR_KIND_LABEL,
  calendarDays,
  calendarMonthGrid,
  composeCalendar,
  groupByDay,
  nextDayWithItems,
  parkClock,
} from "@/lib/calendar-day";
import type { BurialEntry } from "@/lib/burial-calendar";
import type { Booking } from "@/lib/api-client/scheduling";
import type { Invoice } from "@/lib/api-client/finance";
import type { DispatchTrip } from "@/lib/dispatch";
import type { WorkOrder } from "@/lib/work-orders";

const burial = (over: Partial<BurialEntry> = {}): BurialEntry => ({
  id: "bur-1",
  date: "2026-09-30",
  time: "09:00",
  case_number: "CASE-2026-0001",
  deceased_name: "Pedro Santos",
  lot_number: "A-003",
  section: "A",
  coordinator: "Ada",
  light_pickup: { time: "15:00", state: "scheduled", crew: "Delivery crew", note: null },
  note: null,
  ...over,
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: "book-1",
  resource_id: "res-1",
  resource_name: "Chapel A",
  case_number: null,
  title: "Wake — Day 1",
  starts_at: "2026-09-10T01:00:00Z",
  ends_at: "2026-09-10T09:00:00Z",
  status: "confirmed",
  conflicting: false,
  ...over,
});

const trip = (over: Partial<DispatchTrip> = {}): DispatchTrip => ({
  id: "trip-1",
  case_number: "CASE-2026-0002",
  kind: "pickup",
  origin: "Park",
  destination: "Hospital",
  starts_at: "2026-09-11T00:00:00Z",
  ends_at: "2026-09-11T02:00:00Z",
  status: "scheduled",
  vehicle_id: "veh-1",
  driver_id: "drv-1",
  note: null,
  ...over,
});

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "inv-1",
  invoice_number: "INV-2026-0001",
  customer_name: "Roberto Santos",
  order_number: null,
  total_cents: 1_800_000,
  paid_cents: 0,
  currency: "PHP",
  status: "overdue",
  issued_at: "2026-08-01T00:00:00Z",
  due_at: "2026-09-15T08:00:00Z",
  aging_bucket: "1-30",
  ...over,
});

const workOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: "WO-2026-0001",
  title: "Replace the front brake pads on Hearse 1",
  detail: "",
  asset: { kind: "vehicle", ref: "veh-1", label: "Hearse 1" },
  priority: "high",
  assignee: { name: "Crew", employee_number: null },
  opened_on: "2026-09-01",
  due_on: "2026-09-04",
  history: [{ state: "open", on: "2026-09-01" }],
  ...over,
});

describe("composeCalendar", () => {
  const items = composeCalendar({
    burials: [burial()],
    bookings: [booking()],
    trips: [trip()],
    invoices: [invoice()],
    workOrders: [workOrder()],
    workOrderAsOf: "2026-09-28",
  });

  it("labels every day type and places it on its own date", () => {
    expect(items.map((item) => item.kind).sort()).toEqual([
      "burial",
      "chapel",
      "light_pickup",
      "payment_due",
      "trip",
      "work_order",
    ]);
    const burialItem = items.find((item) => item.kind === "burial")!;
    expect(burialItem.date).toBe("2026-09-30");
    expect(burialItem.title).toBe("Pedro Santos");
    expect(CALENDAR_KIND_LABEL.burial).toBe("Burial");
  });

  it("derives a light pickup as its own item on the burial day", () => {
    const pickup = items.find((item) => item.kind === "light_pickup")!;
    expect(pickup.date).toBe("2026-09-30");
    expect(pickup.time).toBe("15:00");
    expect(pickup.title).toBe("Delivery crew");
  });

  it("drops a settled invoice rather than drawing a zero", () => {
    const none = composeCalendar({ invoices: [invoice({ paid_cents: 1_800_000 })] });
    expect(none).toHaveLength(0);
  });

  it("reads the work order's overdue state from the recorded day only", () => {
    const overdue = items.find((item) => item.kind === "work_order")!;
    expect(overdue.date).toBe("2026-09-04");
    expect(overdue.detail).toContain("Overdue");
    expect(overdue.tone).toBe("danger");
  });

  it("sorts a day by clock, all-day items last, then by kind", () => {
    const day = composeCalendar({
      burials: [burial()],
      invoices: [invoice({ due_at: "2026-09-30T08:00:00Z" })],
    }).filter((item) => item.date === "2026-09-30");
    expect(day.map((item) => item.time)).toEqual(["09:00", "15:00", null]);
  });
});

describe("parkClock", () => {
  it("reads an instant on the park clock (Asia/Manila, UTC+8)", () => {
    expect(parkClock("2026-09-10T01:00:00Z")).toBe("09:00");
    expect(parkClock("not-a-date")).toBeNull();
  });
});

describe("groupByDay / calendarDays / nextDayWithItems", () => {
  const items = composeCalendar({ burials: [burial()], bookings: [booking()] });

  it("groups by date and lists days oldest first", () => {
    const byDay = groupByDay(items);
    expect(byDay.get("2026-09-30")).toHaveLength(2);
    expect(calendarDays(items).map((day) => day.date)).toEqual(["2026-09-10", "2026-09-30"]);
  });

  it("finds the next recorded day on or after a date", () => {
    expect(nextDayWithItems(items, "2026-09-11")).toBe("2026-09-30");
    expect(nextDayWithItems(items, "2026-10-01")).toBeNull();
  });
});

describe("calendarMonthGrid", () => {
  it("builds a Monday-first grid padded to whole weeks", () => {
    const weeks = calendarMonthGrid("2026-09");
    expect(weeks[0][0]).toBeNull(); // 1 Sep 2026 is a Tuesday
    expect(weeks[0][1]).toBe("2026-09-01");
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("returns no grid for a malformed month", () => {
    expect(calendarMonthGrid("nope")).toEqual([]);
  });
});
