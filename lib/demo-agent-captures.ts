/**
 * DEMO-LOCAL agent lead-capture store — the seam the field capture form uses
 * while no crm-families write contract exists.
 *
 * ⚠ NO CONTRACT: nothing recorded here is sent anywhere and no service payload
 * shape is implied. Rows live in this browser (localStorage, the same demo-local
 * pattern as the quote basket and the public contact form) so a lead captured at a door
 * survives the app being closed — the field reality the design serves.
 *
 * When a crm-families write route lands, a BFF route replaces this store and the
 * confirmation copy switches from demo wording to a real receipt. Never hand
 * this store to live-path reads: it is browser data, not records.
 *
 * The shape mirrors the approved capture design (docs/08-delivery/
 * agent-portal-design, page 12): only the phone and the need are required.
 */

const STORAGE_KEY = "vm.demo.agent-leads.v1";
/** Keep the demo store bounded — it is a browser queue, not a ledger. */
const MAX_STORED = 50;

export type AgentLeadNeed = "plan" | "lot" | "services" | "unsure";
export type AgentLeadSource = "walk_in" | "referral" | "facebook" | "event";
export type AgentLeadState = "queued" | "sent";

export type AgentLeadCapture = {
  id: string;
  name: string;
  phone: string;
  need: AgentLeadNeed;
  source: AgentLeadSource;
  callback: string;
  note: string;
  has_photo: boolean;
  state: AgentLeadState;
  captured_at: string;
};

export type AgentLeadInput = {
  name?: string;
  phone: string;
  need: AgentLeadNeed;
  source?: AgentLeadSource;
  callback?: string;
  note?: string;
  has_photo?: boolean;
};

/** Fallback when localStorage is unavailable (private mode, SSR) — session only. */
let memoryFallback: AgentLeadCapture[] = [];

function isCapture(value: unknown): value is AgentLeadCapture {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.phone === "string" &&
    typeof row.captured_at === "string" &&
    typeof row.need === "string"
  );
}

function readStored(): AgentLeadCapture[] {
  if (typeof window === "undefined") return memoryFallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryFallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCapture) : memoryFallback;
  } catch {
    return memoryFallback;
  }
}

function writeStored(rows: AgentLeadCapture[]): void {
  const bounded = rows.slice(-MAX_STORED);
  memoryFallback = bounded;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // Private mode / quota — the in-memory copy still serves this session.
  }
}

/** Capture one lead. Duplicate phone numbers return the existing row instead. */
export function saveAgentLead(input: AgentLeadInput): { capture: AgentLeadCapture; duplicate: boolean } {
  const rows = readStored();
  const phone = input.phone.trim();
  const existing = rows.find((r) => r.phone.replace(/\s/g, "") === phone.replace(/\s/g, ""));
  if (existing) return { capture: existing, duplicate: true };

  const capture: AgentLeadCapture = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lead-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: input.name?.trim() ?? "",
    phone,
    need: input.need,
    source: input.source ?? "walk_in",
    callback: input.callback?.trim() ?? "",
    note: input.note?.trim() ?? "",
    has_photo: Boolean(input.has_photo),
    state: "queued",
    captured_at: new Date().toISOString(),
  };
  writeStored([...rows, capture]);
  return { capture, duplicate: false };
}

export function listAgentLeads(): AgentLeadCapture[] {
  return readStored();
}

export function clearAgentLeads(): void {
  writeStored([]);
}

export const NEED_OPTIONS: ReadonlyArray<{ value: AgentLeadNeed; label: string; hint: string }> = [
  { value: "plan", label: "A plan", hint: "pre-need" },
  { value: "lot", label: "A memorial lot", hint: "property" },
  { value: "services", label: "Funeral services", hint: "at need" },
  { value: "unsure", label: "Not sure yet", hint: "stay in touch" },
];

export const SOURCE_OPTIONS: ReadonlyArray<{ value: AgentLeadSource; label: string; hint: string }> = [
  { value: "walk_in", label: "Walk-in", hint: "they came to us" },
  { value: "referral", label: "Referral", hint: "a family sent them" },
  { value: "facebook", label: "Facebook", hint: "page message" },
  { value: "event", label: "Event", hint: "community" },
];
