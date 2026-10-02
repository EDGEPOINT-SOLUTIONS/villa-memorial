# General Price List is now the literal PDF

**Task:** `villa-gpl-literal-pdf` · **Date:** 2026-10-02 · **Mode:** local-only branch `fm/villa-gpl-literal-pdf`
**Base HEAD at start:** `148c1f5` (fix(export): carry pdfkit into the production image)

The captain, 2026-10-02: *"General Price list should be a real page that's literal pdf not a
coded page."* The previous revision (`004.msg`) shipped `/general-price-list` as a coded HTML
rendition that also offered a PDF download. This revision makes the URL **be** the document:
a route handler answers `application/pdf` and Chrome's own viewer opens the price list. The
coded page component, its styles and its page wiring are gone.

---

## 1 · What changed

| Surface | Before | After |
|---|---|---|
| `/general-price-list` | `app/(public)/general-price-list/page.tsx` — a coded HTML rendition | `app/(public)/general-price-list/route.ts` — a route handler that builds and serves the PDF (`dynamic = "force-dynamic"`) |
| Content-Disposition | page's "Download the PDF" button → `/api/export/paper-pdf?document=…` (attachment) | the URL itself is the document: `inline; filename="villa-general-price-list.pdf"` (the browser viewer opens it) |
| The document | `buildGeneralPriceListPaper` + `paperToPdfBuffer` in the API route | one shared `renderGeneralPriceListPdf(pricing, contact)` in `lib/general-price-list.ts`, used by BOTH the public route and the export branch — they cannot serve different bytes |
| Styles | the `public: general price list block` (~148 lines) in `styles/components.css` | removed (the paper layer owns the printed document) |
| Sitemap | `/general-price-list` listed in `PUBLIC_PAGES` at `priority: 0.8` | removed — a sitemap advertises pages, and this is now a document; the smoke script reads the sitemap and only checks HTML |
| Footer + `/price-list` links | `href="/general-price-list"` | unchanged — the link now resolves to the PDF (the office's footer wording/columns stay exactly as pinned by `tests/unit/landing-view.test.tsx`) |
| Staff export | `POST /api/export/paper-pdf` | unchanged |
| Explicit download | `GET /api/export/paper-pdf?document=general-price-list` (attachment) | unchanged |

`/price-list` itself is untouched.

## 2 · Resilience

The route catches a build/store failure and answers an **honest 500** — a short `text/html`
explanation (`General Price List unavailable`) with `noindex` — while `console.error` logs
the real error tagged `[general-price-list]`. It never returns a bare framework error or a
broken viewer. The renderer is reached through the same `renderGeneralPriceListPdf` the
export branch uses, so the failure mode is identical.

## 3 · Guards

- `tests/unit/general-price-list-route.test.ts` (new): the URL is `200`, `content-type:
  application/pdf`, `content-disposition: inline; filename="villa-general-price-list.pdf"`,
  the body starts `%PDF-`; and a forced renderer throw yields the 500 HTML page plus the log.
- `tests/unit/seo.test.ts`: still walks `app/(public)` for `page.tsx` and asserts the sitemap
  table equals that set — removing `page.tsx` AND the `PUBLIC_PAGES` row together keeps it
  green (removing only one would fail).
- `tests/unit/landing-view.test.tsx`: pins the footer's exact columns and hrefs, so the
  footer link staying at `/general-price-list` is deliberate and verified.
- `tests/unit/paper-pdf-production.test.ts` / `paper-pdf-route-logging.test.ts`: unchanged;
  they still pin the explicit-download branch and the staff POST.

## 4 · Evidence

| Check | Result |
|---|---|
| `curl -D - http://localhost:4000/general-price-list` | `HTTP/1.1 200`, `content-type: application/pdf`, `content-disposition: inline; filename="villa-general-price-list.pdf"`, body starts `%PDF-1.3` |
| `file /tmp/gpl.pdf` | `PDF document, version 1.3, 4 page(s)`, 10,086 bytes |
| Browser (Chrome PDF viewer), 1440 | viewer opens the 4-page list, page 1/4 at 100% — `shots/desktop-1440-gpl-pdf-viewer.png` |
| Browser (Chrome PDF viewer), 390 | viewer opens the same document — `shots/phone-390-gpl-pdf-viewer.png` |
| `GET /sitemap.xml` | contains no `/general-price-list` (`grep -c` → 0) |
| `GET /api/export/paper-pdf?document=general-price-list` | still `200`, `content-type: application/pdf`, `content-disposition: attachment; filename="villa-general-price-list.pdf"` |
| `npm run smoke` (production build on :4000) | **All 53 advertised routes render.** |
| `npm run lint` | clean |
| `npm run typecheck` | clean (after clearing the stale `.next/types` for the removed page) |
| Affected tests (`general-price-list-route` · `seo` · `landing-view` · `paper-pdf-production` · `paper-pdf-route-logging`) | 5 files · 49 tests passing |
| Full suite | 304 files · 3,261 tests passing |
| `npm run build` | production build passes |

## 5 · Link / sitemap diff

```
lib/seo.ts                    -  { path: "/general-price-list", changeFrequency: "monthly", priority: 0.8 },
styles/components.css         -  the whole `public: general price list block` (148 lines)
app/(public)/general-price-list/page.tsx   -  deleted (129 lines)
app/(public)/general-price-list/route.ts   +  the PDF route handler
lib/general-price-list.ts     +  renderGeneralPriceListPdf(...) shared by both routes
```
No link was left pointing at a page that no longer exists: the footer and `/price-list` keep
their `/general-price-list` hrefs, which now serve the PDF.

## 6 · Supersession note

This record supersedes the HTML-page part of
[`villa-fine-tune-design/`](../villa-fine-tune-design/README.md) §"General Price List
(`/general-price-list`) — new page + PDF, revision 004". The document content, the shared
`buildGeneralPriceListPaper` and the explicit-download branch from that revision are retained;
only the coded screen is retired. The runtime-only pdfkit fix in
[`gpl-pdf-production-design/`](../gpl-pdf-production-design/README.md) still applies unchanged.
