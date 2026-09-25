# PDP media storage — P4 of the editable-PDP plan

**Phase:** P4 (storage hardening + object-store seam) · **Plan:**
`data/villa-pdp-cms-plan/report.md` §3.3 (the storage recommendation), §8.2 (the P4 row), §10 (the
P4 test). **Captain's Q3 answer:** server upload route to `MEDIA_UPLOAD_DIR`, object store later.
**P0–P3** (model + rules · entry fields + public render · variants + line document · Amazon layout)
are merged; this record covers P4 only.

## What changed

| Half | Where |
|---|---|
| Upload route | `app/api/content/media/route.ts` — `POST /api/content/media`, gated by the existing content-save scope `catalog:write` (`app/api/catalog/_guard.ts`), body = the already-downscaled image bytes |
| Store | `lib/media-upload.ts` (server-only) — writes under `MEDIA_UPLOAD_DIR` (default `.data/media-uploads`, gitignored, outside `public/` and `media-sources/`); atomic temp + rename |
| Read route | `app/api/media/[...path]/route.ts` — `GET /api/media/<id>.<ext>`, streams the file with `public, max-age=31536000, immutable` |
| URL helpers | `lib/media-url.ts` (pure, client-safe) — `storedMediaName`, `publicMediaUrl`, the optional `MEDIA_PUBLIC_BASE_URL` CDN prefix |
| Client | `lib/device-upload.ts` + `components/landing/device-uploader.tsx` — the browser downscales (max edge 1600, JPEG q0.86 / PNG alpha) then uploads the bytes; the picker receives the short path |
| Document | the entry store saves the `/api/media/<id>.<ext>` path; an embedded `data:` URL is refused by the validator (`lib/content-catalog.ts` `imageSrcError`) |
| Guard | `lib/media-upload.ts` `storedMediaReferenceIssues` / `documentMediaIssues`, run on the item/service save path (`lib/api-client/content-entries.ts`) — every stored reference must resolve to a real file |
| Tests | `tests/unit/pdp-media-upload.test.ts` (10 tests) |

The existing entry store is the **durable append-only journal P1 promised**
(`lib/api-client/content-entries.ts`, `CONTENT_ENTRIES_STORE_PATH` or `.data/content-entries.json`)
— no store gap remains.

## Route-behaviour evidence

Captured by driving the real route handlers (the same modules the server mounts) with a
`catalog:write` fixture session and a throwaway `MEDIA_UPLOAD_DIR`:

```
UPLOAD 201 {"url":"/api/media/7107fcfc-f9d5-4020-a5ee-c5cdbd5b0a2a.png"}
STORED ON DISK /tmp/…/media-uploads/7107fcfc-f9d5-4020-a5ee-c5cdbd5b0a2a.png 69 bytes
SERVE 200 image/png "public, max-age=31536000, immutable" 69 bytes byte-identical
STORED DOCUMENT [{"id":"g1","src":"/api/media/7107fcfc-f9d5-4020-a5ee-c5cdbd5b0a2a.png",
                  "alt":"Lumina","caption":null,"sample":false}]
```

- **Upload response** — 201 with the short path (a 1×1 PNG, 69 bytes).
- **Served bytes** — the read route streams the exact bytes with the long cache header.
- **Stored document** — the entry's gallery carries the `/api/media/…` path, no `data:` prefix.

Refusals proven by the same suite: anonymous → 401, read-only → 403 (nothing written); a
non-image content type → 415; an empty body → 422; a save whose stored reference has no bytes →
422 (`not in the media upload store`); a save with an embedded data URL → 422; a missing read
name and a traversal name → 404.

## The C12 seam (object store later)

The document field is the route path and does not change when the platform's object store lands.
`MEDIA_PUBLIC_BASE_URL` is the optional prefix for a deploy that fronts the files with a separate
media origin; the value is a serializable string handed from the server pages to the client
components (`ContentBlocks`, `PdpGallery`, `product-detail`), so SSR and hydration never disagree.
The recorded ask is **C12** (`data/villa-platform-contracts-plan/report.md`;
`docs/08-delivery/contracts/documents-api-v1.md` upload Deferred) and is carried in
`docs/08-delivery/open-items.md` §5. Production writes land under the container's `.data` volume
(`villa-web-data`), so they survive a redeploy.

## Honesty rules kept

The seven withheld client photographs (`HELD_CLIENT_PHOTOS`) are untouched — the picker offers
only the library the product already published. Samples keep their captions and the sheet's
illustration label; money is unchanged (no model, no billing edit); every UI touch is a token/kit
change (the picker look is unchanged apart from the upload wording).

## Env

- `MEDIA_UPLOAD_DIR` — server-only; default `.data/media-uploads`.
- `MEDIA_PUBLIC_BASE_URL` — server-only; unset = the app serves `/api/media/…` itself.

Both are documented in `.env.example` and `.env.production.example`.
