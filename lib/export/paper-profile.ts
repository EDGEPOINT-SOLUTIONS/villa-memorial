/**
 * The paper layer — the ONE home for what Villa's printed documents look like.
 *
 * These are not screens. They are the office's own papers (the service contract, the
 * purchase application/agreement, the receipts and the membership application), and the
 * geometry and the type below are MEASURED from the client's own `.docx` files, staged
 * read-only under `docs/07-client-villa/paper-forms/` — never chosen for taste:
 *
 *   Service Contract Form.docx        pgSz 12240 x 20160 twips (8.5 x 14 in — US Legal /
 *                                     Philippine long bond), pgMar 1440/1440/2592/1440
 *                                     (1 in top, 1 in sides, 1.8 in bottom), runs
 *                                     10.5 pt. Its Latin text resolves to the document
 *                                     theme's minor face (Calibri): every run overrides
 *                                     only `w:eastAsia`/`w:cs` with Times New Roman — see
 *                                     the Latin-face note below.
 *   Purchase Application Form.docx    the 2026 combined application + agreement:
 *                                     pgSz 12240 x 18720 (8.5 x 13 in — Philippine long
 *                                     bond / folio), pgMar 720 all round (0.5 in),
 *                                     letterhead Bookman Old Style 10 pt, fields and
 *                                     body Times New Roman 8 pt.
 *   Purchase Agreement.docx           the earlier standalone 2025 deed: 8.5 x 14 in Legal,
 *                                     1440/1440/2880/1440 (1 in top and sides, 2 in
 *                                     bottom), body Arial 10 pt.
 *   SC Agreement 2026.docx            the Sales Agent Agreement: 8.5 x 14 in Legal,
 *                                     720-1152 side margins, 2 in bottom, Times 8-9 pt.
 *   SANCTUARIOAMENDMENT FORM.docx     8.5 x 11 in Letter, 0.5 in margins, Bookman 9 pt.
 *
 * THE SOURCES DISAGREE, so this module does not flatten them into one sheet. The
 * documents the app prints get the profile of the paper they replace: the service
 * contract is the 8.5 x 14 legal sheet above; the purchase document is the 2026 combined
 * form's 8.5 x 13 folio (it supersedes the separate application + agreement, and
 * `lib/contracts/purchase-paper.ts` renders both halves as one document), while a
 * 2025-revision lot purchase keeps the earlier standalone deed's 8.5 x 14 Arial sheet;
 * the receipts and the membership folio have NO client paper on file, so they follow the
 * office's legal stationery and the application family respectively, and say so in their
 * provenance lines below.
 *
 * ONE PLACE, THREE RENDERERS: `PaperSheet` (screen + the print stylesheet),
 * `lib/export/docx.ts` and `lib/export/pdf.ts` all read these profiles, so the sheet the
 * clerk reviews, the file they print and the Word/PDF downloads cannot drift.
 *
 * TYPE, AND THE ONE DECLARED SUBSTITUTION: the client's faces are Times New Roman (the
 * 2026 forms' contract body, the agent agreement), Arial (the 2025 purchase agreement)
 * and Bookman Old Style (the 2026 form's letterhead). Screen and print use the real face
 * when the office machine has it (Office ships all three); Word names the real face; the
 * PDF cannot — a PDF must embed what it prints, and the base-14 standard fonts have no
 * Bookman. Times and Arial map to their metric-compatible standard PDF faces
 * (Times-Roman, Helvetica); Bookman Old Style embeds TeX Gyre Bonum, the free
 * (GUST Font License) URW Bookman release, vendored under `public/fonts/paper/`. That is
 * the only substitution in the layer and it is declared here, once.
 *
 * THE 2025 SERVICE CONTRACT'S LATIN FACE, REPORTED PLAINLY: every run in Service
 * Contract Form.docx names only `w:eastAsia`/`w:cs` = Times New Roman, so on a Windows
 * machine its Latin text renders in the document THEME's minor face, Calibri, at 10.5 pt
 * (theme1.xml; the client's 2026 price-list PDFs are Calibri too). The app prints the
 * contract in Times New Roman instead, because that is the face those runs name, the
 * face the office's 2026 contract-family paper (Purchase Application Form.docx) sets
 * explicitly for Latin text, and the only one of the two a PDF can carry without a
 * second vendored clone — so screen, Word and PDF stay identical. Calibri is what the
 * 2025 file shows; if the office wants that, the change is this profile's `body` line.
 */
