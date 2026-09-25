/**
 * Media upload store — the server half of the editor's photo seam (P4 of
 * data/villa-pdp-cms-plan/report.md §3.3).
 *
 * WHAT IT IS. `POST /api/content/media` (app/api/content/media/route.ts) accepts
 * the already-downscaled image bytes a browser prepared with lib/device-upload.ts
 * and writes them here, under `MEDIA_UPLOAD_DIR` (default `.data/media-uploads`,
 * deliberately OUTSIDE `public/` — baked at build time and possibly read-only in
 * production — and outside `media-sources/`, which holds the client's originals).
 * The route returns `{ url: "/api/media/<id>.<ext>" }`; `GET /api/media/[...path]`
 * streams the file back with long cache headers. The editor's document then stores
 * that short path — not a base64 blob — so an unlimited gallery never inflates the
 * document every read has to parse.
 *
 * THE OBJECT-STORE SEAM (C12). The platform's `documents-api-v1` names
 * `POST /api/v1/documents` upload as Deferred and no object store exists
 * (data/villa-platform-contracts-plan/report.md C12). When it freezes, only this
 * module's backing store changes — S3/CDN in place of the local directory — and
 * the document field is untouched: a no-op migration.
 *
 * Server-only: it touches `node:fs`. Client components never import it; they call
 * the route (lib/device-upload.ts) and render via the pure lib/media-url.ts.
 */
import { createReadStream, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { storedMediaName, storedMediaSrcs } from "@/lib/media-url";

/** A hard ceiling on one uploaded file. The browser already downscales; this
 * bounds a hand-crafted request (GIF/SVG pass through the downscaler untouched). */
export const MEDIA_UPLOAD_MAX_BYTES = 16 * 1024 * 1024;

/** The image types the editor's device uploader accepts, and their stored extension. */
export const MEDIA_UPLOAD_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const EXTENSION_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/** The directory uploaded files live in. `MEDIA_UPLOAD_DIR` or `.data/media-uploads`. */
export function mediaUploadDir(): string {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", "media-uploads");
}

/** The stored extension for a mime type, or null when the type is not accepted. */
export function mediaExtensionFor(mime: string): string | null {
  return MEDIA_UPLOAD_TYPES[mime.trim().toLowerCase()] ?? null;
}

/** The content type to serve for a stored file name, or null. */
export function mediaContentType(name: string): string | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return EXTENSION_TYPES[ext] ?? null;
}

/**
 * The absolute path of a stored media file, or null when the name is not a flat
 * file name (a path traversal attempt is rejected before it reaches the disk).
 */
export function mediaFilePath(name: string): string | null {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  return path.join(mediaUploadDir(), name);
}

/** Writes one uploaded image under the store and returns its route path. */
export async function storeUploadedMedia(
  bytes: Buffer,
  mime: string,
): Promise<{ name: string; url: string }> {
  const ext = mediaExtensionFor(mime);
  if (!ext) throw new Error("unsupported media type");
  const name = `${randomUUID()}.${ext}`;
  const dir = mediaUploadDir();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  // One writer per upload: a crash cannot leave a half-written file a document
  // might later reference. (A temp + rename keeps the published name atomic.)
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, bytes);
  await fs.rename(temp, file);
  return { name, url: `/api/media/${name}` };
}

/** One stored file's size + path for the streaming read route. */
export async function statStoredMedia(
  name: string,
): Promise<{ path: string; size: number } | null> {
  const file = mediaFilePath(name);
  if (!file) return null;
  const stat = await fs.stat(file).catch(() => null);
  if (!stat || !stat.isFile()) return null;
  return { path: file, size: stat.size };
}

/** A Node read stream for the route to hand to the web Response. */
export function storedMediaStream(file: string): ReturnType<typeof createReadStream> {
  return createReadStream(file);
}

/**
 * The referenced-bytes guard. Every stored media reference must be a path whose
 * bytes really exist under `MEDIA_UPLOAD_DIR`, and no `data:` URL may be stored.
 * Returns one message per offending src (empty = the document is clean); a
 * library `/media/…` path or an https URL is not a stored reference and is left
 * to its own rules.
 */
export async function storedMediaReferenceIssues(
  srcs: readonly string[],
  what = "This photograph",
): Promise<string[]> {
  const issues: string[] = [];
  for (const src of srcs) {
    if (/^data:/i.test(src)) {
      issues.push(
        `${what} is stored as an embedded data URL. Upload it again so it saves as a file and the document stays light.`,
      );
      continue;
    }
    const name = storedMediaName(src);
    if (!name) continue;
    const stat = await statStoredMedia(name);
    if (!stat) {
      issues.push(
        `${what} references “${src}”, which is not in the media upload store. Upload the file again.`,
      );
    }
  }
  return issues;
}

/** The referenced-bytes guard over every image an authored entry/document carries. */
export async function documentMediaIssues(
  doc: Parameters<typeof storedMediaSrcs>[0],
): Promise<string[]> {
  return storedMediaReferenceIssues(storedMediaSrcs(doc));
}
