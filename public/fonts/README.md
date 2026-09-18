# Vendored typefaces

The product's own typefaces, chosen in the type-voice decision of 2026-09-18.
They are self-hosted (no CDN) and served from `/fonts/…` through
`styles/fonts.css`. Nothing here is generated at build time.

| Family | Role | Files | Licence |
|---|---|---|---|
| Alegreya | display serif — headings, wordmark, memorial names | `alegreya/alegreya-latin.woff2`, `alegreya-latin-ext.woff2`, `alegreya-latin-italic.woff2`, `alegreya-latin-ext-italic.woff2` | SIL OFL 1.1 — `alegreya/OFL.txt` |
| Source Sans 3 | interface sans — body, UI, tables, forms | `source-sans-3/source-sans-3-latin.woff2`, `source-sans-3-latin-ext.woff2`, `source-sans-3-latin-italic.woff2`, `source-sans-3-latin-ext-italic.woff2` | SIL OFL 1.1 — `source-sans-3/OFL.txt` |

- **Source:** Fontsource 5.3.0 packages `@fontsource-variable/alegreya` and
  `@fontsource-variable/source-sans-3`; upstream projects are
  <https://github.com/huertatipografica/Alegreya> and
  <https://github.com/adobe-fonts/source-sans>. The `OFL.txt` files are the
  upstream licence texts.
- **Subsets:** `latin` and `latin-ext` only, normal + italic, variable weight
  axis (Alegreya 400–900, Source Sans 3 200–900). `latin-ext` carries the peso
  sign (U+20B1) — do not drop it or price tables fall back to a system font.
- **OFL 1.1 permits** web embedding and redistribution with the app, provided
  the licence text ships with the files (it does) and the Reserved Font Names
  are not reused for modified versions. Do not rename or subset-modify these
  files without carrying the licence and the RFN rule.
