# Vendored typefaces

The product's own typeface, settled by the captain's consistency pass
(2026-09-22): **Inter** is both the display and the interface face. It is
self-hosted (no CDN) and served from `/fonts/…` through `styles/fonts.css`.
Nothing here is generated at build time.

| Family | Role | Files | Licence |
|---|---|---|---|
| Inter | the product's one face — display headings, wordmark, memorial names, body, UI, tables, forms | `inter/inter-latin.woff2`, `inter-latin-ext.woff2`, `inter-latin-italic.woff2`, `inter-latin-ext-italic.woff2` | SIL OFL 1.1 — `inter/OFL.txt` |

- **Source:** Fontsource 5.3.0 package `@fontsource-variable/inter`; upstream
  project is <https://github.com/rsms/inter>. The `OFL.txt` is the upstream
  licence text (no Reserved Font Name is declared).
- **Subsets:** `latin` and `latin-ext` only, normal + italic, variable weight
  axis (100–900). `latin-ext` carries the peso sign (U+20B1) — **pixel-verified
  with fontkit** (`hasGlyphForCodePoint(0x20B1) === true`; the `latin` subset
  does not carry it) — do not drop it or price tables fall back to a system font.
- **OFL 1.1 permits** web embedding and redistribution with the app, provided
  the licence text ships with the files (it does) and the Reserved Font Names
  are not reused for modified versions. Do not rename or subset-modify these
  files without carrying the licence and the RFN rule.
- **The paper/legal print layer is NOT Inter.** The printed documents
  (`components/paper/*`) use the client's own faces — Times New Roman and
  Bookman Old Style, with the free `paper/texgyrebonum-*.otf` fallback — because
  they reproduce the client's archived `.docx` papers. See
  `lib/export/paper-profile.ts`, the ONE paper-type home.
