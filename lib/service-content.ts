/**
 * Funeraria Memorial Services — the ONE typed reading of its editable content.
 *
 * Phase 3 of the content-catalogue plan (data/villa-content-catalog-plan/report.md
 * §9/§11 step 5). The captain's direction: the page is ONE hero, then straight to
 * the services; the three guide pages become service entries in the Services
 * catalogue; the chapel names read the park's own chapel record.
 *
 * TWO CONTENT LAYERS, both editable in Pages & content → Funeraria Memorial
 * Services:
 *   · the PAGE DOCUMENT (lib/fixtures/content/pages.json, key `services`): the
 *     hero, plus the service descriptions that used to be typed into
 *     components/villa/service-rates-2026.tsx — the five a-la-carte notes and
 *     the two chapel-class copy lines. Stable block ids set the typed reading
 *     below (`services-alacarte-*`, `services-chapel-*`), exactly the
 *     `plans-note-<key>` convention Phase 2 established.
 *   · the SERVICE ENTRIES (lib/fixtures/content/service-entries.json): the three
 *     guide pages as CatalogueEntry records of kind `service`, reached from their
 *     own route and listed on /services.
 *
 * A missing block is an HONEST FALLBACK to the copy the page published before
 * the migration — never a crash and never a fabricated sentence. Money is never
 * here: the prices stay bound to the catalogue / the sheet constants.
 */
import type { CatalogueEntry, ContentBlock, PageDocument } from "@/lib/content-catalog";
import { CHAPEL_CLASS_LABEL, type ChapelClass } from "@/lib/chapel-booking";
import { CLIENT_PHOTOS, clientPhotoCard, clientPhotoWide, type ClientPhotoId } from "@/lib/client-photos";

/* ---------------------------- the guide entries ---------------------------- */

export type ServiceEntryDef = {
  key: string;
  /** The public route the entry feeds (kept from the pre-migration page). */
  route: string;
  /** The entry's group label (the Services catalogue groups by it). */
  eyebrow: string;
  /** The title the page falls back to when the entry is missing. */
  fallbackTitle: string;
  fallbackSummary: string;
  /**
   * The guide hero's ONE short answer (≤ 12 words) — the reading-budget
   * opening line. The entry's editable `summary` stays published behind the
   * step section's disclosure (story-lane pass, 2026-09-22).
   */
  fallbackLead: string;
  /** The three steps every guide answers with (plan §5.2). */
  steps: ReadonlyArray<{ title: string; body: string }>;
  /** The guide page's own secondary action (the primary is Immediate assistance). */
  secondaryHref: string;
  secondaryLabel: string;
};

/**
 * The guide pages that stay as service entries under Funeraria Memorial
 * Services — transport alone since the captain retired the death-at-home and
 * death-at-hospital pages (2026-09-30). Order is the page's own listing order;
 * the keys are the entry identities the store saves by.
 */
export const SERVICE_ENTRY_DEFS: ReadonlyArray<ServiceEntryDef> = [
  {
    key: "transport",
    route: "/transport",
    eyebrow: "Services · Transport",
    fallbackTitle: "Transport",
    fallbackSummary:
      "Dignified transport from home or hospital to the service venue, and onward when the time comes. Our team coordinates it for you.",
    fallbackLead: "Dignified transport, coordinated for you door to door.",
    steps: [
      { title: "Call us", body: "Any hour — a coordinator answers and stays with you." },
      { title: "We set the route", body: "From home or hospital to the venue we agree." },
      { title: "We make the trip", body: "The carriage and staff arrive when you need them." },
    ],
    secondaryHref: "/price-list",
    secondaryLabel: "Villa Memorial Plan",
  },
] as const;

export function serviceEntryDef(key: string): ServiceEntryDef | undefined {
  return SERVICE_ENTRY_DEFS.find((def) => def.key === key);
}

export function serviceEntryDefForRoute(route: string): ServiceEntryDef | undefined {
  return SERVICE_ENTRY_DEFS.find((def) => def.route === route);
}

/* ---------------------- the page document's service copy -------------------- */

/** The a-la-carte line name → the paragraph block that carries its description. */
export const SERVICE_ALACARTE_NOTE_IDS: Readonly<Record<string, string>> = {
  Retrieval: "services-alacarte-retrieval",
  Delivery: "services-alacarte-delivery",
  "Viewing equipment": "services-alacarte-viewing",
  "ORD coffin": "services-alacarte-ord-coffin",
  Interment: "services-alacarte-interment",
};

/** The chapel class → the paragraph block that carries its description. */
export const SERVICE_CHAPEL_NOTE_IDS: Readonly<Record<ChapelClass, string>> = {
  common: "services-chapel-common",
  private: "services-chapel-private",
};

/**
 * The descriptions the page published in code before Phase 3. They are the
 * fallback for a document that predates the migration (or lost the block), so
 * the page never renders an empty line.
 */
