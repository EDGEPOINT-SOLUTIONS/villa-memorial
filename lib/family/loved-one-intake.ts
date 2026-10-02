/**
 * The one reading of an “add a loved one” submission, shared by the BFF route
 * and the browser form.
 *
 * WHY IT LIVES HERE. `web/AGENTS.md` rule 1 keeps route handlers dumb: a BFF
 * route may read a body, ask a pure function for a verdict, and persist through
 * the owning store — the same pattern as `lib/agent/lead-capture.ts` and
 * `lib/inquiry-intake.ts`.
 *
 * THE RULES. A name is required; the life dates are optional (a family often
 * does not know them, and the memorial never requires a date). Both are bounded
 * so one pasted essay cannot make the family pages unusable.
 */
export const LOVED_ONE_NAME_MAX = 120;
export const LOVED_ONE_DATES_MAX = 60;

export type LovedOneIntake =
  | { ok: true; name: string; life_dates: string }
  | { ok: false; errors: Record<string, string> };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The pure verdict for one submission. Never throws, never persists. */
export function readLovedOneIntake(values: unknown): LovedOneIntake {
  const record =
    typeof values === "object" && values !== null ? (values as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const name = text(record.name, LOVED_ONE_NAME_MAX);
  if (name.length === 0) {
    errors.name = "Enter their name, so we know who this is for.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, name, life_dates: text(record.life_dates, LOVED_ONE_DATES_MAX) };
}
