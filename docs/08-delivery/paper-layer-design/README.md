# Paper layer — the printed documents are the office's papers

Task: **the printed and exported documents should match the client's own papers**, verified
against their real files, with the change visible in the sheet on screen and in every export
(print, Word, PDF). Before this PR every paper — the service contract, the purchase
application/agreement, the receipts, the membership folio — printed as **Times on US
Letter**, one typeface and one page profile for all of them.

The one home for paper geometry and type is **`lib/export/paper-profile.ts`**. The screen
sheet (`components/paper/paper-sheet.tsx`), the print stylesheet, the Word renderer
(`lib/export/docx.ts`) and the PDF renderer (`lib/export/pdf.ts`) all read the same profile,
and each document builder returns the profile its paper uses. Evidence below is generated
by `/tmp` scripts that are reproducible: build each document through the shared kit, export
.docx/.pdf, print the sheet through headless Chrome, and read the page box and font names
back out of the artifacts.

## 1. What the client's files actually say

Measured from the staged client copies in `docs/07-client-villa/paper-forms/` (a `.docx` is
a zip; `word/document.xml` carries `w:pgSz`/`w:pgMar`, the runs carry `w:rFonts`, the theme
carries the defaults). Character counts are run-weighted per named Latin (`w:ascii`) face.

| Client file | Page (twips) | In inches | Margins top/right/bottom/left | Faces the runs name |
|---|---|---|---|---|
| `Service Contract Form.docx` (2025) | 12240 × 20160 | 8.5 × **14** Legal / PH long bond | 1440/1440/2592/1440 = 1 / 1 / **1.8** / 1 in | 10.5 pt runs. **No run names a Latin face** — every run sets only `w:eastAsia`/`w:cs` = Times New Roman, so the Latin text takes the theme's minor face, **Calibri** (see §4) |
| `Purchase Application Form.docx` (2026 combined) | 12240 × 18720 | 8.5 × **13** PH long bond / folio | 720/720/720/720 = **0.5 in all round** | **Times New Roman** 12,856 chars (8 pt body) + **Bookman Old Style** 1,797 chars (10 pt letterhead) |
| `Purchase Agreement.docx` (2025 standalone) | 12240 × 20160 | 8.5 × 14 Legal | 1440/1440/2880/1440 = 1 / 1 / **2** / 1 in | **Arial** 14,458 chars, all 10 pt |
| `SC Agreement 2026.docx` (Sales Agent Agreement) | 12240 × 20160 | 8.5 × 14 Legal | 1008–1152 each side, 2 in foot | Times New Roman (3,020 chars explicit) + theme Calibri (6,163 chars), 8–9 pt |
| `SANCTUARIOAMENDMENT FORM.docx` | 12240 × 15840 | 8.5 × 11 **Letter** | 720 all round | Bookman Old Style 9 pt |
| the client's 2026 price-list PDFs | — | — | — | Calibri (context: the office's working documents are Word defaults) |

**The sources disagree and the profile table does not flatten them.** Three of the client's
four office documents are 8.5 × 14 legal; the purchase application form is 8.5 × 13 folio;
the amendment form is Letter. So each document the app prints gets the sheet of the paper it
replaces, and the two documents with no archived paper say so in their provenance line.

## 2. The profiles this PR ships

| Profile | Used by | Sheet | Margins | Body | Heading | Body pt | Provenance |
|---|---|---|---|---|---|---|---|
| `service-contract` | Funeral Service Contract | 8.5 × 14 Legal | 1 / 1 / 1.8 / 1 in | Times New Roman | Times New Roman | 10.5 | `Service Contract Form.docx` |
| `purchase-application` | purchase application + agreement (2026) | 8.5 × 13 folio | 0.5 in all | Times New Roman | Bookman Old Style | 10 (see §4) | `Purchase Application Form.docx` |
| `purchase-agreement-2025` | lot purchase on the 2025 revision | 8.5 × 14 Legal | 1 / 1 / 2 / 1 in | Arial | Arial | 10 | `Purchase Agreement.docx` |
| `official-receipt` / `provisional-receipt` | both receipt copies | 8.5 × 14 Legal | 1 in all | Times New Roman | Times New Roman | 10.5 | **No receipt paper is archived** → the office's legal stationery, Times, symmetric margins |
| `membership-application` | plan membership folio | 8.5 × 13 folio | 0.5 in all | Times New Roman | Bookman Old Style | 10 | **No plan-membership paper is archived** → the nearest Villa form |

`tests/unit/paper-profile.test.ts` re-reads the client `.docx` files and fails if our page
box, margins or faces drift from them.

## 3. Before → after, measured in all three export paths

All numbers read out of the artifacts committed under `exports/`; screenshots in `shots/`.

