# Font evaluation — the HubSpot faces, and the legitimate alternatives

**Date:** 2026-09-29 · **Asked by:** the office (via firstmate, inbox 037) · **Status:**
recommendation only — **no HubSpot file was downloaded, bundled, linked or vendored**, and
nothing was switched on this note's own judgement.

The office saw these two lines in a HubSpot theme and asked whether we can use them:

```css
--cl-font-family: 'HubSpot Sans', sans-serif;
--cl-font-family-display: 'HubSpot Serif', serif;
```

## 1 · The honest answer on HubSpot's faces: no, not as things stand

`HubSpot Sans` and `HubSpot Serif` are HubSpot's own proprietary brand faces. They are not
open-licensed, not freely distributable, and HubSpot serves them for HubSpot-hosted pages.
We hold no licence for them. This repo self-hosts every typeface by rule (`styles/fonts.css`:
no CDN, `@font-face` against files under `public/fonts/<family>/`) precisely so the product
does not depend on a third party's servers or terms. So: **do not download, bundle, link or
vendor them, and do not point an `@font-face` at a HubSpot CDN.** That is the complete answer
to the question as asked — it is not a failure, it is the licence.

## 2 · What it would take to use them legitimately

If the office wants them, the path is the same as every other face in the product:

1. **The office supplies the files and the licence** — the two font files (webfont format)
   and their licence text, with a grant that covers self-hosting on this product.
2. **Vendor them like Inter/Manrope**: `public/fonts/<family>/` holding the weight/subset
   files actually used plus the licence beside them (the `OFL.txt` pattern in
   `public/fonts/inter/` and `public/fonts/manrope/`).
3. **Declare them in `styles/fonts.css`** with their real subset ranges.
4. **Repoint the tokens** — `--font-sans` (interface) and `--font-display` /
   `--font-serif` (display; `--font-serif` is the historical alias of `--font-display`,
   hit by ~60 rules) — **keeping the current faces as fallbacks in the same stacks**
   (`"<new sans>", "Manrope", "Inter", system-ui…`), so a font-load failure degrades to
   today's voice rather than a system default.
5. **Two checks this repo already got bitten by**: every vendored file must carry the peso
   sign (U+20B1) in its latin-ext subset, and the weights the stylesheets ask for
   (400/500/600/650/700/800) must exist in the shipped files — otherwise a price quietly
   changes face or a weight clamps.

## 3 · The closest legitimately available faces

HubSpot's pair is a neutral humanist/geometric sans and a modern, slightly high-contrast
serif. The closest **open-licensed** equivalents (all SIL OFL 1.1 or equivalent, all
self-hostable from Google Fonts / the projects' own repositories):

### Sans — closest open faces

| Face | Licence | Source | Why it is close |
|---|---|---|---|
| **Manrope** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Manrope) · [github.com/sharanda/manrope](https://github.com/sharanda/manrope) | Contemporary geometric-humanist sans with a tall x-height and open apertures; **already adopted by the office as the interface face** (inbox 038), variable 200–800 |
| **Inter** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Inter) · [github.com/rsms/inter](https://github.com/rsms/inter) | The previous interface face: a neutral UI sans in the same register; already vendored here as Manrope's fallback |
| **Source Sans 3** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Source+Sans+3) · [github.com/adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) | Humanist sans, slightly narrower and a touch more formal; a good fit if the office wants a less geometric sans |

### Display serif — closest open faces

| Face | Licence | Source | Why it is close |
|---|---|---|---|
| **Source Serif 4** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Source+Serif+4) · [github.com/adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif) | Modern text/display serif with moderate contrast and sturdy hairlines — the nearest open match to a product-brand serif like HubSpot Serif |
| **Lora** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Lora) · [github.com/cyrealtype/Lora-Cyrillic](https://github.com/cyrealtype/Lora-Cyrillic) | Warmer, brushy contrast; reads softer and more editorial than the current display face |
| **Fraunces** | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Fraunces) · [github.com/undercasetype/Fraunces](https://github.com/undercasetype/Fraunces) | A display-first "old-style" serif (variable, with an optical-size axis); the most characterful option, furthest from the current letterhead voice |

Nothing was switched. The current faces stay in place until the office decides.

## 4 · What a swap would touch, and the one thing the office should weigh

- **Tokens:** `--font-sans` for the sans half; `--font-display` **and its historical alias
  `--font-serif`** for the display half (both, or the ~60 rules written against `--font-serif`
  keep the old face).
- **The pinned typography test:** `tests/unit/typography-system.test.ts` asserts the display
  token, the sans stack and the shipped `@font-face`/file checks; a face swap updates that
  test in the same PR (never loosens it).
- **The licence/file layout:** a new `public/fonts/<family>/` folder with the files and their
  licence text beside them, and the `@font-face` rules in `styles/fonts.css` with the real
  subset ranges (peso included).
- **The display face is the CLIENT'S OWN letterhead serif today** (TeX Gyre Bonum, the free
  Bookman release the client's forms use, vendored for the printed papers). That is a
  deliberate choice: the website and the contract a family signs speak in one voice.
  Replacing the display face changes that pairing, and the office should know it before they
  choose — the sans swap (Manrope) does not touch it.
