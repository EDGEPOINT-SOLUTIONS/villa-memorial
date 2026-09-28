/**
 * Typed read for the staff burial calendar (`/staff/schedule`).
 *
 * ⚠ PROVISIONAL — no platform service owns a burial schedule or a light-pickup
 * record. Bookings belong to D5 scheduling-resources (`booking-events-v1`), a
 * burial's lot belongs to property (`lot-events-v1`), and neither contract names
 * a burial-schedule or light-pickup row. So there is nothing to read live: when
 * `SCHEDULING_BASE_URL` is set, `loadBurialSchedule` answers 503 with
 * `BURIAL_SCHEDULE_NOT_WIRED` rather than dressing the recorded demo sheet up as
 * service data. Fixture mode (the default) folds the recorded seed
 * (`lib/fixtures/scheduling/burials.json`) with the durable journal the office
 * writes through (`lib/api-client/burials-store.ts`), so a burial recorded on the
 * screen is what the next read shows.
 *
 * The tolerant readers live in `lib/burial-records.ts` (one home, shared with the
 * store, no import cycle); this module re-exports them so callers keep one entry point.
 */
import burialsFile from "@/lib/fixtures/scheduling/burials.json";
import { ApiError } from "@/lib/api-client/api-error";
import { schedulingLiveModeEnabled } from "@/lib/api-client/scheduling";
import { listStoredBurials } from "@/lib/api-client/burials-store";
import {
  burialScheduleFrom,
  burialScheduleFromFixture,
  toBurialEntry,
  toLightPickup,
} from "@/lib/burial-records";
import type { BurialSchedule } from "@/lib/burial-calendar";

export {
  burialScheduleFrom,
  burialScheduleFromFixture,
  toBurialEntry,
  toLightPickup,
};

export const BURIAL_SCHEDULE_NOT_WIRED =
  "live burial scheduling is not wired: scheduling-resources owns bookings and property " +
  "owns interments, and no contract names a burial-schedule or light-pickup record, so this " +
  "calendar can only read the office's recorded sheet";

/** Live mode: a scheduling service exists, but it has no burial schedule to read. */
export function burialScheduleLiveModeEnabled(): boolean {
  return schedulingLiveModeEnabled();
}

/** The recorded day the calendar opens on (from the seed; the journal never moves it). */
export function burialScheduleAsOf(): string {
  return burialsFile.as_of;
}

/** What the page calls: live mode says plainly that no burial service exists. */
export async function loadBurialSchedule(): Promise<BurialSchedule> {
  if (burialScheduleLiveModeEnabled()) {
    throw new ApiError(BURIAL_SCHEDULE_NOT_WIRED, 503);
  }
  return { as_of: burialScheduleAsOf(), burials: await listStoredBurials() };
}
