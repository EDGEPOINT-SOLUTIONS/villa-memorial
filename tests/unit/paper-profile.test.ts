import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { emptyDraftForCase } from "@/lib/contracts/service-contract-capture";
import { buildServicePaper } from "@/lib/contracts/service-paper";
import { termsByVersion } from "@/lib/contracts/villa-terms";
import { buildOfficialReceiptPaper } from "@/lib/contracts/official-receipt";
import { buildPurchasePaper, purchasePaperFromForm } from "@/lib/contracts/purchase-paper";
import { paperToDocxBuffer } from "@/lib/export/docx";
import { paperToPdfBuffer } from "@/lib/export/pdf";
import {
  PAPER_PROFILES,
  PAPER_PROFILE_IDS,
  PAPER_TYPEFACES,
  paperPrintPageCss,
  paperProfileById,
  paperSheetVars,
  profilePagePt,
  profilePageTwips,
} from "@/lib/export/paper-profile";
import { line } from "@/lib/export/types";

/**
 * The paper layer — pinned to the client's OWN files.
 *
 * Everything the app prints is the office's paper, so this file reads the staged client
 * documents (`docs/07-client-villa/paper-forms/*.docx`, byte-identical copies of what
 * Villa signs) and holds our profiles against them:
 *   - page size and margins are the client's `w:pgSz` / `w:pgMar`, per document;
 *   - the faces are the ones the client's runs actually name (and the one finding that is
 *     not a face they named — the 2025 service contract's Latin text, see below);
 *   - the .docx, the .pdf and the on-screen sheet all carry the same profile.
 *
 * If the client replaces a paper, the staged copy changes and this test fails naming the
 * drifted value — the same rule as every other fixture pin in the repo.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const STAGED = "docs/07-client-villa/paper-forms";

/* ------------------------- reading the client's files ------------------------ */

async function readDocx(name: string) {
  const zip = await JSZip.loadAsync(readFileSync(path.join(ROOT, STAGED, name)));
  const part = async (p: string) => {
    const file = zip.file(p);
    return file ? file.async("string") : "";
  };
  return {
    document: await part("word/document.xml"),
    styles: await part("word/styles.xml"),
    theme: await part("word/theme/theme1.xml"),
  };
}

function attr(source: string, name: string): number | null {
  const match = new RegExp(`w:${name}="(-?\\d+)"`).exec(source);
  return match ? Number(match[1]) : null;
}

/** The first `w:sectPr` — the page the client's document is set on. */
function pageSetup(documentXml: string) {
  const sect = /<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/.exec(documentXml)?.[0] ?? "";
  const size = /<w:pgSz([^/]*)\/>/.exec(sect)?.[1] ?? "";
  const margins = /<w:pgMar([^/]*)\/>/.exec(sect)?.[1] ?? "";
  return {
    width: attr(size, "w"),
    height: attr(size, "h"),
    top: attr(margins, "top"),
    right: attr(margins, "right"),
    bottom: attr(margins, "bottom"),
    left: attr(margins, "left"),
  };
}

/** Runs and the Latin (`w:ascii`) face each one names, in document order. */
function runsWithAsciiFont(documentXml: string): Array<{ text: string; ascii: string | null }> {
  const out: Array<{ text: string; ascii: string | null }> = [];
  for (const match of documentXml.matchAll(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g)) {
    const run = match[0];
    const text = [...run.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join("");
    if (text.trim() === "") continue;
    const fonts = /<w:rFonts([^/]*)\/>/.exec(run)?.[1] ?? "";
    const ascii = /w:ascii="([^"]+)"/.exec(fonts)?.[1] ?? null;
    out.push({ text, ascii });
  }
  return out;
}

/** Characters carried by each named Latin face — the run-level truth, by weight. */
function asciiFaceWeight(documentXml: string): Record<string, number> {
  const weight: Record<string, number> = {};
  for (const run of runsWithAsciiFont(documentXml)) {
    const key = run.ascii ?? "(theme minor)";
    weight[key] = (weight[key] ?? 0) + run.text.length;
  }
  return weight;
}

