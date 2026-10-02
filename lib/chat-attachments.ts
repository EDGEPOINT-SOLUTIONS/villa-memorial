/**
 * Chat attachments — the allow-list and the size rules, as pure functions.
 *
 * The captain asked for files in the chat ("docx, images, pdf, excel"); the admin plan
 * fixes the shape (`data/villa-admin-plan/report.md` §9.6): content-addressed bytes under
 * `.data/attachments/<sha256>`, an allow-list (docx · xlsx · pdf · png/jpeg/webp), a
 * per-file limit of 10 MB and a per-thread total. This module is the client-safe rule set
 * — the form can refuse a file before uploading and the store runs the SAME functions, so
 * a refusal reads the same everywhere.
 *
 * WHAT IT DOES NOT DO: touch the disk. `lib/chat-attachment-store.ts` is the server half
 * (server-only, node:fs); this file is imported by the composer in the browser.
 */

/** The most one file may be, in bytes (the plan proposes 10 MB). */
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** The most one thread's attachments may total, in bytes. */
export const CHAT_THREAD_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

/** Extension → the content types we accept for it. The extension is what the sender typed. */
export const CHAT_ATTACHMENT_TYPES: Readonly<Record<string, readonly string[]>> = {
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
};

/** The `accept` attribute for the composer's file input. */
export const CHAT_ATTACHMENT_ACCEPT = ".docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp";

/** The allowed list, in words (one grammar for every refusal). */
export const CHAT_ATTACHMENT_WORDS = "Word (docx), Excel (xlsx), PDF or an image (png, jpg, webp)";

/** The extension of a file name, lower-cased, or null when it has none. */
export function chatAttachmentExtension(name: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : null;
}

/** Is this content type one of the image types we preview inline? */
export function isImageChatMime(mime: string): boolean {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/webp";
}

/** A readable byte count ("1.2 MB", "24 KB"). */
export function formatChatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The content type to store for a named upload.
 *
 * The extension decides the family; when the browser sends a concrete type inside that
 * family we keep the browser's own type, and when it sends a generic
 * `application/octet-stream` (some phones do) the extension's canonical type is used.
 * Returns null when the extension is not on the allow-list.
 */
export function chatAttachmentMime(name: string, declared: string | null | undefined): string | null {
  const ext = chatAttachmentExtension(name);
  if (!ext) return null;
  const allowed = CHAT_ATTACHMENT_TYPES[ext];
  if (!allowed) return null;
  const declaredType = (declared ?? "").split(";")[0].trim().toLowerCase();
  if (declaredType && allowed.includes(declaredType)) return declaredType;
  if (!declaredType || declaredType === "application/octet-stream") return allowed[0];
  return null;
}

/**
 * One refusal message for a refused file, or null when the file is accepted. The message
 * names the file and what is wrong, so a phone user knows which pick to change.
 */
export function chatAttachmentRefusal(args: {
  name: string;
  mime: string | null;
  size: number;
}): string | null {
  if (!args.mime) {
    return `“${args.name}” is not a file we can take here. Send ${CHAT_ATTACHMENT_WORDS}.`;
  }
  if (args.size <= 0) {
    return `“${args.name}” is empty. Choose the file again.`;
  }
  if (args.size > CHAT_ATTACHMENT_MAX_BYTES) {
    return `“${args.name}” is ${formatChatBytes(args.size)} — the most one file can be is ${formatChatBytes(
      CHAT_ATTACHMENT_MAX_BYTES,
    )}.`;
  }
  return null;
}

/** The refusal when a new upload would push the thread over its total. */
export function chatThreadTotalIssue(totalBytes: number): string | null {
  if (totalBytes <= CHAT_THREAD_ATTACHMENT_MAX_BYTES) return null;
  return `This conversation already holds ${formatChatBytes(
    totalBytes,
  )} of files — the most a thread can hold is ${formatChatBytes(
    CHAT_THREAD_ATTACHMENT_MAX_BYTES,
  )}. Remove a file or start a new conversation.`;
}

/** The bytes every attachment on a thread already costs (the sum the total check reads). */
export function threadAttachmentBytes(
  messages: ReadonlyArray<{ attachments: ReadonlyArray<{ size: number }> }>,
): number {
  let total = 0;
  for (const message of messages) {
    for (const attachment of message.attachments) total += attachment.size;
  }
  return total;
}