**Official receipt** (the clerk's copy and the family's copy — one sheet)

| Path | Before | After |
|---|---|---|
| PDF (`paperToPdfBuffer`) | `MediaBox [0 0 612 792]` — US Letter; Times-Roman | `MediaBox [0 0 612 1008]` — **Legal**; Times-Roman |
| Word (`paperToDocxBuffer`) | `<w:pgSz w:w="12240" w:h="15840">`, `pgMar 900` (0.625 in) | `<w:pgSz w:w="12240" w:h="20160">`, `pgMar 1440` (1 in) |
| Print (Chrome `--print-to-pdf` of the sheet) | `612 × 792` (`@page Letter, 0.7 in`) | `612 × 1008` (`@page 8.5in 14in, 1in`) |

**Funeral Service Contract**

| Path | Before | After |
|---|---|---|
| PDF | `[0 0 612 792]`, Times-Roman | `[0 0 612 1008]`, Times-Roman |
| Word | Letter, `pgMar 900` | Legal, `pgMar top/right/left 1440, bottom 2592` — the client's own margins |
| Print | `612 × 792` | `612 × 1008` |

**Purchase Application & Agreement (2026 combined form)**

| Path | Before | After |
|---|---|---|
| PDF | `[0 0 612 792]`, Times-Roman only | `[0 0 612 936]` (8.5 × 13 folio); Times-Roman body + **embedded TeX Gyre Bonum** for the letterhead (`/FontFile3`) |
| Word | Letter, `pgMar 900`, no face set | Folio, `pgMar 720`; runs name **Bookman Old Style** (letterhead) + **Times New Roman** (body) |
| Print | `612 × 792`, Times | `612 × 936`, Bonum embedded |

The on-screen sheet carries the same profile (`data-paper-profile`, the page width, the
margins as padding, both faces) and injects the profile's own `@page` rule, so **what the
clerk reviews is the file they print**.

## 4. Decisions taken, and what was deliberately left alone

- **The 2025 service contract's Latin face, reported plainly.** Its runs name Times New
  Roman only for `w:eastAsia`/`w:cs`; the Latin text resolves to the theme's minor face
  **Calibri** (the client's price-list PDFs are Calibri too). The sheet prints **Times New
  Roman**: it is the face those runs name, the face the office's 2026 contract-family paper
  sets explicitly for Latin, and the only one of the two a PDF can carry without a second
  vendored clone — so screen, Word and PDF stay identical. If the office wants the file's
  Calibri, the change is one line (`PAPER_PROFILES["service-contract"].body`).
- **The 2026 form's 8 pt body is not copied.** That size belongs to the client's one-page
  dense form; our digitized document keeps the form's faces and letterhead but sets its body
  at 10 pt, the size the office's other papers use. Stated in the profile's provenance.
- **No archived receipt or membership paper.** Both profiles say so; neither invents a
  client face or a client rule. The receipt follows the office's legal stationery, the
  membership folio the nearest Villa form (the purchase application).
- **Contract wording is untouched.** `lib/contracts/villa-terms.ts` remains the only source
  of legal text; the service contract gained the *form's* structural grammar only — the
  party block whose roles are read from the revision, `WITNESSETH:`, `IN WITNESS WHEREOF:`
  and signature labels read from the revision's own role fields — so a family is not handed
  two different-looking contracts.
- **The contract's on-screen preview is now the artifact itself.** The hand-rolled
  `.paper-artifact` markup duplicated the builder and could drift from the exports; the
  screen renders the same blocks and profile the .docx/.pdf carry (`.paper-artifact*` CSS
  deleted).
- **One vendored face, declared once.** Bookman Old Style has no PDF base-14 equivalent, so
  TeX Gyre Bonum (GUST Font License, URW Bookman) is vendored under `public/fonts/paper/`
  with its licence, used as the PDF's embedded heading face and the screen fallback behind
  the real "Bookman Old Style". Times and Arial map to their metric-compatible base-14
  faces. This is the only substitution in the layer, declared in `paper-profile.ts`.
- **Money, wording, content: untouched.** No amount, no clause, no capture field changed.
- `--paper-*` custom properties are the sheet's only size/face source; the typography gate
  (`tests/unit/typography-system.test.ts`) now allows pt sizes only for the paper sheet and
  only from `--paper-body-pt`.

## 5. Reproduce

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx vitest run tests/unit/paper-profile.test.ts      # the client-file pins
```

The exports here were generated with a throwaway script that builds each document through
`lib/contracts/*` + `lib/export/{docx,pdf}.ts`, then prints the sheet HTML through
`google-chrome --headless=new --print-to-pdf`. The before set was generated from the same
script run against the base commit in a temporary worktree.