const FORM_VALUES = {
  application_date: "2026-03-14",
  last_name: "Dela Cruz",
  first_name: "Maria",
  middle_name: "Santos",
  date_of_birth: "1980-05-02",
  civil_status: "married",
  gender: "female",
  religion: "Roman Catholic",
  citizenship: "",
  contact_number: "0917-555-0142",
  email: "maria.delacruz@example.ph",
  tin: "123-456-789-000",
  gsis_sss_number: "34-5678901-2",
  alternative_contact_number: "",
  facebook_account: "maria.delacruz",
  address: "123 Rizal St., Isabela City, Basilan",
  occupation: "Teacher",
  employer: "Isabela City Central School",
  employer_address: "Sunrise, Isabela City",
  employer_telephone: "0917-000-1111",
  beneficiaries: [{ name: "Juan Dela Cruz", age: "14", relationship: "Son" }],
  classification: "Lawn Lot Standard",
  basic_price_cents: "32000",
  total_contract_price_cents: "33000",
  mcf_cents: "1000",
  vat_cents: "",
  mode_of_payment: "monthly",
  amortization_value: "60",
  amortization_unit: "months",
  interment_funeral_bundle_inclusion: "included",
  others_insurance: "",
  dpa_consent: true,
  sales_agent_name: "Pedro Sales",
} as never;

const LOT = { lot_number: "B-12", section: "Section 2", block: "Block B", area_sqm: 12.5 };

/* --------------------------- client evidence pins --------------------------- */

describe("paper profiles are the client's own page setup", () => {
  it("service contract: the 2025 form's 8.5 × 14 legal sheet and its margins", async () => {
    const { document } = await readDocx("Service Contract Form.docx");
    const page = pageSetup(document);
    const profile = PAPER_PROFILES["service-contract"];
    expect({ width: page.width, height: page.height }).toEqual({ width: 12240, height: 20160 });
    expect(profilePageTwips(profile)).toMatchObject({
      widthTwips: page.width,
      heightTwips: page.height,
      marginTwips: { top: page.top, right: page.right, bottom: page.bottom, left: page.left },
    });
  });

  it("purchase application: the 2026 combined form's 8.5 × 13 folio at 0.5 in margins", async () => {
    const { document } = await readDocx("Purchase Application Form.docx");
    const page = pageSetup(document);
    expect({ width: page.width, height: page.height }).toEqual({ width: 12240, height: 18720 });
    expect(pageSetup(document).top).toBe(720);
    expect(profilePageTwips(PAPER_PROFILES["purchase-application"])).toMatchObject({
      widthTwips: page.width,
      heightTwips: page.height,
      marginTwips: { top: page.top, right: page.right, bottom: page.bottom, left: page.left },
    });
  });

  it("2025 purchase agreement: the standalone deed's 8.5 × 14 legal sheet, 1 in sides / 2 in foot", async () => {
    const { document } = await readDocx("Purchase Agreement.docx");
    const page = pageSetup(document);
    expect({ width: page.width, height: page.height }).toEqual({ width: 12240, height: 20160 });
    expect(profilePageTwips(PAPER_PROFILES["purchase-agreement-2025"])).toMatchObject({
      widthTwips: page.width,
      heightTwips: page.height,
      marginTwips: { top: page.top, right: page.right, bottom: page.bottom, left: page.left },
    });
  });

  it("receipts and the membership folio state their own provenance (no archived sheet)", () => {
    for (const id of ["official-receipt", "provisional-receipt", "membership-application"] as const) {
      expect(PAPER_PROFILES[id].provenance).toMatch(/no .*(paper|receipt|membership).*(archived|is archived)/i);
    }
    // The two receipt copies are the same sheet; only their id differs.
    const profileOf = (id: "official-receipt" | "provisional-receipt") => {
      const rest: Partial<(typeof PAPER_PROFILES)["official-receipt"]> = {
        ...PAPER_PROFILES[id],
      };
      delete rest.id;
      return rest;
    };
    expect(profileOf("provisional-receipt")).toEqual(profileOf("official-receipt"));
  });
});

