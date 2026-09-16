/**
 * DEMO-LOCAL inquiry capture store — the seam the public contact form and the
 * staff inquiries board share while no service exists.
 *
 * ⚠ NO CONTRACT: the crm-families write API is unbuilt, so nothing recorded
 * here is sent anywhere and no service payload shape is implied. Rows live in
 * this browser (localStorage, the same demo-local persistence pattern as the
 * cart and the park-map editor) so a contact-form capture appears on the staff
 * inquiries board on this device — mirroring the legacy mock-up's in-memory
 * inbox round-trip. Confirmation copy must stay explicit that this is not
 * delivery.
 *
 * When a crm-families write contract lands, a BFF route replaces this store
 * and the screens' confirmations switch from demo wording to a real receipt.
 * Never hand this store to live-path reads: it is browser data, not records.
 */
import type { Inquiry } from "@/lib/api-client/crm";
import type { ContactValues } from "@/lib/public-forms/validation";

const STORAGE_KEY = "vm.demo.inquiries.v1";
/** Keep the demo store bounded — it is a browser toy, not a ledger. */
const MAX_STORED = 50;

export type DemoInquiryInput = {
  full_name: string;
  email: string;
  phone: string;
  source: Inquiry["source"];
  topic: string;
  message: string;
  assigned_to?: string;
};

/** Fallback when localStorage is unavailable (private mode, SSR) — session only. */
let memoryFallback: Inquiry[] = [];

function isInquiry(value: unknown): value is Inquiry {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.reference === "string" &&
    typeof row.received_at === "string" &&
    typeof row.topic === "string" &&
    typeof row.person === "object" &&
    row.person !== null
  );
}

function readStored(): Inquiry[] {
  if (typeof window === "undefined") return memoryFallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryFallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isInquiry) : memoryFallback;
  } catch {
    return memoryFallback;
  }
}

function writeStored(rows: Inquiry[]): void {
  memoryFallback = rows;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Private mode / storage full: the in-memory fallback keeps the demo alive.
  }
}

export function readDemoInquiries(): Inquiry[] {
  return readStored().map((row) => ({ ...row }));
}

export function captureDemoInquiry(input: DemoInquiryInput): Inquiry {
  const rows = readStored();
  const now = new Date();
  const inquiry: Inquiry = {
    id: `demo-${now.getTime()}`,
    reference: `INQ-DEMO-${String(rows.length + 1).padStart(3, "0")}`,
    person: {
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
    },
    source: input.source,
    topic: input.topic.trim(),
    message: input.message.trim(),
    assigned_to: input.assigned_to?.trim() || "Unassigned",
    status: "new",
    received_at: now.toISOString(),
  };
  writeStored([inquiry, ...rows].slice(0, MAX_STORED));
  return inquiry;
}

/**
 * Map the public contact form to the board's inquiry row. The visitor's message
 * is the substance, so its first line becomes the board's topic (clamped) and
 * the whole text stays in `message`; source is `website` per the lead-source
 * enum the board already filters on.
 */
export function contactInquiryInput(values: ContactValues): DemoInquiryInput {
  const message = values.message.trim();
  const firstLine = message.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const topic = firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine;
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    source: "website",
    topic: topic || "Website enquiry",
    message,
    assigned_to: "Unassigned",
  };
}
