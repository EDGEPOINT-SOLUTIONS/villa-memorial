/**
 * The General Price List — ONE source for the public page and its PDF.
 *
 * The captain asked for a dedicated General Price List page and "the same thing
 * as a PDF" (2026-10-02, inbox 004): an itemised list in the convention of the
 * reference General Price List he sent — professional services · facilities and
 * equipment · transportation · merchandise · plans and lots · cash assistance ·
 * branches — with an effective date and no hidden package.
 *
 * EVERY FIGURE IS A READ, NEVER AUTHORED HERE. The plan rates and the lot
 * families come from the current pricing document (`loadPricingDocument()`,
 * read through `planRateOf` / `lotCategoryFromPriceOf`); the 24 casket models,
 * the cash assistance and the branch list are the client's recorded 2026
 * material in `lib/villa-pricing.ts` and the plan document's `serving` note.
 * The funeral services (embalming, chapels, transfers) keep the client's
 * "quoted, not listed" rule — the office prepares a written quotation — so they
 * are itemised with an explicit "Quoted" and no invented amount.
 *
 * The page (`app/(public)/general-price-list/page.tsx`) and the PDF route
 * (`app/api/export/paper-pdf?document=general-price-list`) both call
 * `buildGeneralPriceList` / `buildGeneralPriceListPaper`, so the screen and the
 * printed file cannot drift. The a-la-carte service figures that ARE recorded
 * stay in `lib/villa-pricing.ts` as the office's quotation source and are
 * deliberately not printed here (captain's minutes 2026-09-21, item 5).
 */

import {
  CASH_ASSISTANCE,
  CASKET_MODELS,
  EMBALMING_RATES,
  PLAN_TIERS,
  php,
} from "@/lib/villa-pricing";
import { PLAN_TERM_DEFS, planRateOf, type PricingDocument } from "@/lib/pricing-model";
import type { ContactInfo } from "@/lib/api-client/landing";
import { line, space, table, type PaperBlock } from "@/lib/export/types";
import { PAPER_PROFILES, type PaperProfile } from "@/lib/export/paper-profile";

/** The office's published branches, read from the plan document's `serving` note. */
export const GPL_BRANCHES: ReadonlyArray<string> = [
  "Funeraria Villa – Capilla de San Jose, Isabela City, Basilan",
  "Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City",
  "Villa ZC-Arcega Funeral Homes – Zamboanga City",
  "All Villa-affiliated funeral parlors around Mindanao",
];

export type GplLine = {
  /** The item, exactly as the office names it. */
  label: string;
  /** A short scope line (never a sentence). */
  detail?: string;
  /** "Quoted" for a service the office prices by hand, or a printed amount. */
  amount?: string;
};

export type GplTable = {
  /** A short label above the table ("Regular rates", "Senior-citizen rates"). */
  caption?: string;
  columns: number;
  head: string[];
  rows: string[][];
  widths?: number[];
};

export type GplSection = {
  id: string;
  kicker: string;
  title: string;
  lead?: string;
  /** Itemised lines, used by the service and branch sections. */
  lines?: GplLine[];
  /** One or more tables, used by the priced sections. */
  tables?: GplTable[];
  /** One honest line under the section (a scope rule or a not-offered note). */
  note?: string;
};

export type GeneralPriceList = {
  /** The list's effective line, as the office publishes it. */
  effective: string;
  sections: GplSection[];
};

const QUOTED = "Quoted";

/** The first and last day counts the office prices for embalming. */
const EMBALMING_SPAN = `${EMBALMING_RATES[0].days}–${EMBALMING_RATES[EMBALMING_RATES.length - 1].days} days`;

const NOT_OFFERED =
  "Villa Funeraria does not offer cremation, urns or outer containers; the office can advise where those are arranged.";

/**
 * Build the General Price List from the current pricing document and the live
 * contact record. Pure: no I/O, no clock.
 */
