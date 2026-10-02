/**
 * The one reading of a field lead-capture submission, shared by the BFF route
 * and the browser form.
 *
 * WHY IT LIVES HERE. `web/AGENTS.md` rule 1 keeps route handlers dumb: a BFF
 * route may read a body, ask a pure function for a verdict, and persist through
 * the owning store. The rules a capture must satisfy are therefore here, not in
 * the handler — the same pattern as `lib/agent/stage-move.ts` and
 * `lib/inquiry-intake.ts`.
 *
 * THE RULES. Only the phone number and what the person needs are required — the
 * field reality the capture design serves (one hand, one minute). A name is
 * helpful but optional. Every value is bounded so one pasted essay cannot make
 * the pipeline unusable, and the need is mapped to the pipeline's own interest
 * vocabulary rather than freed into the record.
 */
import type { Prospect } from "@/lib/api-client/agent";
import type { CapturedLead } from "@/lib/agent/acquisition";

export const LEAD_CAPTURE_NEEDS = ["plan", "lot", "services", "unsure"] as const;
export type LeadCaptureNeed = (typeof LEAD_CAPTURE_NEEDS)[number];

export const LEAD_CAPTURE_SOURCES = ["walk_in", "referral", "facebook", "event"] as const;
export type LeadCaptureSource = (typeof LEAD_CAPTURE_SOURCES)[number];

export const LEAD_CAPTURE_NAME_MAX = 120;
export const LEAD_CAPTURE_PHONE_MAX = 40;
export const LEAD_CAPTURE_CALLBACK_MAX = 120;
export const LEAD_CAPTURE_NOTE_MAX = 500;

const NEED_LABELS: Record<LeadCaptureNeed, { interest: Prospect["interest"]; want: string }> = {
  plan: { interest: "plan", want: "A pre-need plan" },
  lot: { interest: "lot", want: "A memorial lot" },
  services: { interest: "services", want: "Funeral services" },
  unsure: { interest: "unsure", want: "Not sure yet — stay in touch" },
};

export type LeadCaptureIntake =
  | {
      ok: true;
      value: Omit<CapturedLead, "captured_at" | "captured_by" | "id">;
    }
  | { ok: false; errors: Record<string, string> };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The pure verdict for one capture. Never throws, never persists. */
export function readLeadCapture(values: unknown): LeadCaptureIntake {
  const record = typeof values === "object" && values !== null ? (values as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};

  const phone = text(record.phone, LEAD_CAPTURE_PHONE_MAX);
  if (phone.length === 0) {
    errors.phone = "Enter the phone number — it is how you reach them again.";
  }

  const need = record.need;
  if (need !== "plan" && need !== "lot" && need !== "services" && need !== "unsure") {
    errors.need = "Choose what they need — even “not sure yet” counts.";
  }

  const source = record.source;
  const cleanSource =
    source === "walk_in" || source === "referral" || source === "facebook" || source === "event"
      ? source
      : "walk_in";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const label = NEED_LABELS[need as LeadCaptureNeed];
  return {
    ok: true,
    value: {
      name: text(record.name, LEAD_CAPTURE_NAME_MAX),
      phone,
      source: cleanSource,
      interest: label.interest,
      want: label.want,
      callback: text(record.callback, LEAD_CAPTURE_CALLBACK_MAX),
      note: text(record.note, LEAD_CAPTURE_NOTE_MAX),
    },
  };
}