import type { PaperLine } from "@/lib/export/types";

export const PT_PER_IN = 72;
export const TWIPS_PER_IN = 1440;

export type PaperTypefaceId = "times-new-roman" | "arial" | "bookman-old-style";

/** How one renderer names a paper face. */
export type PaperPdfFace =
  | {
      /** A PDF base-14 face: named, never embedded; every reader has it. */
      kind: "standard";
      regular: string;
      bold: string;
    }
  | {
      /** A face no reader is guaranteed to have: the vendored file is embedded. */
      kind: "embedded";
      regular: string;
      bold: string;
      /** Paths under the repo the PDF renderer registers (it is a Node renderer). */
      regularFile: string;
      boldFile: string;
      /** Why this face is embedded rather than a base-14 name. */
      note: string;
    };

export type PaperTypeface = {
  id: PaperTypefaceId;
  /** The face's name, exactly as the client's Word documents carry it. */
  name: string;
  /** The screen/print stack: the office's real face first, then the closest free face. */
  css: string;
  pdf: PaperPdfFace;
};

export const PAPER_TYPEFACES: Record<PaperTypefaceId, PaperTypeface> = {
  "times-new-roman": {
    id: "times-new-roman",
    name: "Times New Roman",
    css: '"Times New Roman", "Liberation Serif", Times, Georgia, serif',
    pdf: { kind: "standard", regular: "Times-Roman", bold: "Times-Bold" },
  },
  arial: {
    id: "arial",
    name: "Arial",
    css: 'Arial, "Liberation Sans", Helvetica, "Helvetica Neue", sans-serif',
    pdf: { kind: "standard", regular: "Helvetica", bold: "Helvetica-Bold" },
  },
  "bookman-old-style": {
    id: "bookman-old-style",
    name: "Bookman Old Style",
    css: '"Bookman Old Style", "TeX Gyre Bonum", Bookman, Georgia, serif',
    pdf: {
      kind: "embedded",
      regular: "TeX Gyre Bonum",
      bold: "TeX Gyre Bonum Bold",
      regularFile: "public/fonts/paper/texgyrebonum-regular.otf",
      boldFile: "public/fonts/paper/texgyrebonum-bold.otf",
      note:
        "Bookman is not one of the PDF base-14 faces, so the sheet embeds TeX Gyre Bonum " +
        "(GUST Font License) — the free URW Bookman release the office's Bookman Old Style " +
        "is drawn from. Times and Arial map to their metric-compatible base-14 faces.",
    },
  },
};

export type PaperProfileId =
  | "service-contract"
  | "purchase-application"
  | "purchase-agreement-2025"
  | "official-receipt"
  | "provisional-receipt"
  | "membership-application";

export type PaperProfile = {
  id: PaperProfileId;
  /** The sheet in plain words, for the export tooltip and the evidence record. */
  label: string;
  /** Page width in inches (the client's `w:pgSz w:w` / 1440). */
  widthIn: number;
  /** Page height in inches (the client's `w:pgSz w:h` / 1440). */
  heightIn: number;
  /** Page margins in inches (the client's `w:pgMar` / 1440). */
  marginIn: { top: number; right: number; bottom: number; left: number };
  /** The face the document's body text carries. */
  body: PaperTypefaceId;
  /** The face its letterhead/headings carry (often the same). */
  heading: PaperTypefaceId;
  /** Body size in points for lines that do not state their own size. */
  bodyPt: number;
  /** Which client file (and which measurements) this profile comes from. */
  provenance: string;
};

const LEGAL_14 = { widthIn: 8.5, heightIn: 14 };
const LONG_BOND_13 = { widthIn: 8.5, heightIn: 13 };

