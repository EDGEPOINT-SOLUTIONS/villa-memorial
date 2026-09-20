/**
 * The Villa Memorial Plan's presentational content — ONE typed reading of the
 * "Villa Memorial Plan" page document (Phase 2 of the content-catalogue plan,
 * data/villa-content-catalog-plan/report.md §9/§11).
 *
 * WHAT THIS IS: the plan's eligibility, senior terms, package inclusions and
 * notes used to live as constants in `lib/villa-pricing.ts` (`VMP_PACKAGE`,
 * `VMP_ELIGIBILITY`, `VMP_NOTES`, `VMP_INCLUSIONS`, `SENIOR_TERMS`). Phase 2
 * moved them into the editable page document in Pages & content, so the office
 * can change the copy without a developer. This module is the ONE place that
 * turns the document's blocks back into the typed values every plan surface
 * reads — `/plans`, the plan sub-pages, the package detail page, the staff
 * membership screens, the service builder and the lot price list — so a single
 * edit reaches them all.
 *
 * THE CONVENTIONS (stable block ids, set by the seed and preserved by the
 * editor's field edits):
 *   · `plans-tier-<tierId>`  a checklist block — one per plan tier
 *   · `plans-package`        a two-column table — "Included" · "What it covers"
 *   · `plans-eligibility`    a bullets block
 *   · `plans-senior-terms`   a bullets block
 *   · `plans-note-<key>`     a note block — contestability · assign · extras ·
 *                            serving · adjust
 *
 * A missing block is an HONEST EMPTY VALUE, never a crash and never a
 * fabricated sentence: a consumer renders nothing (or names the gap) rather
 * than inventing plan copy. The money is never here — the rate tables and cash
 * assistance stay bound to the pricing store / the sheet constant.
 */
import type { ChecklistItem, ContentBlock, PageDocument } from "@/lib/content-catalog";
import { PLAN_TIERS, type PlanTier } from "@/lib/villa-pricing";

export type PlanTierContent = {
  tier: PlanTier;
  heading: string;
  mode: "dropdown" | "printed";
  items: ChecklistItem[];
};

/** One "what the package includes" line — service + how the sheet describes it. */
export type PlanInclusion = { label: string; detail: string };

export type PlanNotes = {
  contestability: string;
  assign: string;
  extras: string;
  serving: string;
  adjust: string;
};

export type PlanContent = {
  tiers: PlanTierContent[];
  packageInclusions: PlanInclusion[];
  eligibility: string[];
  seniorTerms: string[];
  notes: PlanNotes;
};

export const PLAN_NOTE_KEYS = ["contestability", "assign", "extras", "serving", "adjust"] as const;
export type PlanNoteKey = (typeof PLAN_NOTE_KEYS)[number];

function blockById(document: PageDocument | null, id: string): ContentBlock | undefined {
  return document?.blocks.find((block) => block.id === id);
}

function textItemsFromBullets(document: PageDocument | null, id: string): string[] {
  const block = blockById(document, id);
  if (!block || block.type !== "bullets") return [];
  return block.items.map((item) => item.trim()).filter(Boolean);
}

function packageInclusionsFromTable(document: PageDocument | null): PlanInclusion[] {
  const block = blockById(document, "plans-package");
  if (!block || block.type !== "table") return [];
  return block.rows
    .map((row) => ({ label: (row[0] ?? "").trim(), detail: (row[1] ?? "").trim() }))
    .filter((row) => row.label.length > 0);
}

function noteText(document: PageDocument | null, key: PlanNoteKey): string {
  const block = blockById(document, `plans-note-${key}`);
  return block && block.type === "note" ? block.text.trim() : "";
}

/**
 * The five tiers, in the client's order. A tier the document does not carry is
 * omitted (the page renders only what staff published), never re-invented.
 */
function tierContent(document: PageDocument | null): PlanTierContent[] {
  return PLAN_TIERS.flatMap(({ id }) => {
    const block = blockById(document, `plans-tier-${id}`);
    if (!block || block.type !== "checklist") return [];
    return [
      {
        tier: id,
        heading: block.heading || PLAN_TIERS.find((t) => t.id === id)?.name || id,
        mode: block.mode,
        items: block.items,
      },
    ];
  });
}

/** Read every presentational value the plan's surfaces share from the document. */
export function planContentFromDocument(document: PageDocument | null): PlanContent {
  return {
    tiers: tierContent(document),
    packageInclusions: packageInclusionsFromTable(document),
    eligibility: textItemsFromBullets(document, "plans-eligibility"),
    seniorTerms: textItemsFromBullets(document, "plans-senior-terms"),
    notes: {
      contestability: noteText(document, "contestability"),
      assign: noteText(document, "assign"),
      extras: noteText(document, "extras"),
      serving: noteText(document, "serving"),
      adjust: noteText(document, "adjust"),
    },
  };
}
