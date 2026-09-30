/**
 * Family image store — the guarded, private home for a family's own pictures.
 *
 * WHY A SEPARATE STORE. The product's only image uploader (`lib/media-upload.ts`,
 * `POST /api/content/media`) is STAFF-scoped (`catalog:write`) and its read route
 * (`GET /api/media/[...path]`) is unauthenticated with a one-year public cache.
 * A family's account picture and the loved one's portrait are private data under
 * the Data Privacy Act, so they must never sit behind that route. This module is
 * the honest interim: a local, per-user store addressed only through a guarded,
 * `private, no-store` read (`app/api/family/images/[slot]`), written only by a
 * family-scoped route.
 *
 * THE OBJECT-STORE SEAM. The platform's `documents-api-v1` upload is Deferred and
 * no object store exists. When it freezes, only this module's backing store
 * changes (S3/CDN for the local directory) and the routes are untouched.
 *
 * WHAT IS STORED. Two slots per signed-in user, keyed by the token `sub`:
 *   avatar   — the ACCOUNT OWNER's own picture (the portal chrome)
 *   portrait — the LOVED ONE's picture (the Remembering panel; private to the
 *              family unless they separately publish it on a public memorial)
 *
 * The bytes live in one flat file per slot; a tiny JSON index records the file
 * name, its content type and when it was last changed (the version the read route
 * cache-busts on). Validation reuses the media store's own type and size rules, so
 * an upload accepted here is exactly what the editor accepts.
 *
 * Server-only: it touches `node:fs`. Client components call the routes.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { MEDIA_UPLOAD_MAX_BYTES, mediaExtensionFor } from "@/lib/media-upload";

export type FamilyImageSlot = "avatar" | "portrait";

export const FAMILY_IMAGE_SLOTS: readonly FamilyImageSlot[] = ["avatar", "portrait"];

/** The human name of each slot, for error copy. */
export const FAMILY_IMAGE_SLOT_LABEL: Record<FamilyImageSlot, string> = {
  avatar: "account picture",
  portrait: "portrait",
};

type IndexEntry = { name: string; mime: string; updated_at: string };
type Index = Record<string, IndexEntry>;

/** The directory the private pictures live in. `FAMILY_IMAGE_DIR` or `.data/family-images`. */
export function familyImageDir(): string {
  const configured = process.env.FAMILY_IMAGE_DIR?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", "family-images");
}

function indexFile(): string {
  return path.join(familyImageDir(), "index.json");
}

/** The one flat, traversal-proof key for a user + slot. */
function slotKey(userId: string, slot: FamilyImageSlot): string {
  return `${safeUserId(userId)}:${slot}`;
}

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function isFamilyImageSlot(value: string): value is FamilyImageSlot {
  return (FAMILY_IMAGE_SLOTS as readonly string[]).includes(value);
}

async function readIndex(): Promise<Index> {
  try {
    const raw = await fs.readFile(indexFile(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Index;
  } catch {
    return {};
  }
}

async function writeIndex(index: Index): Promise<void> {
  const dir = familyImageDir();
  await fs.mkdir(dir, { recursive: true });
  const temp = `${indexFile()}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(index, null, 2));
  await fs.rename(temp, indexFile());
}

/**
 * Store (or replace) one slot's picture. The bytes are the already-downscaled
 * image the browser prepared; the type and size rules are the media store's own.
 * Returns the new version (the `updated_at`), which the client appends to the read
 * URL so a fresh picture is not served from a stale cache.
 */
export async function writeFamilyImage(
  userId: string,
  slot: FamilyImageSlot,
  bytes: Buffer,
  mime: string,
): Promise<{ updated_at: string }> {
  const ext = mediaExtensionFor(mime);
  if (!ext) throw new Error("unsupported image type");
  if (bytes.byteLength === 0) throw new Error("empty upload");
  if (bytes.byteLength > MEDIA_UPLOAD_MAX_BYTES) throw new Error("image too large");

  const dir = familyImageDir();
  await fs.mkdir(dir, { recursive: true });
  const key = slotKey(userId, slot);
  const index = await readIndex();
  const previous = index[key];
  const name = `${safeUserId(userId)}-${slot}.${ext}`;

  const temp = path.join(dir, `${name}.${process.pid}.tmp`);
  await fs.writeFile(temp, bytes);
  await fs.rename(temp, path.join(dir, name));

  // A replaced picture with a different extension leaves no orphan behind.
  if (previous && previous.name !== name) {
    await fs.rm(path.join(dir, previous.name), { force: true }).catch(() => undefined);
  }

  const updated_at = new Date().toISOString();
  index[key] = { name, mime, updated_at };
  await writeIndex(index);
  return { updated_at };
}

/** The stored picture for a user + slot, or null when there is none. */
export async function readFamilyImage(
  userId: string,
  slot: FamilyImageSlot,
): Promise<{ path: string; mime: string; size: number; updated_at: string } | null> {
  const index = await readIndex();
  const entry = index[slotKey(userId, slot)];
  if (!entry) return null;
  const file = path.join(familyImageDir(), entry.name);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat || !stat.isFile()) return null;
  return { path: file, mime: entry.mime, size: stat.size, updated_at: entry.updated_at };
}

/** Remove one slot's picture (the family's own privacy control). */
export async function removeFamilyImage(
  userId: string,
  slot: FamilyImageSlot,
): Promise<boolean> {
  const index = await readIndex();
  const key = slotKey(userId, slot);
  const entry = index[key];
  if (!entry) return false;
  await fs.rm(path.join(familyImageDir(), entry.name), { force: true }).catch(() => undefined);
  delete index[key];
  await writeIndex(index);
  return true;
}

/** The guarded read URL for a slot, versioned so a changed picture refreshes. */
export function familyImageUrl(slot: FamilyImageSlot, version?: string | null): string {
  const base = `/api/family/images/${slot}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