/**
 * The receipt sheet. No receipt paper is archived in the client's file
 * (`docs/07-client-villa/paper-forms/` holds the service contract and the two purchase
 * papers only), so the sheet follows the office's own stationery — the 8.5 x 14 legal
 * sheet three of their four office documents use — in the contract face, Times New
 * Roman. Its margins are the one value no source fixes: 1 in all round, where the
 * contract's own bottom margin is 1.8 in only to leave room for its footer.
 */
const RECEIPT_SHEET: PaperProfile = {
  id: "official-receipt",
  label: "US Legal / Philippine long bond, 8.5 × 14 in",
  ...LEGAL_14,
  marginIn: { top: 1, right: 1, bottom: 1, left: 1 },
  body: "times-new-roman",
  heading: "times-new-roman",
  bodyPt: 10.5,
  provenance:
    "No receipt paper is archived; the office's legal stationery (the 8.5 × 14 sheet of " +
    "Service Contract Form.docx and Purchase Agreement.docx) with symmetric 1 in margins, " +
    "in the contract face Times New Roman.",
};

/** The membership folio has no archived paper either; it follows the application family. */
const MEMBERSHIP_SHEET: PaperProfile = {
  id: "membership-application",
  label: "Philippine long bond / folio, 8.5 × 13 in",
  ...LONG_BOND_13,
  marginIn: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
  body: "times-new-roman",
  heading: "bookman-old-style",
  bodyPt: 10,
  provenance:
    "No plan-membership paper is archived (the signed membership/COC paper is a client " +
    "open question); the folio follows the nearest Villa form, Purchase Application Form.docx " +
    "(8.5 × 13 in, 0.5 in margins, Times body + Bookman letterhead).",
};

export const PAPER_PROFILES: Record<PaperProfileId, PaperProfile> = {
  "service-contract": {
    id: "service-contract",
    label: "US Legal / Philippine long bond, 8.5 × 14 in",
    ...LEGAL_14,
    marginIn: { top: 1, right: 1, bottom: 1.8, left: 1 },
    body: "times-new-roman",
    heading: "times-new-roman",
    bodyPt: 10.5,
    provenance:
      "Service Contract Form.docx — pgSz 12240 × 20160 twips, pgMar 1440/1440/2592/1440, " +
      "runs 10.5 pt. Latin face: the file's runs set only eastAsia/cs = Times New Roman, so " +
      "it renders in the theme minor face Calibri; the sheet prints Times New Roman, the " +
      "face those runs name and the face the 2026 forms set explicitly (see the module note).",
  },
  "purchase-application": {
    id: "purchase-application",
    label: "Philippine long bond / folio, 8.5 × 13 in",
    ...LONG_BOND_13,
    marginIn: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
    body: "times-new-roman",
    heading: "bookman-old-style",
    // The 2026 form packs its fields at 8 pt because it is one dense sheet; our digitized
    // document keeps the form's faces but carries the office's other papers' body size
    // (10 pt, the standalone purchase agreement's) — stated, not silently substituted.
    bodyPt: 10,
    provenance:
      "Purchase Application Form.docx (the 2026 combined application + agreement) — pgSz " +
      "12240 × 18720 twips, pgMar 720 all round, letterhead Bookman Old Style 10 pt, " +
      "fields Times New Roman 8 pt (this sheet sets its body at 10 pt, see the note here).",
  },
  "purchase-agreement-2025": {
    id: "purchase-agreement-2025",
    label: "US Legal / Philippine long bond, 8.5 × 14 in",
    ...LEGAL_14,
    marginIn: { top: 1, right: 1, bottom: 2, left: 1 },
    body: "arial",
    heading: "arial",
    bodyPt: 10,
    provenance:
      "Purchase Agreement.docx (the earlier standalone 2025 deed) — pgSz 12240 × 20160 " +
      "twips, pgMar 1440/1440/2880/1440, body Arial 10 pt (all 14,458 characters).",
  },
  "official-receipt": RECEIPT_SHEET,
  "provisional-receipt": { ...RECEIPT_SHEET, id: "provisional-receipt" },
  "membership-application": MEMBERSHIP_SHEET,
};

