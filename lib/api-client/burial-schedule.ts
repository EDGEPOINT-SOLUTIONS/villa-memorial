/**
 * Typed read for the staff burial calendar (`/staff/schedule`).
 *
 * ⚠ PROVISIONAL — no platform service owns a burial schedule or a light-pickup
 * record. Bookings belong to D5 scheduling-resources (`booking-events-v1`), a
 * burial's lot belongs to property (`lot-events-v1`), and neither contract names
 * a burial-schedule or light-pickup row. So there is nothing to read live: when
 * `SCHEDULING_BASE_URL` is set, `loadBurialSchedule` answers 503 with
 * `BURIAL_SCHEDULE_NOT_WIRED` rather than dressing the recorded demo sheet up as
 * service data. Fixture mode (the default) serves
 * `lib/fixtures/scheduling/burials.json` — the office's own recorded sheet.
 *
 * The reader is a tolerant reader (repo rule): field by field, extra keys
 * ignored, a malformed record is a 502, never a cast. An unusable date or clock
 * reading is refused the same way — the calendar cannot place an event it cannot
 * read.
 */
import burialsFile from "@/lib/fixtures/scheduling/burials.json";
import { ApiError } from "@/lib/api-client/api-error";
import { schedulingLiveModeEnabled } from "@/lib/api-client/scheduling";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isLightPickupState,
  isTimeOfDay,
  type BurialEntry,
  type BurialSchedule,
  type LightPickup,
} from "@/lib/burial-calendar";

export const BURIAL_SCHEDULE_NOT_WIRED =
  "live burial scheduling is not wired: scheduling-resources owns bookings and property " +
  "owns interments, and no contract names a burial-schedule or light-pickup record, so this " +
  "calendar can only read the office's recorded sheet";

/** Live mode: a scheduling service exists, but it has no burial schedule to read. */
export function burialScheduleLiveModeEnabled(): boolean {
  return schedulingLiveModeEnabled();
}

/* ------------------------------------------------------------------ */
/* Tolerant field readers                                              */
/* ------------------------------------------------------------------ */

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function optionalText(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function malformed(what: string): never {
  throw new ApiError(`malformed burial schedule: ${what}`, 502);
}

export function toLightPickup(raw: unknown): LightPickup {
  if (typeof raw !== "object" || raw === null) malformed("light pickup is not an object");
  const r = raw as Record<string, unknown>;
  const time = text(r.time);
  const crew = text(r.crew);
  if (!time || !isTimeOfDay(time)) malformed("light pickup time");
  if (!crew) malformed("light pickup crew");
  if (!isLightPickupState(r.state)) malformed("light pickup state");
  return {
    time,
    state: r.state,
    crew,
    note: optionalText(r.note),
  };
}

export function toBurialEntry(raw: unknown): BurialEntry {
  if (typeof raw !== "object" || raw === null) malformed("burial is not an object");
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const date = text(r.date);
  const time = text(r.time);
  const caseNumber = text(r.case_number);
  const deceasedName = text(r.deceased_name);
  const lotNumber = text(r.lot_number);
  const section = text(r.section);
  const coordinator = text(r.coordinator);
  if (!id) malformed("burial id");
  if (!date || !isCalendarDate(date)) malformed("burial date");
  if (!time || !isTimeOfDay(time)) malformed("burial time");
  if (!caseNumber) malformed("burial case number");
  if (!deceasedName) malformed("burial deceased name");
  if (!lotNumber) malformed("burial lot number");
  if (!section) malformed("burial section");
  if (!coordinator) malformed("burial coordinator");
  const pickupRaw = r.light_pickup;
  return {
    id,
    date,
    time,
    case_number: caseNumber,
    deceased_name: deceasedName,
    lot_number: lotNumber,
    section,
    coordinator,
    light_pickup:
      pickupRaw === null || pickupRaw === undefined ? null : toLightPickup(pickupRaw),
    note: optionalText(r.note),
  };
}

/* ------------------------------------------------------------------ */
/* The schedule                                                        */
/* ------------------------------------------------------------------ */

/** The recorded burial sheet, validated. Synchronous so tests can call it directly. */
export function burialScheduleFromFixture(): BurialSchedule {
  return burialScheduleFrom(burialsFile);
}

/** The same validation over any recorded store — the seam the reader's tests use. */
export function burialScheduleFrom(store: unknown): BurialSchedule {
  if (typeof store !== "object" || store === null) malformed("not an object");
  const record = store as Record<string, unknown>;
  const asOf = text(record.as_of);
  if (!asOf || !isCalendarDate(asOf)) malformed("no recorded day");
  const burials = (Array.isArray(record.burials) ? record.burials : []).map(toBurialEntry);
  const ids = new Set<string>();
  for (const burial of burials) {
    if (ids.has(burial.id)) malformed(`duplicate burial id ${burial.id}`);
    ids.add(burial.id);
    if (burial.date < "2000-01-01") malformed(`burial ${burial.id} has no real date`);
  }
  return { as_of: asOf, burials };
}

/** What the page calls: live mode says plainly that no burial service exists. */
export async function loadBurialSchedule(): Promise<BurialSchedule> {
  if (burialScheduleLiveModeEnabled()) {
    throw new ApiError(BURIAL_SCHEDULE_NOT_WIRED, 503);
  }
  return burialScheduleFromFixture();
}
