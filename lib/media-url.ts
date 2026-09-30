/**
 * Media URL helpers — the ONE place a stored media path becomes a servable URL
 * (P4 of data/villa-pdp-cms-plan/report.md §3.3).
 *
 * WHAT THE DOCUMENT STORES. A photo an editor attaches through `MediaPicker`
 * (device upload, catalogue photo, landing hero) is written by
 * `POST /api/content/media` under `MEDIA_UPLOAD_DIR` (lib/media-upload.ts,
 * server-only) and the document stores the short route path it returns,
 * `/api/media/<id>.<ext>` — never a base64 `data:` URL.
 *
 * THE CDN SEAM. `MEDIA_PUBLIC_BASE_URL` (optional, server-only — never
 * NEXT_PUBLIC_*) lets a deploy put a CDN in front of the stored files without
 * touching a saved document: the document keeps the `/api/media/…` path and the
 * render site prefixes it through `publicMediaUrl()`. A deploy that fronts the
 * whole app needs no prefix at all; a media-only CDN origin sets the base.
 *
 * This module is PURE and client-safe (no `node:` imports): the server hands the
 * base down to client components as a serializable string prop, so a
 * server-rendered URL and its client hydration can never disagree.
 */
export const MEDIA_ROUTE_PREFIX = "/api/media/";

/** The optional media CDN/origin prefix, trimmed of trailing slashes. */
export function mediaPublicBaseUrl(): string | null {
  const raw = process.env.MEDIA_PUBLIC_BASE_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/+$/, "") : null;
}

/** A stored `/api/media/…` src → the URL to render (CDN prefix when configured). */
export function publicMediaUrl(src: string, base: string | null): string {
  if (!base || !src.startsWith(MEDIA_ROUTE_PREFIX)) return src;
  return `${base}${src}`;
}

/**
 * The stored file name of a `/api/media/…` src, or null when the src is not a
 * stored-media reference (a library `/media/…` path, an https URL, a `data:` URL).
 * A valid name is a single flat segment — never a path that could escape the store.
 */
export function storedMediaName(src: string): string | null {
  if (!src.startsWith(MEDIA_ROUTE_PREFIX)) return null;
  const name = src.slice(MEDIA_ROUTE_PREFIX.length);
  if (!name || name.includes("/") || name.includes("?") || name.includes("#")) return null;
  return name;
}

/** True when the src is a reference into the server's media upload store. */
export function isStoredMediaPath(src: string): boolean {
  return storedMediaName(src) !== null;
}

/** Every image src an authored document carries (hero · galleries · gallery blocks). */
export function storedMediaSrcs(doc: {
  media?: { hero?: string | null; gallery?: Array<{ src: string }> };
  gallery?: Array<{ src: string }>;
  blocks?: Array<{ type: string; images?: Array<{ src: string }>; image?: { src: string } | null }>;
}): string[] {
  const srcs: string[] = [];
  if (doc.media?.hero) srcs.push(doc.media.hero);
  for (const image of doc.media?.gallery ?? []) srcs.push(image.src);
  for (const image of doc.gallery ?? []) srcs.push(image.src);
  for (const block of doc.blocks ?? []) {
    if (block.type === "gallery") for (const image of block.images ?? []) srcs.push(image.src);
    // A checklist's optional tier image and a notice's optional photograph are
    // authored media too, so the store must register them for cleanup/reference.
    if (block.type === "checklist" || block.type === "notice") {
      if (block.image?.src) srcs.push(block.image.src);
    }
  }
  return srcs;
}