export const SERVICE_ALACARTE_FALLBACK_NOTES: Readonly<Record<string, string>> = {
  Retrieval: "Into our care, first 25 km.",
  Delivery: "Delivery to the wake or chapel.",
  "Viewing equipment": "Lights, curtains and carpets, set up.",
  "ORD coffin": "A simple plain coffin. Other models: catalogue.",
  Interment: "Family cars and the graveside trip, staff included.",
};

export const SERVICE_CHAPEL_FALLBACK_NOTES: Readonly<Record<ChapelClass, string>> = {
  common: "Shared chapel; several families at once.",
  private: "A room for your family alone.",
};

export type ServicePageContent = {
  /** One plain description per a-la-carte service line. */
  alacarteNotes: Readonly<Record<string, string>>;
  /** One copy line per chapel class. */
  chapelNotes: Readonly<Record<ChapelClass, string>>;
};

function paragraphText(document: PageDocument | null, id: string): string {
  const block = document?.blocks.find((entry) => entry.id === id);
  if (!block || block.type !== "paragraph") return "";
  return block.body
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Read the page document's service descriptions, falling back to the seed copy. */
export function servicePageContentFromDocument(document: PageDocument | null): ServicePageContent {
  const alacarteNotes: Record<string, string> = {};
  for (const [service, id] of Object.entries(SERVICE_ALACARTE_NOTE_IDS)) {
    alacarteNotes[service] = paragraphText(document, id) || SERVICE_ALACARTE_FALLBACK_NOTES[service] || "";
  }
  return {
    alacarteNotes,
    chapelNotes: {
      common: paragraphText(document, SERVICE_CHAPEL_NOTE_IDS.common) || SERVICE_CHAPEL_FALLBACK_NOTES.common,
      private: paragraphText(document, SERVICE_CHAPEL_NOTE_IDS.private) || SERVICE_CHAPEL_FALLBACK_NOTES.private,
    },
  };
}

/* ------------------------------- entry views -------------------------------- */

export type ServiceEntryView = {
  key: string;
  route: string;
  eyebrow: string;
  title: string;
  summary: string;
  /** The hero's one short answer (≤ 12 words) — the reading-budget opening. */
  lead: string;
  /** The three steps the guide answers with (plan §5.2). */
  steps: ReadonlyArray<{ title: string; body: string }>;
  heroSrc: string | null;
  heroAlt: string;
  heroCaption: string | null;
  /** A sample/illustrative picture (the sheet's own rule stays visible). */
  heroSample: boolean;
  blocks: ContentBlock[];
};

/**
 * The guide page's values, read from its entry. A missing entry falls back to
 * the recorded copy so the route is honest even if the store lost the record —
 * and never invents a sentence the entry does not carry.
 */
export function serviceEntryView(
  entry: CatalogueEntry | null,
  def: ServiceEntryDef,
): ServiceEntryView {
  const heroImage = entry?.media.gallery[0] ?? null;
  const heroSrc = entry?.media.hero ?? heroImage?.src ?? null;
  return {
    key: def.key,
    route: def.route,
    eyebrow: entry?.group?.trim() || def.eyebrow,
    title: entry?.title?.trim() || def.fallbackTitle,
    summary: entry?.summary?.trim() || def.fallbackSummary,
    lead: def.fallbackLead,
    steps: def.steps,
    heroSrc,
    heroAlt: heroImage?.alt?.trim() || def.fallbackTitle,
    heroCaption: heroImage?.caption ?? null,
    heroSample: heroImage?.sample === true,
    blocks: entry?.blocks ?? [],
  };
}

/** Whether a block id is consumed by the service copy readers (hidden from the generic block list). */
export function isServiceCopyBlockId(id: string): boolean {
  return (
    Object.values(SERVICE_ALACARTE_NOTE_IDS).includes(id) ||
    Object.values(SERVICE_CHAPEL_NOTE_IDS).includes(id)
  );
}

/**
 * The entry hero as the page renders it. A client photograph is resolved through
 * lib/client-photos.ts (the ONE imagery rule home) so the card/hero gets the
 * published derivative and its srcSet; anything else is used as stored.
 */
export function serviceHeroVariant(
  src: string | null,
  role: "card" | "wide" = "wide",
): { src: string; srcSet?: string } | null {
  if (!src) return null;
  const id = (Object.keys(CLIENT_PHOTOS) as ClientPhotoId[]).find((key) => src.includes(`${key}-`));
  if (!id) return { src };
  const variant = role === "card" ? clientPhotoCard(id) : clientPhotoWide(id);
  return { src: variant.src, srcSet: variant.srcSet };
}

/** The chapel-class label used beside a record's own name (never the name itself). */
export function chapelClassLabel(chapelClass: ChapelClass): string {
  return CHAPEL_CLASS_LABEL[chapelClass];
}
