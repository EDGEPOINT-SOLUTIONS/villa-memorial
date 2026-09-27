# Phase 2 — page editing now survives a restart

> **The client's ask, verbatim:** *"how every pages can be edited, it should make sense not just for
> show … the admin should be the most crucial part in this, it's where we handle very customer that's
> why you should be careful here."*

Of everything I found while auditing the admin, this was the most serious, because it is the one that
silently destroys a staff member's work.

---

## 1 · What was wrong

**Two stores powered page editing, and they were the only two in the app that were not durable.**

| Store | What it holds | Was |
|---|---|---|
| `lib/api-client/landing.ts` | **Home**, the FAQ, the blog, the header/footer, the office contact block | `globalThis` only |
| `lib/api-client/content-pages.ts` | the **Park · Services · Plans · Coffins** page documents | `globalThis` only |
| the other 11 stores (catalog · pricing · billing · orders · chapel · membership · operations · provisional receipts · content entries · product lines · enquiries) | — | durable journals |

The evidence was structural, not a guess. `content-pages.ts:50-57` read
`contentGlobal.__imContentPages ??= SEED.map(...)` and the module contained **no file read and no file
write**; `landing.ts:739-742` was the same; `app/api/content/pages/route.ts` called only
`listPageDocuments` / `savePageDocument` — no `fs`.

**So a staff edit behaved like this:** it saved, the editor re-rendered with the change *in the same
process*, the page looked right — and then the edit was **gone on the next server restart**, and in a
multi-instance or serverless deploy it reached only the instance that happened to handle the save.

That is precisely "for show": the screen does everything a working editor does, and the work does not
survive. Both sibling content stores (`content-entries.ts`, `product-lines.ts`) had already been
upgraded to journals. These two were missed.

## 2 · The change

**One shared set of journal mechanics, and both stores put on it.**

- **`lib/api-client/journal.ts` (new)** — `journalPath` · `readJournalEvents` · `writeJournalEvents` ·
  `createJournalLock`. Eleven stores had each grown the *same* ~65 lines of file mechanics, each
  slightly differently worded; a twelfth and thirteenth copy was indefensible. The module holds the
  mechanics only: **no record shape, no validation, no id allocation**, and a lock **per store** so two
  unrelated stores never serialize against each other.
- **`landing.ts`** — `listLandingContent()` folds the journal from disk (empty journal ⇒ the recorded
  seed); `saveLandingContent()` validates exactly as before, then appends one `landing_saved` event
  under the store lock. `LANDING_STORE_PATH` or `.data/landing-content.json`.
- **`content-pages.ts`** — same shape, one `page_saved` event per save, folded by document key so a
  save **replaces** a page rather than accumulating copies. `CONTENT_PAGES_STORE_PATH` or
  `.data/content-pages.json`.
- **`tests/setup.ts`** — both env vars added to the redirect list, and the `globalThis` reset block it
  used to need is **gone**, because the two seams it reset no longer exist.
- **Docs corrected**: `app/(staff)/AGENTS.md` called `content-pages.ts` "an in-process globalThis
  store"; `content-catalogue-cleanup-design/README.md` said "(globalThis, fixture mode)". Both now say
  what is true.

A saved document is re-read through the **same tolerant reader the seed goes through**, so a
hand-edited journal cannot inject a block shape the page would then render.

## 3 · Evidence

### The restart, on a real server (`scripts/design-audit/phase2-restart-proof.mjs`)

```
=== SAVE (instance 1) ===
  headline before the edit : "Villa Memorial Park"
  POST /api/content/pages -> HTTP 200
  served back in the same process : "Restart proof 1790550019393"
  present in .data/content-pages.json : true

=== KILLING the server process ===
  stopping pid 15528
  port free: True
  .data/content-pages.json  1085 bytes   contains the stamp: True

=== VERIFY in the NEW process ===
  headline after the restart : "Restart proof 1790550019393"

PASS — a staff page edit SURVIVED a server restart.
```

The last line is the whole phase. The edit was written through the **real API** as a signed-in admin,
the server process was **killed**, a **fresh** one started, and the fresh process read the edit back.
Before this change the same edit lived on `globalThis` and would have reverted to
`"Villa Memorial Park"` here.

Note what the first block also proves: the save was visible **and on disk** in the same process, so the
`verify` result can be attributed to the restart rather than to a save that never happened.

### The gate

| Check | Result |
|---|---|
| `lint` / `typecheck` | clean |
| `npm test` | **231 files, 2,681 tests pass** (was 230 / 2,669 — +1 file, +12 tests) |
| `npm run build` / `smoke` | clean · **61 of 61 routes render** |
| Design audit, 208 routes × 2 viewports | **0 failed · 0 overflow · 0 sub-12px · 0 multiple/missing `h1` · 0 missing `alt`** · 18 contrast flags, all on gradient/photo surfaces |

### New tests — `tests/unit/content-stores-durable.test.ts` (12)

For both stores: the seed is what an untouched store reads; a save lands **on disk** in the documented
`{ version: 1, events: [...] }` envelope and is returned by a read that shares no module state with the
write; two saves fold to the second while keeping both events; the other documents are untouched when
one is saved; a page is **replaced**, not duplicated; a corrupt journal is a **500** rather than a
silent fall-back to the seed; and a journal whose event is the wrong kind is refused naming the store.
Plus the path resolver honouring its env var and defaulting under `.data/`.

### One test that had to change, and got better

`tests/unit/settings-page.test.tsx` simulated an edit by assigning
`globalThis.__imLandingContent = {…}` — the very seam this phase removed. It now calls the **real**
`saveLandingContent(...)`, the same function the editor's BFF route calls, so it proves a staff save
reaches the settings screen rather than merely that a global was assigned. That is a stronger test than
the one it replaced.

## 4 · Open

1. **The eleven older stores still carry their own copies** of these mechanics. They are correct and
   tested, and migrating them is a mechanical follow-up — but it is a real cleanup, because the
   duplication is where the `globalThis` mistake survived unnoticed in the first place. Recorded here
   rather than folded into a phase about page editing.
2. **`GET /api/content/pages` requires `catalog:write`**, not `catalog:read`, because the Pages &
   content screen is a write surface and its list gates the same way. It is consistent, but it means a
   read-only staff session cannot even load the documents. Left as-is — changing a scope gate is the
   captain's call, not a drive-by.
3. **Nothing here addresses media**: an uploaded image still lives under `.data/media-uploads`
   (`MEDIA_UPLOAD_DIR`), which is durable, but a deployment still needs that volume mounted.
   The platform object store remains C12 (Deferred).