describe("paper faces are the client's own type", () => {
  it("the 2025 purchase agreement is Arial throughout; the profile says so", async () => {
    const { document } = await readDocx("Purchase Agreement.docx");
    const weight = asciiFaceWeight(document);
    const total = Object.values(weight).reduce((sum, n) => sum + n, 0);
    expect(weight.Arial / total).toBeGreaterThan(0.95);
    expect(PAPER_PROFILES["purchase-agreement-2025"].body).toBe("arial");
    expect(PAPER_PROFILES["purchase-agreement-2025"].heading).toBe("arial");
  });

  it("the 2026 combined form is Times New Roman body + Bookman Old Style letterhead", async () => {
    const { document } = await readDocx("Purchase Application Form.docx");
    const weight = asciiFaceWeight(document);
    expect(weight["Bookman Old Style"]).toBeGreaterThan(1_000);
    expect(weight["Times New Roman"]).toBeGreaterThan(weight["Bookman Old Style"]);
    expect(Object.keys(weight)).toContain("Bookman Old Style");
    const profile = PAPER_PROFILES["purchase-application"];
    expect(profile.body).toBe("times-new-roman");
    expect(profile.heading).toBe("bookman-old-style");

    // The letterhead BLOCKS carry that heading face, not just the profile.
    const { blocks } = buildPurchasePaper(purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14"));
    const letterhead = blocks.filter((b) => b.kind === "line" && b.typeface === "heading");
    expect(letterhead.length).toBeGreaterThanOrEqual(5);
    expect(letterhead[0]).toMatchObject({
      text: "SANCTUARIO DE MERCEDES Y GLORIA",
      typeface: "heading",
    });
  });

  it("records the 2025 service contract's Latin-face finding (theme minor Calibri, Times named for eastAsia/cs)", async () => {
    const { document, styles, theme } = await readDocx("Service Contract Form.docx");
    const runs = runsWithAsciiFont(document);
    expect(runs.length).toBeGreaterThan(100);
    // No run names a Latin face; every run maps eastAsia/cs to Times New Roman.
    expect(runs.every((r) => r.ascii === null)).toBe(true);
    expect(document.match(/w:eastAsia="Times New Roman"/g)?.length).toBeGreaterThan(100);
    // …so the Latin text takes the document theme's minor face, Calibri.
    expect(styles).toContain('w:asciiTheme="minorHAnsi"');
    expect(theme).toMatch(/<a:minorFont>[\s\S]*?<a:latin typeface="Calibri"/);
    // The sheet prints Times New Roman — the face those runs name and the face the 2026
    // forms set explicitly; the module header carries the reasoning and this pin makes
    // changing it a conscious act.
    expect(PAPER_PROFILES["service-contract"].body).toBe("times-new-roman");
  });
});

describe("the three renderers carry the same profile", () => {
  const receipt = () =>
    buildOfficialReceiptPaper(
      { number: "OR-2026-00412", received_on: "2026-09-12", amount: "₱12,000.00" },
      "office",
    );

  it("screen: the sheet carries the profile's width, margins, faces and print page box", () => {
    const paper = receipt();
    const html = renderToStaticMarkup(
      createElement(PaperSheet, { blocks: paper.blocks, profile: paper.profile }),
    );
    expect(html).toContain('data-paper-profile="official-receipt"');
    expect(html).toContain("--paper-width:8.5in");
    expect(html).toContain("--paper-pad-bottom:1in");
    expect(html).toContain("--paper-body-pt:10.5pt");
    expect(html).toContain(paperPrintPageCss(paper.profile).replace(/"/g, "&quot;"));
    expect(paperPrintPageCss(paper.profile)).toBe(
      "@page { size: 8.5in 14in; margin: 1in 1in 1in 1in; }",
    );
  });

  it("screen: a letterhead line renders in the profile's heading face", () => {
    const html = renderToStaticMarkup(
      createElement(PaperSheet, {
        blocks: [line("SANCTUARIO DE MERCEDES Y GLORIA", { typeface: "heading", bold: true })],
        profile: PAPER_PROFILES["purchase-application"],
      }),
    );
    expect(html).toContain("paper-line--head");
    expect(html).toContain("--paper-font-heading");
    expect(html).toContain("Bookman Old Style");
  });

  it("Word: the .docx section is the profile's page box and faces", async () => {
    const paper = receipt();
    const zip = await JSZip.loadAsync(await paperToDocxBuffer(paper.blocks, paper.profile));
    const documentXml = await zip.file("word/document.xml")!.async("string");
    expect(documentXml).toMatch(/<w:pgSz w:w="12240" w:h="20160"[^/]*\/>/);
    expect(documentXml).toMatch(
      /<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/,
    );

    const purchase = buildPurchasePaper(purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14"));
    const purchaseZip = await JSZip.loadAsync(
      await paperToDocxBuffer(purchase.blocks, purchase.profile),
    );
    const purchaseXml = await purchaseZip.file("word/document.xml")!.async("string");
    expect(purchaseXml).toMatch(/<w:pgSz w:w="12240" w:h="18720"[^/]*\/>/);
    // The letterhead runs name the client's heading face.
    expect(purchaseXml).toContain('w:ascii="Bookman Old Style"');
    const purchaseStyles = await purchaseZip.file("word/styles.xml")!.async("string");
    expect(purchaseStyles).toContain("Times New Roman");
  });

  it("PDF: the page box is the profile's, and the client faces are the ones embedded", async () => {
    const paper = receipt();
    const receiptPdf = (await paperToPdfBuffer(paper.blocks, paper.profile)).toString("latin1");
    expect(receiptPdf).toContain(`MediaBox [0 0 ${profilePagePt(paper.profile).widthPt} ${profilePagePt(paper.profile).heightPt}]`);
    expect(receiptPdf).toContain("/BaseFont /Times-Roman");

    const purchase = buildPurchasePaper(purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14"));
    const purchasePdf = (await paperToPdfBuffer(purchase.blocks, purchase.profile)).toString("latin1");
    expect(purchasePdf).toContain("MediaBox [0 0 612 936]");
    // Bookman Old Style has no base-14 PDF face: the profile's vendored free release is embedded.
    expect(purchasePdf).toContain("TeXGyreBonum-Regular");
    expect(purchasePdf).toContain("/FontFile3");
  });
});

describe("the paper layer stays declared in one place", () => {
  it("resolves only profiles in the frozen table", () => {
    expect(paperProfileById("service-contract")?.id).toBe("service-contract");
    expect(paperProfileById("letter")).toBeNull();
    expect(paperProfileById(undefined)).toBeNull();
    expect(paperProfileById({ id: "service-contract" })).toBeNull();
    // The table is the frozen vocabulary: every id resolves to its own profile.
    for (const id of PAPER_PROFILE_IDS) {
      expect(paperProfileById(id)?.id).toBe(id);
    }
  });

  it("every --paper-* variable in the stylesheet is one the profile declares", () => {
    const css = read("styles/components.css");
    const declared = new Set(
      Object.keys(paperSheetVars(PAPER_PROFILES["purchase-application"])),
    );
    const used = new Set(
      [...css.matchAll(/var\((--paper-[a-z-]+)/g)].map((m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) {
      expect(declared.has(name), `${name} is not declared by paperSheetVars`).toBe(true);
    }
    // The faces and the size are the ones that must never be hardcoded in the sheet CSS.
    for (const key of ["--paper-width", "--paper-body-pt", "--paper-font-body", "--paper-font-heading"]) {
      expect(used.has(key), `${key} must drive the sheet CSS`).toBe(true);
      expect(declared.has(key)).toBe(true);
    }
  });

  it("vendors the embedded heading face and its licence", () => {
    const face = PAPER_TYPEFACES["bookman-old-style"].pdf;
    expect(face.kind).toBe("embedded");
    if (face.kind !== "embedded") return;
    for (const file of [face.regularFile, face.boldFile, "public/fonts/paper/GUST-FONT-LICENSE.txt"]) {
      expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(read(file).length).toBeGreaterThan(0);
    }
    // Screen and print use the same vendored face when the office's Bookman is absent.
    const fonts = read("styles/fonts.css");
    expect(fonts).toContain('font-family: "TeX Gyre Bonum"');
    expect(fonts).toContain("/fonts/paper/texgyrebonum-regular.otf");
  });
});

/* ------------------------- the contract's paper grammar ---------------------- */

describe("the service contract reads like the office's paper", () => {
  const build = () => {
    const draft = emptyDraftForCase({ services: ["ROD"] });
    draft.services.rod.applied = true;
    const terms = termsByVersion("service-contract-2025") ?? null;
    return buildServicePaper({
      kase: { case_number: "FSC-2026-0042", deceased_name: "Jose R. Ramirez" },
      intake: {
        date_of_death: "2026-08-27",
        deceased_gender: "male",
        client_name: "Maria L. Ramirez",
        co_maker_name: "Ramon D. Ramirez",
        contract_date: "2026-08-28",
      } as never,
      order: null,
      draft,
      terms,
      signedOn: "2026-08-28",
    });
  };

  it("carries the form's own blocks — party block, WITNESSETH, numbered clauses, signature roles", () => {
    const { blocks, profile, terms } = build();
    expect(profile.id).toBe("service-contract");
    const lines = blocks.filter((b) => b.kind === "line").map((b) => (b.kind === "line" ? b.text : ""));
    expect(lines).toContain("KNOW ALL MEN BY THESE PRESENTS:");
    expect(lines).toContain("WITNESSETH:");
    expect(lines).toContain("IN WITNESS WHEREOF:");
    // Parties named over the revision's own roles, not a second hand-typed vocabulary.
    expect(lines).toContain(terms!.partyFirst);
    expect(lines).toContain(terms!.partyFirstRole.toUpperCase());
    expect(lines).toContain(terms!.partySecondRole.toUpperCase());
    expect(lines).toContain(terms?.partyThirdRole?.toUpperCase());
    // The clauses are numbered as the paper numbers them.
    expect(lines.some((l) => l.startsWith("1. "))).toBe(true);
    expect(lines.some((l) => l.startsWith(`${terms!.clauses.length}. `))).toBe(true);
    // Signature area labels come from the same roles.
    const signature = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => c.value) : []))
      .join(" | ");
    expect(signature).toContain(`${terms!.partySecondRole.toUpperCase()} (Sign over Printed Name)`);
    expect(signature).toContain("Maria L. Ramirez");
  });
});