export const PAPER_PROFILE_IDS = Object.keys(PAPER_PROFILES) as PaperProfileId[];

/** Resolve a profile, or null for anything not in the frozen table (export routes). */
export function paperProfileById(id: unknown): PaperProfile | null {
  if (typeof id !== "string") return null;
  return (PAPER_PROFILES as Record<string, PaperProfile>)[id] ?? null;
}

/** The face a document half renders in: its body face, or its letterhead/heading face. */
export function profileTypeface(
  profile: PaperProfile,
  which: "body" | "heading" = "body",
): PaperTypeface {
  return PAPER_TYPEFACES[which === "heading" ? profile.heading : profile.body];
}

/** The face a block renders in: the profile's body face unless it is letterhead/heading. */
export function blockTypeface(profile: PaperProfile, block: Pick<PaperLine, "typeface">): PaperTypeface {
  return profileTypeface(profile, block.typeface ?? "body");
}

/** Page box in PDF points — what pdfkit draws on. */
export function profilePagePt(profile: PaperProfile): {
  widthPt: number;
  heightPt: number;
  marginPt: { top: number; right: number; bottom: number; left: number };
} {
  const m = profile.marginIn;
  return {
    widthPt: profile.widthIn * PT_PER_IN,
    heightPt: profile.heightIn * PT_PER_IN,
    marginPt: {
      top: m.top * PT_PER_IN,
      right: m.right * PT_PER_IN,
      bottom: m.bottom * PT_PER_IN,
      left: m.left * PT_PER_IN,
    },
  };
}

/** Page box in OOXML twips — what the .docx section properties carry. */
export function profilePageTwips(profile: PaperProfile): {
  widthTwips: number;
  heightTwips: number;
  marginTwips: { top: number; right: number; bottom: number; left: number };
} {
  const m = profile.marginIn;
  return {
    widthTwips: Math.round(profile.widthIn * TWIPS_PER_IN),
    heightTwips: Math.round(profile.heightIn * TWIPS_PER_IN),
    marginTwips: {
      top: Math.round(m.top * TWIPS_PER_IN),
      right: Math.round(m.right * TWIPS_PER_IN),
      bottom: Math.round(m.bottom * TWIPS_PER_IN),
      left: Math.round(m.left * TWIPS_PER_IN),
    },
  };
}

/** The printable content width in twips, for table column widths. */
export function profileContentTwips(profile: PaperProfile): number {
  const { widthTwips, marginTwips } = profilePageTwips(profile);
  return widthTwips - marginTwips.left - marginTwips.right;
}

/**
 * The screen sheet's inline custom properties. The sheet carries the profile's page
 * width, its margins as padding and both faces, so the on-screen proof is the printed
 * page's measure rather than an approximation of it.
 */
export function paperSheetVars(profile: PaperProfile): Record<string, string> {
  const m = profile.marginIn;
  return {
    "--paper-width": `${profile.widthIn}in`,
    "--paper-height": `${profile.heightIn}in`,
    "--paper-pad-top": `${m.top}in`,
    "--paper-pad-right": `${m.right}in`,
    "--paper-pad-bottom": `${m.bottom}in`,
    "--paper-pad-left": `${m.left}in`,
    "--paper-body-pt": `${profile.bodyPt}pt`,
    "--paper-font-body": PAPER_TYPEFACES[profile.body].css,
    "--paper-font-heading": PAPER_TYPEFACES[profile.heading].css,
  };
}

/**
 * The `@page` rule the print stylesheet needs, from the same profile. `PaperSheet`
 * injects it for the document it is showing: one paper document per screen, so the last
 * (only) rule wins and Print yields the profile's sheet — not a browser default.
 */
export function paperPrintPageCss(profile: PaperProfile): string {
  const m = profile.marginIn;
  return (
    `@page { size: ${profile.widthIn}in ${profile.heightIn}in; ` +
    `margin: ${m.top}in ${m.right}in ${m.bottom}in ${m.left}in; }`
  );
}
