/**
 * Tolerant field readers for the burial calendar's records (pure).
 *
 * The READ path (`lib/api-client/burial-schedule.ts`) and the durable WRITE store
 * (`lib/api-client/burials-store.ts`) both need to turn raw JSON into `BurialEntry` /
 * `LightPickup` values, field by field. They live here so the store does not have to import
 * the reader (which imports the store) — one reading, no cycle.
 *
 * This module is deliberately NOT under `lib/api-client/`: it holds no IO. It reads the
 * recorded seed (`lib/fixtures/scheduling/burials.json`) only so
 * `burialScheduleFromFixture()` can serve the pure tests; the store reads its own events.
 */
import burialsFile from "@/lib/fixtures/scheduling/burials.json";
import { ApiError } from "@/lib/api-client/api-error";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isLightPickupState,
  isTimeOfDay,
  type BurialEntry,
  type BurialSchedule,
  type LightPickup,
} from "@/lib/burial-calendar";

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
