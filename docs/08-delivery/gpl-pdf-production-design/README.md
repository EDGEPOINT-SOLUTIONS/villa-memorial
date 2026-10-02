# General Price List PDF in production — the runtime-only pdfkit fix

**Task:** `villa-gpl-pdf-prod` · **Date:** 2026-10-02 · **Mode:** local-only branch `fm/villa-gpl-pdf-prod`
**Base HEAD at start:** `729a86c` (the captain's 2026-10-02 review)

The captain asked for a dedicated General Price List page **and** the same document as a
PDF. Both shipped in `729a86c`: `/general-price-list` renders, and
`GET /api/export/paper-pdf?document=general-price-list` builds the sheet through the
paper layer. On the production host the page is fine but the PDF route answers
`500 {"error":"pdf rendering failed"}` — while the same export renders correctly in dev.
This record is the root cause, the fix, and what could and could not be verified locally.

---

## 1 · Root cause — pdfkit is a runtime-only package the standalone tracer cannot see

`lib/export/pdf.ts` imports `pdfkit` and registers the paper profiles' faces. Next's
server build **bundles pdfkit's JavaScript** into a shared server chunk
(`.next/server/chunks/1812.js`), so the source import never survives as a traced
`require("pdfkit")`. What remains at runtime is the one dependency the tracer cannot see:

- the chunk builds a `createRequire()` on the absolute path of pdfkit's Node entry at
  build time —
  `createRequire("file:///<build-root>/node_modules/pdfkit/js/pdfkit.node.mjs")` — and
- then resolves the standard fonts through pdfkit's own subpath import map,
  `req("#standard-fonts/TimesRoman")` (the `imports` field of `node_modules/pdfkit/package.json`).

Neither the package nor its `js/standard-fonts/*.cjs` files appear in the route's
`.nft.json`, so `.next/standalone/node_modules` never gets pdfkit. In the Docker image the
build root is `/app`, so the running server asks for `/app/node_modules/pdfkit/...` — which
the `run` stage never copies — and the first render throws:

```
Error: Cannot find module '#standard-fonts/Helvetica'
```

In dev (and in the standalone bundle run straight from this checkout) the baked path still
points at the real `node_modules`, so the export succeeds — which is why the 500 was
production-only.

`docx` needs no copy: `lib/export/docx.ts` is loaded only by the browser export path
(`components/paper/paper-export-actions.tsx`, a dynamic `import`), and it is fully bundled.
Both server PDF routes (`/api/export/paper-pdf` and `/api/family/papers/receipt/*`) use the
same `lib/export/pdf.ts`, so the one package fixes both.

## 2 · Fix

**`Dockerfile` — the `run` stage carries pdfkit, node-owned, and asserts it resolves.**

```dockerfile
COPY --from=deps --chown=node:node /app/node_modules/pdfkit ./node_modules/pdfkit
RUN node -e 'const { createRequire } = require("module"); const path = require("path");
  const req = createRequire(path.join(process.cwd(), "node_modules/pdfkit/js/pdfkit.node.mjs"));
  for (const face of [...14 standard fonts...]) req("#standard-fonts/" + face); ...'
```

The `RUN` is the image-build guard: if the `COPY` is dropped or pdfkit's package layout
moves, the build fails instead of shipping a PDF route that 500s. `--chown=node:node`
matches every other run-stage copy (the server runs as `node`).

**`app/api/export/paper-pdf/route.ts` — the catch is diagnosable.** Both the public GET and
the staff POST now `console.error` the real error (tagged `[paper-pdf]`) while the
user-facing body stays the exact same `{"error":"pdf rendering failed"}`.

**`tests/unit/paper-pdf-production.test.ts` — the guard, without Docker.** It parses the
Dockerfile `run` stage and fails if the node-owned pdfkit `COPY` or the `#standard-fonts`
assertion is missing; it also resolves every standard-font subpath through `createRequire`
and checks the target `.cjs` files exist, so a pdfkit bump that relocates them fails here.
The same file renders the real GET route in Node and asserts a valid `%PDF-` body.

**`tests/unit/paper-pdf-route-logging.test.ts`** forces the renderer to throw and pins both
halves: the visitor still gets the plain 500 message, the server log carries the real error,
and a successful render logs nothing.

## 3 · Evidence

| Check | Result |
|---|---|
| Fresh `npm run build`, standalone `.nft.json` for the route | no `pdfkit` entry; `.next/standalone/.../node_modules/pdfkit` absent |
| Baked runtime call in the built chunk | `createRequire("file:///<root>/node_modules/pdfkit/js/pdfkit.node.mjs")` |
| Standalone server with pdfkit temporarily moved aside (true end-to-end repro) | `HTTP/1.1 500` · `{"error":"pdf rendering failed"}` · log `[paper-pdf] general price list render failed: Error: Cannot find module '#standard-fonts/Helvetica'` |
| `createRequire` simulation, no package | `MODULE_NOT_FOUND - Cannot find module '#standard-fonts/TimesRoman'` |
| `createRequire` simulation, package copied | resolves `Times-Roman` |
| Guard test with the `COPY` line removed | fails: *"the run stage must COPY node_modules/pdfkit — the standalone tracer never sees it"* (restored after) |
| Dev export re-run (`npm run dev`, `curl`) | `200 OK`, `content-type: application/pdf`, `4 page(s)`, `%PDF-1.3` |
| `npm run lint` / `npm run typecheck` | clean |
| Affected tests (`paper-profile` · `purchase-export` · `service-export` · `family-paper-pdf-route` · the two new files) | 6 files · 34 tests passing |
| Full suite | 303 files · 3,259 tests passing |
| `npm run build` | production build passes |

## 4 · What could not be verified here — the honest limit

**Docker cannot run in this WSL distro** (no daemon), so the image build itself — including
the new `RUN` guard — is **not** exercised locally. The final end-to-end proof is the
staging deploy that firstmate runs: build the image, start it, and call
`GET /api/export/paper-pdf?document=general-price-list` for a real PDF. Everything short of
that is covered above: the guard test fails without the `COPY`, the package/files it copies
are the exact ones the bundled renderer resolves, and the same code path renders a valid
4-page PDF in Node.

## 5 · Note kept with this change

`/general-price-list` was missing from `notes/demo-web-route-coverage.md` even though it is
in the sitemap; the row is added here (the rule that a sitemap route always has a row is how
the previous production-only 500 — `/price-list` — went unopened).
