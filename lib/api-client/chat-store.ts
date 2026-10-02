/**
 * Durable fixture-mode store for the chat threads — one append-only journal per
 * conversation, folded onto the recorded seed.
 *
 * WHY A FILE STORE. The captain asked for a chat the office keeps ("these chats are saved"),
 * and `data/villa-admin-plan/report.md` §9.6 fixes the shape: one append-only journal per
 * thread at `.data/chat/<thread>.json`, per-message state appended as events
 * (sending · sent · delivered · read · failed) and NEVER overwritten, attachments
 * content-addressed under `.data/attachments`. This is that store.
 *
 * THE REPO'S PATTERN, NOT A NEW ONE. Built on `lib/api-client/journal.ts` exactly like
 * `inquiry-store.ts` / `provisional-receipts-store.ts`: an atomic temp + fsync + rename
 * write, one in-process writer chain, and a missing file that is an empty journal. The
 * directory is `CHAT_STORE_DIR` when set (tests redirect it), else `.data/chat` under the
 * app's cwd (gitignored). Thread ids are filename-safe by construction
 * (`lib/chat.ts#isChatThreadId`), so the file name reverses to the id exactly.
 *
 * WHAT IS HERE VS PURE. The record shape, the fold and the state vocabulary live in
 * `lib/chat.ts` (pure, testable). The attachment allow-list and size rules live in
 * `lib/chat-attachments.ts` and the bytes on disk in `lib/chat-attachment-store.ts`. This
 * module owns only persistence, the id/timestamp and the per-thread total rule — the one
 * rule that needs the thread's current state.
 *
 * LIVE MODE. No messaging/communications contract is frozen (the plan's §9.6 says live
 * needs a messaging service + object storage). `lib/live-mode.ts` declares no chat switch,
 * so there is no flag that can route a real conversation into a local file.
 */
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-client/api-error";
import {
  createJournalLock,
  listJournalFiles,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import {
  CHAT_THREAD_ATTACHMENT_MAX_BYTES,
  chatAttachmentMime,
  chatAttachmentRefusal,
  formatChatBytes,
  threadAttachmentBytes,
} from "@/lib/chat-attachments";
import {
  ensureSeedChatAttachments,
  storeChatAttachment,
} from "@/lib/chat-attachment-store";
import {
  chatBodyIssue,
  chatThreadIdFor,
  foldChatEvents,
  foldChatThread,
  isChatThreadId,
  newThreadView,
  sortThreadsByActivity,
  type ChatAttachment,
  type ChatEvent,
  type ChatMessage,
  type ChatMessageState,
  type ChatSender,
  type ChatThreadKind,
  type ChatThreadSeed,
  type ChatThreadView,
  type ChatViewer,
} from "@/lib/chat";
import seedFile from "@/lib/fixtures/chat/threads.json";

/** The directory the per-thread journals live in. */
export function chatStoreDir(): string {
  const configured = process.env.CHAT_STORE_DIR?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", "chat");
}

/** The journal path for one thread. Throws for an id that is not filename-safe. */
export function chatThreadPath(threadId: string): string {
  if (!isChatThreadId(threadId)) {
    throw new ApiError(`malformed chat thread id: ${threadId}`, 500);
  }
  return path.join(chatStoreDir(), `${threadId}.json`);
}

/* ------------------------------------------------------------- tolerant readers --- */

function malformed(what: string): never {
  throw new ApiError(`malformed chat fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

function toAttachment(raw: unknown): ChatAttachment {
  if (typeof raw !== "object" || raw === null) malformed("attachment row");
  const r = raw as Record<string, unknown>;
  const size = Number(r.size);
  if (!Number.isInteger(size) || size < 0) malformed("attachment size");
  if (typeof r.id !== "string" || !/^[0-9a-f]{64}$/.test(r.id)) malformed("attachment id");
  return {
    id: r.id,
    name: requiredString(r.name, "attachment name"),
    mime: requiredString(r.mime, "attachment mime"),
    size,
  };
}

function isMessageState(value: unknown): value is ChatMessageState {
  return (
    value === "sending" ||
    value === "sent" ||
    value === "delivered" ||
    value === "read" ||
    value === "failed"
  );
}

function isSender(value: unknown): value is ChatSender {
  return value === "office" || value === "participant";
}

function isThreadKind(value: unknown): value is ChatThreadKind {
  return value === "family" || value === "agent";
}

function toMessage(raw: unknown): ChatMessage {
  if (typeof raw !== "object" || raw === null) malformed("message row");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "message id"),
    author: isSender(r.author) ? r.author : malformed("message author"),
    author_name: requiredString(r.author_name, "message author name"),
    body: typeof r.body === "string" ? r.body : "",
    at: requiredString(r.at, "message time"),
    attachments: (Array.isArray(r.attachments) ? r.attachments : []).map(toAttachment),
  };
}

function toSeedThread(raw: unknown): ChatThreadSeed {
  if (typeof raw !== "object" || raw === null) malformed("thread row");
  const r = raw as Record<string, unknown>;
  const id = requiredString(r.id, "thread id");
  if (!isChatThreadId(id)) malformed(`thread id ${id}`);
  if (!isThreadKind(r.kind)) malformed("thread kind");
  const messages = (Array.isArray(r.messages) ? r.messages : []).map((row) => {
    const message = toMessage(row);
    const state = (row as Record<string, unknown>).state;
    if (!isMessageState(state)) malformed(`message state for ${message.id}`);
    return { ...message, state };
  });
  return {
    id,
    kind: r.kind,
    participant_id: requiredString(r.participant_id, "thread participant id"),
    participant_name: requiredString(r.participant_name, "thread participant name"),
    subject: requiredString(r.subject, "thread subject"),
    created_at: requiredString(r.created_at, "thread created_at"),
    messages,
  };
}

const SEED: ChatThreadSeed[] = ((seedFile as { threads?: unknown[] }).threads ?? []).map(
  toSeedThread,
);

export function seedChatThreads(): ChatThreadSeed[] {
  return SEED.map((thread) => structuredClone(thread));
}

/* ------------------------------------------------------------------ journal IO --- */

function toEvent(raw: unknown): ChatEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  const at = requiredString(r.at, "event timestamp");
  if (r.kind === "thread_opened") {
    const open = r.open;
    if (typeof open !== "object" || open === null) malformed("thread_opened open");
    const o = open as Record<string, unknown>;
    if (!isThreadKind(o.kind)) malformed("thread_opened kind");
    return {
      kind: "thread_opened",
      at,
      thread: requiredString(r.thread, "event thread"),
      open: {
        kind: o.kind,
        participant_id: requiredString(o.participant_id, "opened participant id"),
        participant_name: requiredString(o.participant_name, "opened participant name"),
        subject: requiredString(o.subject, "opened subject"),
      },
    };
  }
  if (r.kind === "message_posted") {
    const state = r.state;
    if (!isMessageState(state)) malformed("message_posted state");
    return {
      kind: "message_posted",
      at,
      thread: requiredString(r.thread, "event thread"),
      message: toMessage(r.message),
      state,
    };
  }
  if (r.kind === "message_state") {
    const state = r.state;
    if (!isMessageState(state)) malformed("message_state state");
    return {
      kind: "message_state",
      at,
      thread: requiredString(r.thread, "event thread"),
      message_id: requiredString(r.message_id, "message_state message id"),
      state,
    };
  }
  return malformed(`store event kind ${String(r.kind)}`);
}

async function readThreadEvents(threadId: string): Promise<ChatEvent[]> {
  const events = await readJournalEvents(chatThreadPath(threadId), "chat thread");
  return events.map(toEvent);
}

async function readThreadEventsOrEmpty(threadId: string): Promise<ChatEvent[]> {
  if (!isChatThreadId(threadId)) return [];
  return readThreadEvents(threadId);
}

function persistThreadEvents(threadId: string, events: ChatEvent[]): Promise<void> {
  return writeJournalEvents(chatThreadPath(threadId), "chat thread", events);
}

const withStoreLock = createJournalLock();

/* ---------------------------------------------------------------- the fold --- */

function seedById(threadId: string): ChatThreadSeed | undefined {
  return SEED.find((thread) => thread.id === threadId);
}

/** Fold a thread from its seed and journal, or null when neither knows it. */
async function foldThread(threadId: string, events: ChatEvent[]): Promise<ChatThreadView | null> {
  const seed = seedById(threadId);
  if (seed) return foldChatThread(seed, events);
  const opened = foldChatEvents(events).opened;
  if (!opened) return null;
  return newThreadView({
    id: threadId,
    kind: opened.kind,
    participant_id: opened.participant_id,
    participant_name: opened.participant_name,
    subject: opened.subject,
    created_at: opened.created_at,
  });
}

/** Every thread: the seed's own plus any the journal has opened, newest activity first. */
export async function listChatThreads(): Promise<ChatThreadView[]> {
  await ensureSeedChatAttachments();
  const ids = new Set<string>([...SEED.map((thread) => thread.id), ...(await listJournalFiles(chatStoreDir()))]);
  const views: ChatThreadView[] = [];
  for (const id of ids) {
    if (!isChatThreadId(id)) continue;
    const events = await readThreadEventsOrEmpty(id);
    const view = await foldThread(id, events);
    if (view) views.push(view);
  }
  return sortThreadsByActivity(views);
}

/** One thread, or null when no seed and no journal knows it. */
export async function getChatThread(threadId: string): Promise<ChatThreadView | null> {
  if (!isChatThreadId(threadId)) return null;
  await ensureSeedChatAttachments();
  const events = await readThreadEventsOrEmpty(threadId);
  return foldThread(threadId, events);
}

/** The unread count the Admin Inbox badge shows. */
export async function totalOfficeUnread(): Promise<number> {
  const threads = await listChatThreads();
  return threads.reduce((sum, thread) => sum + thread.unread_for_office, 0);
}

/* ------------------------------------------------------------------- writes --- */

export type ChatUploadInput = {
  name: string;
  /** The browser's declared content type; the extension still decides the family. */
  declaredMime: string | null;
  bytes: Buffer;
};

export type ChatOpenInput = {
  kind: ChatThreadKind;
  participant_id: string;
  participant_name: string;
  subject: string;
};

/**
 * Append one message. The caller has already decided WHO may post (the route checks the
 * session and that the thread belongs to the caller); this function owns the record rules:
 * a message needs words or a file, each file is on the allow-list and under 10 MB, and the
 * thread stays under its total. Refusals name the file and the reason.
 */
export function postChatMessage(args: {
  threadId: string;
  author: ChatSender;
  authorName: string;
  body: string;
  files?: ChatUploadInput[];
  /** The thread record to open when this is a brand-new conversation. */
  open?: ChatOpenInput;
  now?: Date;
}): Promise<ChatThreadView> {
  const now = args.now ?? new Date();
  const files = args.files ?? [];
  return withStoreLock(async () => {
    const events = await readThreadEventsOrEmpty(args.threadId);
    const existing = await foldThread(args.threadId, events);

    if (!existing) {
      if (!args.open) throw new ApiError("not_found", 404);
      // Refuse a thread opened for a different participant than the id names.
      const expected = chatThreadIdFor(args.open.kind, args.open.participant_id);
      if (expected !== args.threadId) {
        throw new ApiError("that conversation address does not match its participant", 422);
      }
      events.push({
        kind: "thread_opened",
        at: now.toISOString(),
        thread: args.threadId,
        open: args.open,
      });
    }

    const body = args.body.trim();
    const bodyIssue = chatBodyIssue(body);
    if (bodyIssue) throw new ApiError(bodyIssue, 422, { message: bodyIssue });
    if (body.length === 0 && files.length === 0) {
      throw new ApiError("Write a message or attach a file.", 422, {
        message: "Write a message or attach a file.",
      });
    }

    const resolved: Array<{ name: string; mime: string; bytes: Buffer }> = [];
    for (const file of files) {
      const mime = chatAttachmentMime(file.name, file.declaredMime);
      const refusal = chatAttachmentRefusal({ name: file.name, mime, size: file.bytes.byteLength });
      if (refusal) {
        const status = mime ? 413 : 415;
        throw new ApiError(refusal, status, { files: refusal });
      }
      resolved.push({ name: file.name, mime: mime!, bytes: file.bytes });
    }

    const existingBytes = existing ? threadAttachmentBytes(existing.messages) : 0;
    const incomingBytes = resolved.reduce((sum, file) => sum + file.bytes.byteLength, 0);
    if (existingBytes + incomingBytes > CHAT_THREAD_ATTACHMENT_MAX_BYTES) {
      const issue = `This conversation already holds ${formatChatBytes(
        existingBytes,
      )} of files — the most a thread can hold is ${formatChatBytes(
        CHAT_THREAD_ATTACHMENT_MAX_BYTES,
      )}. Start a new conversation or remove a file first.`;
      throw new ApiError(issue, 413, { files: issue });
    }

    const attachments: ChatAttachment[] = [];
    for (const file of resolved) {
      attachments.push(await storeChatAttachment({ bytes: file.bytes, name: file.name, mime: file.mime }));
    }

    const at = now.toISOString();
    const message: ChatMessage = {
      id: `chat-msg-${randomUUID()}`,
      author: args.author,
      author_name: args.authorName,
      body,
      at,
      attachments,
    };
    events.push({ kind: "message_posted", at, thread: args.threadId, message, state: "sent" });
    await persistThreadEvents(args.threadId, events);
    const view = await foldThread(args.threadId, events);
    if (!view) throw new ApiError("the conversation could not be read back", 500);
    return view;
  });
}

/** The state the other side's next request proves, from `sent` only. */
function nextDeliveryState(current: ChatMessageState | undefined): ChatMessageState | null {
  return current === undefined || current === "sent" ? "delivered" : null;
}

async function appendStateForOtherSide(
  threadId: string,
  reader: ChatSender,
  next: (current: ChatMessageState | undefined) => ChatMessageState | null,
): Promise<ChatThreadView | null> {
  const events = await readThreadEventsOrEmpty(threadId);
  const view = await foldThread(threadId, events);
  if (!view) return null;
  const at = new Date().toISOString();
  const additions: ChatEvent[] = [];
  for (const message of view.messages) {
    if (message.author === reader) continue;
    const state = next(message.state);
    if (!state) continue;
    additions.push({ kind: "message_state", at, thread: threadId, message_id: message.id, state });
  }
  if (additions.length > 0) {
    await persistThreadEvents(threadId, [...events, ...additions]);
    const reread = await foldThread(threadId, [...events, ...additions]);
    return reread;
  }
  return view;
}

/**
 * Record `delivered` for every message the OTHER side wrote that is still only `sent`.
 * Called when this side's screen reads the thread — the app's own observation, not a
 * fabricated push.
 */
export function markThreadDelivered(
  threadId: string,
  reader: ChatSender,
): Promise<ChatThreadView | null> {
  return withStoreLock(() =>
    appendStateForOtherSide(threadId, reader, (current) => nextDeliveryState(current)),
  );
}

/** Record `read` for every message the OTHER side wrote that is not already read. */
export function markThreadRead(
  threadId: string,
  reader: ChatSender,
): Promise<ChatThreadView | null> {
  return withStoreLock(() =>
    appendStateForOtherSide(threadId, reader, (current) =>
      current === "read" ? null : "read",
    ),
  );
}

/* -------------------------------------------------------------- attachment access --- */

/**
 * The attachment row for a hash this viewer may fetch, or null. Only a thread the viewer
 * can open may reference it — an unguessable hash is not a capability either.
 */
export async function findChatAttachment(
  hash: string,
  viewer: ChatViewer,
): Promise<ChatAttachment | null> {
  const threads: ChatThreadView[] = [];
  if (viewer.role === "office") {
    threads.push(...(await listChatThreads()));
  } else {
    const id = viewer.role === "family" ? viewer.userId : viewer.agentId;
    const thread = await getChatThread(chatThreadIdFor(viewer.role, id));
    if (thread) threads.push(thread);
  }
  for (const thread of threads) {
    for (const message of thread.messages) {
      const found = message.attachments.find((attachment) => attachment.id === hash);
      if (found) return { ...found };
    }
  }
  return null;
}

/** May this viewer fetch the bytes at this content address? */
export async function chatAttachmentAccessible(
  hash: string,
  viewer: ChatViewer,
): Promise<boolean> {
  return (await findChatAttachment(hash, viewer)) !== null;
}
