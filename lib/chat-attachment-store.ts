/**
 * Chat attachments — the content-addressed file store (server only).
 *
 * The plan's shape (`data/villa-admin-plan/report.md` §9.6): files live under
 * `.data/attachments/<sha256>`, the message row records only the hash + the file's own
 * name/type/size, and a re-upload of the same bytes costs nothing because the address is
 * the content. The allow-list and the size rules are the pure functions in
 * `lib/chat-attachments.ts`; this module is the disk half and is therefore server-only
 * (node:fs), imported by the BFF routes and the store — never by a client component.
 *
 * THE RECORDED SEED'S FILES. The board's sample thread shows the office's kept files
 * (`application-santos.pdf`, `id-front.jpg`, `schedule.xlsx`). Those three are committed
 * under `lib/fixtures/chat/files/` and `ensureSeedChatAttachments()` copies any that the
 * store does not yet hold, verifying each file's sha256 against its address. That is the
 * attachment half of "folded onto the recorded seed": the seed supplies the bytes the
 * first time, and a real upload replaces nothing (the address is the content).
 *
 * NO VIRUS SCAN, NO SIGNED URLS. Live mode needs object storage + scanning (D7 media) and
 * the plan says so; this build is the honest local store.
 */
import { createHash } from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import manifestFile from "@/lib/fixtures/chat/files/manifest.json";
import type { ChatAttachment } from "@/lib/chat";
import { ApiError } from "@/lib/api-client/api-error";

export type ChatAttachmentRef = ChatAttachment;

const SHA256_RE = /^[0-9a-f]{64}$/;

type SeedFile = { id: string; name: string; mime: string; file: string };

function seedFiles(): SeedFile[] {
  const rows = (manifestFile as { files?: unknown[] }).files ?? [];
  return rows
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      if (
        typeof r.id !== "string" ||
        !SHA256_RE.test(r.id) ||
        typeof r.name !== "string" ||
        typeof r.mime !== "string" ||
        typeof r.file !== "string"
      ) {
        throw new ApiError("malformed chat attachment manifest", 500);
      }
      return { id: r.id, name: r.name, mime: r.mime, file: r.file };
    });
}

/** The directory attachment bytes live in: `CHAT_ATTACHMENTS_DIR` or `.data/attachments`. */
export function chatAttachmentsDir(): string {
  const configured = process.env.CHAT_ATTACHMENTS_DIR?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", "attachments");
}

/** Is this a content address (a lowercase sha256 hex string)? */
export function isChatAttachmentId(id: string): boolean {
  return SHA256_RE.test(id);
}

/** The absolute path of one stored attachment, or null for anything but a flat sha256 name. */
export function chatAttachmentPath(id: string): string | null {
  if (!isChatAttachmentId(id)) return null;
  return path.join(chatAttachmentsDir(), id);
}

/** A Node read stream for the serving route to hand to the web Response. */
export function chatAttachmentStream(file: string): ReturnType<typeof createReadStream> {
  return createReadStream(file);
}

/** One stored attachment's size + path, or null when the bytes are not held here. */
export async function statChatAttachment(
  id: string,
): Promise<{ path: string; size: number } | null> {
  const file = chatAttachmentPath(id);
  if (!file) return null;
  const stat = await fs.stat(file).catch(() => null);
  if (!stat || !stat.isFile()) return null;
  return { path: file, size: stat.size };
}

/** Write bytes atomically under their content address; an existing address is left alone. */
async function writeAddressed(id: string, bytes: Buffer): Promise<void> {
  const file = chatAttachmentPath(id);
  if (!file) throw new ApiError("that file address is not a sha256", 422);
  const existing = await fs.stat(file).catch(() => null);
  if (existing?.isFile()) return; // content-addressed: a re-upload costs nothing
  const dir = chatAttachmentsDir();
  await fs.mkdir(dir, { recursive: true });
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await fs.writeFile(temp, bytes);
    await fs.rename(temp, file);
  } catch {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw new ApiError("the attachment could not be saved", 500);
  }
}

/**
 * Store one upload and return its metadata row. The type/size rules are the caller's
 * (they are pure and shared with the browser); this function only addresses and writes.
 */
export async function storeChatAttachment(args: {
  bytes: Buffer;
  name: string;
  mime: string;
}): Promise<ChatAttachmentRef> {
  const id = createHash("sha256").update(args.bytes).digest("hex");
  await writeAddressed(id, args.bytes);
  return { id, name: args.name, mime: args.mime, size: args.bytes.byteLength };
}

/**
 * Copy any recorded seed attachment the store does not yet hold. Idempotent: each file is
 * verified against its content address before it is written, and an address already on
 * disk is skipped. A missing committed file is a 500 naming the fixture — never a silent
 * empty attachment.
 */
export async function ensureSeedChatAttachments(): Promise<void> {
  for (const seed of seedFiles()) {
    const file = chatAttachmentPath(seed.id);
    if (!file) throw new ApiError("malformed chat attachment manifest", 500);
    if (await fs.stat(file).catch(() => null)) continue;
    const source = path.join(process.cwd(), "lib", "fixtures", "chat", "files", seed.file);
    const bytes = await fs.readFile(source).catch(() => null);
    if (!bytes) {
      throw new ApiError(`chat attachment fixture file ${seed.file} is missing`, 500);
    }
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== seed.id) {
      throw new ApiError(`chat attachment fixture file ${seed.file} does not match its address`, 500);
    }
    await writeAddressed(seed.id, bytes);
  }
}

/** The recorded seed's attachment rows, for the fixture-contract test and the provenance note. */
export function chatSeedAttachments(): SeedFile[] {
  return seedFiles().map((seed) => ({ ...seed }));
}