export function buildGeneralPriceList(
  pricing: PricingDocument,
  contact: ContactInfo,
): GeneralPriceList {
  const planTable = (senior: boolean): GplTable => ({
    caption: senior ? "Senior-citizen rates — ages 61–100, no insurance benefit" : "Regular rates",
    columns: 5,
    head: ["Plan tier", "Monthly", "Quarterly", "Semi-annual", "Annual"],
    rows: PLAN_TIERS.map((tier) => [
      tier.name,
      ...PLAN_TERM_DEFS.map((term) => php(planRateOf(pricing.plans, tier.id, term.id, senior))),
    ]),
  });

  const lotTables: GplTable[] = pricing.lotCategories.map((category) => ({
    caption: `${category.title} — ${category.caption}`,
    columns: 6,
    head: [
      "Product",
      "Area (sqm)",
      "Regular total",
      "Regular monthly",
      "Senior total",
      "Senior monthly",
    ],
    rows: category.rows.map((row) => [
      row.product,
      String(row.area),
      php(row.regular.selling),
      php(row.regular.monthly),
      php(row.senior.selling),
      php(row.senior.monthly),
    ]),
    widths: [0.26, 0.12, 0.16, 0.16, 0.15, 0.15],
  }));

  return {
    effective: "Effective 2026",
    sections: [
      {
        id: "professional-services",
        kicker: "1 · Professional services",
        title: "Preparation and care",
        lead: "Quoted for your family — the office prepares one written quotation.",
        lines: [
          {
            label: "Embalming, make-up and dressing",
            detail: EMBALMING_SPAN,
            amount: QUOTED,
          },
          { label: "Interment service", detail: "Graveside service and assistance", amount: QUOTED },
        ],
        note: "Services are quoted, not listed: the office confirms every amount in writing.",
      },
      {
        id: "facilities",
        kicker: "2 · Facilities & equipment",
        title: "The chapel and the viewing",
        lead: "Quoted for your family — the office checks the dates before it quotes.",
        lines: [
          { label: "Chapel use — common chapel", detail: "Shared hall, per day", amount: QUOTED },
          {
            label: "Chapel use — private chapel",
            detail: "A room for your family alone, per day",
            amount: QUOTED,
          },
          { label: "Viewing equipment", detail: "Lights, curtains and carpets", amount: QUOTED },
        ],
      },
      {
        id: "transportation",
        kicker: "3 · Transportation",
        title: "Transfers and delivery",
        lead: "Quoted for your family, by distance and date.",
        lines: [
          { label: "Retrieval", detail: "Transfer into our care", amount: QUOTED },
          { label: "Delivery to the wake or chapel", amount: QUOTED },
          { label: "Transfer to the burial site", detail: "Family car and the graveside trip", amount: QUOTED },
        ],
      },
      {
        id: "merchandise",
        kicker: "4 · Merchandise",
        title: "Coffins & caskets",
        lead: `${CASKET_MODELS.length} models in four collections — regular and senior prices.`,
        lines: [{ label: "ORD coffin (a-la-carte)", detail: "A simple plan coffin", amount: QUOTED }],
        tables: [
          {
            columns: 4,
            head: ["Model", "Collection", "Regular SRP", "Senior-citizen price"],
            rows: CASKET_MODELS.map((model) => [
              model.model,
              model.collection,
              php(model.srp),
              php(model.seniorPrice),
            ]),
            widths: [0.3, 0.36, 0.17, 0.17],
          },
        ],
        note: NOT_OFFERED,
      },
      {
        id: "plans-lots",
        kicker: "5 · Plans & lots",
        title: "The plan and the park lots",
        lead: "Five tiers, four payment modes, and every lot family on six-year amortization.",
        tables: [planTable(false), planTable(true), ...lotTables],
        note: "Cash assistance for planholders is listed under section 6.",
      },
      {
        id: "cash-assistance",
        kicker: "6 · Cash assistance",
        title: "What the plan pays back",
        lead: "With a hospital benefit, paid during the paying period.",
        tables: [
          {
            columns: 2,
            head: ["Plan tiers", "Cash assistance"],
            rows: CASH_ASSISTANCE.map((row) => [row.tiers, php(row.amount)]),
            widths: [0.6, 0.4],
          },
        ],
      },
      {
        id: "branches",
        kicker: "7 · Branches",
        title: "Where the office is",
        lines: [
          ...GPL_BRANCHES.map((branch) => ({ label: branch })),
          { label: `24/7 assistance line — ${contact.phoneDisplay}` },
          { label: `Main office — ${contact.officeAddress}` },
        ],
      },
    ],
  };
}

/**
 * The General Price List as paper blocks, using the quotation sheet's own
 * profile (`family-request`, the 8.5 × 14 legal stationery the office prints on).
 * The PDF route reads this beside `lib/export/pdf.ts`.
 */
export function buildGeneralPriceListPaper(
  pricing: PricingDocument,
  contact: ContactInfo,
): { profile: PaperProfile; blocks: PaperBlock[] } {
  const gpl = buildGeneralPriceList(pricing, contact);
  const profile = PAPER_PROFILES["family-request"];
  const blocks: PaperBlock[] = [
    line("VILLA FUNERARIA — SANCTUARIO DE MERCEDES Y GLORIA", {
      bold: true,
      align: "center",
      caps: true,
      typeface: "heading",
      size: 12,
      spaceAfter: 2,
    }),
    line("GENERAL PRICE LIST", {
      bold: true,
      align: "center",
      caps: true,
      size: 12,
      spaceAfter: 2,
    }),
    line(gpl.effective, { align: "center", size: 10, spaceAfter: 8 }),
    line(`${contact.phoneDisplay} · ${contact.officeAddress}`, {
      align: "center",
      size: 9,
      spaceAfter: 10,
    }),
  ];

  for (const section of gpl.sections) {
    blocks.push(space(6));
    blocks.push(
      line(`${section.kicker} — ${section.title}`, { bold: true, size: 11, spaceAfter: 2 }),
    );
    if (section.lead) blocks.push(line(section.lead, { size: 9, spaceAfter: 4 }));

    if (section.lines) {
      const hasAmount = section.lines.some((item) => item.amount);
      const columns = hasAmount ? 2 : 1;
      const head = hasAmount ? ["Item", "Amount"] : ["Item"];
      blocks.push(
        table(
          columns,
          section.lines.map((item) => {
            const label = item.detail ? `${item.label} — ${item.detail}` : item.label;
            return hasAmount
              ? [{ value: label }, { value: item.amount ?? "" }]
              : [{ value: label }];
          }),
          hasAmount ? { head, widths: [0.72, 0.28] } : { head },
        ),
      );
      blocks.push(space(4));
    }

    for (const t of section.tables ?? []) {
      if (t.caption) blocks.push(line(t.caption, { bold: true, size: 9, spaceAfter: 2 }));
      blocks.push(
        table(
          t.columns,
          t.rows.map((row) => row.map((cell) => ({ value: cell }))),
          { head: t.head, ...(t.widths ? { widths: t.widths } : {}) },
        ),
      );
      blocks.push(space(4));
    }

    if (section.note) blocks.push(line(section.note, { size: 8, spaceAfter: 6 }));
  }

  return { profile, blocks };
}
