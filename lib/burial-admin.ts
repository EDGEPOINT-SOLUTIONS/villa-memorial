/**
 * Burial calendar — the WRITE rules (pure).
 *
 * The client minute (2026-09-21, item 2) says "record and manage burial schedules"; the 2026-09-28
 * audit found the verb missing. This module is the one rules home for the two writes the screen
 * now performs: recording a burial, and moving its light pickup through
 * `scheduled → in_progress → done`. The browser form, the BFF route and the durable store
 * (`lib/api-client/burials-store.ts`) all run these functions, so a field error is the same
 * sentence everywhere.
 *
 * No IO, no React, no wall clock. Nothing here reads a service.
 */
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  LIGHT_PICKUP_STATES,
  isLightPickupState,
  isTimeOfDay,
  type LightPickupState,
} from "@/lib/burial-calendar";

/** Field length caps — one pasted essay cannot make the sheet unusable. */
export const MAX_BURIAL_TEXT = 120;
export const MAX_BURIAL_NOTE = 400;

export type BurialDraft = {
  date: string;
  time: string;
  case_number: string;
  deceased_name: string;
  lot_number: string;
  section: string;
  coordinator: string;
  note: string | null;
  /** The optional light pickup recorded with the burial; its state always starts `scheduled`. */
  light_pickup: { time: string; crew: string; note: string | null } | null;
};

export type BurialVerdict<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

function trimmed(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function record(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function fail(errors: Record<string, string>): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const first = Object.values(errors)[0] ?? "The burial could not be recorded.";
  return { ok: false, error: first, fieldErrors: errors };
}

/** Validate one burial draft; a malformed field is refused with a plain sentence. */
export function parseBurialDraft(raw: unknown): BurialVerdict<BurialDraft> {
  const source = record(raw);
  const errors: Record<string, string> = {};

  const date = trimmed(source.date);
  const time = trimmed(source.time);
  const caseNumber = trimmed(source.case_number);
  const deceasedName = trimmed(source.deceased_name);
  const lotNumber = trimmed(source.lot_number);
  const section = trimmed(source.section);
  const coordinator = trimmed(source.coordinator);
  const note = trimmed(source.note);

  if (!isCalendarDate(date)) errors.date = "Pick a real burial date.";
  if (!isTimeOfDay(time)) errors.time = "Use a 24-hour time, like 09:00.";
  if (!caseNumber) errors.case_number = "The case number is required.";
  if (!deceasedName) errors.deceased_name = "The name is required.";
  if (!lotNumber) errors.lot_number = "The lot number is required.";
  if (!section) errors.section = "The section is required.";
  if (!coordinator) errors.coordinator = "The coordinator is required.";
  for (const [key, value] of [
    ["case_number", caseNumber],
    ["deceased_name", deceasedName],
    ["lot_number", lotNumber],
    ["section", section],
    ["coordinator", coordinator],
  ] as const) {
    if (value.length > MAX_BURIAL_TEXT) errors[key] = "That is too long.";
  }
  if (note.length > MAX_BURIAL_NOTE) errors.note = "That is too long.";

  // The light pickup is optional, but half of one is not: a time or a crew alone is refused.
  let lightPickup: BurialDraft["light_pickup"] = null;
  const pickup = record(source.light_pickup);
  const pickupTime = trimmed(pickup.time);
  const pickupCrew = trimmed(pickup.crew);
  const pickupNote = trimmed(pickup.note);
  if (pickupTime || pickupCrew) {
    if (!isTimeOfDay(pickupTime)) errors["light_pickup.time"] = "Use a 24-hour time, like 15:00.";
    if (!pickupCrew) errors["light_pickup.crew"] = "Name the crew that collects the lights.";
    if (pickupCrew.length > MAX_BURIAL_TEXT) errors["light_pickup.crew"] = "That is too long.";
    if (pickupNote.length > MAX_BURIAL_NOTE) errors["light_pickup.note"] = "That is too long.";
    lightPickup = { time: pickupTime, crew: pickupCrew, note: pickupNote || null };
  }

  if (Object.keys(errors).length > 0) return fail(errors);
  return {
    ok: true,
    value: {
      date,
      time,
      case_number: caseNumber,
      deceased_name: deceasedName,
      lot_number: lotNumber,
      section,
      coordinator,
      note: note || null,
      light_pickup: lightPickup,
    },
  };
}

/* ------------------------------------------------------------------ */
/* The light pickup's lifecycle                                        */
/* ------------------------------------------------------------------ */

/** The next state in `scheduled → in_progress → done`, or null at the end. */
export function nextPickupState(state: LightPickupState): LightPickupState | null {
  const index = LIGHT_PICKUP_STATES.indexOf(state);
  return index >= 0 && index < LIGHT_PICKUP_STATES.length - 1
    ? LIGHT_PICKUP_STATES[index + 1]
    : null;
}

/** The state before `state`, or null at the start (a correction, not the normal move). */
export function previousPickupState(state: LightPickupState): LightPickupState | null {
  const index = LIGHT_PICKUP_STATES.indexOf(state);
  return index > 0 ? LIGHT_PICKUP_STATES[index - 1] : null;
}

/** The word on the button that MOVES a pickup forward. */
export const PICKUP_ADVANCE_LABEL: Record<LightPickupState, string> = {
  scheduled: "Start collection",
  in_progress: "Mark collected",
  done: "Collected",
};

export type PickupUpdate = {
  state: LightPickupState;
  time?: string;
  crew?: string;
  note?: string | null;
};

/**
 * Validate a pickup move. A state is required; time/crew/note are optional (an existing pickup
 * keeps what it has). Whether a FIRST pickup has the time and crew it needs is the store's
 * cross-row check — here the fields are only shape-checked.
 */
export function parsePickupUpdate(raw: unknown): BurialVerdict<PickupUpdate> {
  const source = record(raw);
  const errors: Record<string, string> = {};

  const state = source.state;
  if (!isLightPickupState(state)) errors.state = "Pick a pickup state.";

  const time = trimmed(source.time);
  const crew = trimmed(source.crew);
  const note = trimmed(source.note);
  if (time && !isTimeOfDay(time)) errors.time = "Use a 24-hour time, like 15:00.";
  if (crew.length > MAX_BURIAL_TEXT) errors.crew = "That is too long.";
  if (note.length > MAX_BURIAL_NOTE) errors.note = "That is too long.";

  if (Object.keys(errors).length > 0 || !isLightPickupState(state)) {
    return fail(errors.state ? errors : { ...errors, state: "Pick a pickup state." });
  }
  return {
    ok: true,
    value: {
      state,
      ...(time ? { time } : {}),
      ...(crew ? { crew } : {}),
      ...(source.note !== undefined ? { note: note || null } : {}),
    },
  };
}
