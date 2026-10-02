/**
 * Chat — the durable-conversation rules, as pure functions.
 *
 * The captain asked for a message chat ("admin to families, admin to agents, … these
 * chats are saved, they can send files through chats, docx, images, pdf, excel") and the
 * admin plan records the shape the board drew (`data/villa-admin-plan/report.md` §9.6):
 * one append-only journal per thread, per-message state appended as events, content-
 * addressed attachments. This module is the READER half — the record shape, the fold and
 * the vocabulary — and it imports nothing (no fs, no React), so the same reading runs in
 * the store, the BFF routes and the views' tests.
 *
 * WHAT THIS FILE OWNS
 *   · the two sides of a conversation (the `office` and its `participant`), the two
 *     thread kinds (a `family` or an `agent`) and the five per-message states;
 *   · the fold: seed messages + journal events → one ordered thread view, where a state
 *     event NEVER overwrites an earlier one (the full trail is kept and only the current
 *     state is projected);
 *   · the unread counts and the list preview the office Inbox shows.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN
 *   · persistence (lib/api-client/chat-store.ts), file storage (lib/chat-attachments.ts +
 *     lib/chat-attachment-store.ts), or any transport. There is NO live push service in
 *     this build: delivery/read are recorded from the other side's own next request, and
 *     `CHAT_TRANSPORT_NOTE` says so in one line wherever the thread is rendered.
 *
 * THE HONEST-STATE RULE APPLIES HERE TOO. A message carries only states the app can
 * actually observe — `sent` when the office's server recorded it, `delivered`/`read` when
 * the other side's screen next read the thread, `failed` only on the sender's own failed
 * draft. Nothing is invented to make a bubble look livelier.
 */

/** The two sides of a thread. `office` is the admin portal; `participant` is the family or agent. */
export type ChatSender = "office" | "participant";

/** Who a thread is with. The office talks to families and to agents. */
export type ChatThreadKind = "family" | "agent";

/** The per-message states, in the order a message can move through them. */
export type ChatMessageState = "sending" | "sent" | "delivered" | "read" | "failed";

export const CHAT_MESSAGE_STATES: readonly ChatMessageState[] = [
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
];

/** One attached file, as a metadata row. `id` is the sha256 of the bytes (the content address). */
export type ChatAttachment = {
  /** sha256 of the file's bytes — the key under `.data/attachments`. */
  id: string;
  /** The file's own name, as the sender chose it. */
  name: string;
  /** The resolved content type. */
  mime: string;
  /** Byte count. */
  size: number;
};

/** A message as it is stored. */
export type ChatMessage = {
  id: string;
  author: ChatSender;
  author_name: string;
  body: string;
  /** A true instant (ISO 8601). */
  at: string;
  attachments: ChatAttachment[];
};

/** A message as the recorded seed carries it, with its initial state. */
export type ChatSeededMessage = ChatMessage & { state: ChatMessageState };

/** One recorded conversation in `lib/fixtures/chat/threads.json`. */
export type ChatThreadSeed = {
  id: string;
  kind: ChatThreadKind;
  /** The family account's user id, or the agent's workspace id. */
  participant_id: string;
  participant_name: string;
  /** What the office calls the thread (the family/agent name). */
  subject: string;
  created_at: string;
  messages: ChatSeededMessage[];
};

/** A journal event. The whole journal is append-only: states are added, never rewritten. */
export type ChatEvent =
  | {
      kind: "thread_opened";
      at: string;
      thread: string;
      /** The thread's own record when it is not one of the recorded seed threads. */
      open: {
        kind: ChatThreadKind;
        participant_id: string;
        participant_name: string;
        subject: string;
      };
    }
  | { kind: "message_posted"; at: string; thread: string; message: ChatMessage; state: ChatMessageState }
  | { kind: "message_state"; at: string; thread: string; message_id: string; state: ChatMessageState };

/** A message as a view reads it: the record, its CURRENT state and the trail that produced it. */
export type ChatMessageView = ChatMessage & {
  state: ChatMessageState;
  state_trail: ChatMessageState[];
};

/** One conversation, folded: what every chat screen renders. */
export type ChatThreadView = {
  id: string;
  kind: ChatThreadKind;
  participant_id: string;
  participant_name: string;
  subject: string;
  created_at: string;
  /** Oldest first. */
  messages: ChatMessageView[];
  last_message_at: string | null;
  last_message_preview: string;
  last_message_author: ChatSender | null;
  /** Participant messages the OFFICE has not yet read — the Inbox badge. */
  unread_for_office: number;
  /** Office messages the PARTICIPANT has not yet read. */
  unread_for_participant: number;
  message_count: number;
  attachment_count: number;
  attachment_bytes: number;
};

/** A viewer of a thread — the office, or the one participant the thread is with. */
export type ChatViewer =
  | { role: "office" }
  | { role: "family"; userId: string }
  | { role: "agent"; agentId: string };

/** The thread id for a participant: deterministic, URL- and filename-safe. */
export function chatThreadIdFor(kind: ChatThreadKind, participantId: string): string {
  return `${kind}-${participantId}`;
}

/** A thread id we accept: lowercase letters, digits and single dashes. */
export function isChatThreadId(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** May this viewer open this thread? The office sees every thread; a participant owns only theirs. */
export function chatViewerCanAccess(thread: ChatThreadView, viewer: ChatViewer): boolean {
  if (viewer.role === "office") return true;
  if (thread.kind !== viewer.role) return false;
  const id = viewer.role === "family" ? viewer.userId : viewer.agentId;
  return thread.participant_id === id;
}

/* ------------------------------------------------------------------ the fold --- */

/** The journal folded on its own: posted messages, and the current state + trail per message id. */
export type ChatEventFold = {
  /** Journal-posted messages, oldest first (as posted). */
  messages: ChatMessage[];
  /** The current state per message id (seed or posted); the last event wins. */
  states: Record<string, ChatMessageState>;
  /** Every state event's value per message id, in journal order. */
  trails: Record<string, ChatMessageState[]>;
  /** The thread record from a `thread_opened` event, when the thread is not seeded. */
  opened: ChatEventFoldOpened | null;
};

export type ChatEventFoldOpened = {
  kind: ChatThreadKind;
  participant_id: string;
  participant_name: string;
  subject: string;
  created_at: string;
};

/**
 * Fold the journal events. Append-only by construction: a `message_state` event adds to
 * the trail and moves the current state; it never rewrites or removes an earlier event.
 */
export function foldChatEvents(events: ChatEvent[]): ChatEventFold {
  const messages: ChatMessage[] = [];
  const states: Record<string, ChatMessageState> = {};
  const trails: Record<string, ChatMessageState[]> = {};
  let opened: ChatEventFoldOpened | null = null;

  for (const event of events) {
    if (event.kind === "thread_opened") {
      opened = { ...event.open, created_at: event.at };
      continue;
    }
    if (event.kind === "message_posted") {
      messages.push(structuredClone(event.message));
      states[event.message.id] = event.state;
      trails[event.message.id] = [event.state];
      continue;
    }
    // message_state — append to the trail, project the newest.
    states[event.message_id] = event.state;
    trails[event.message_id] = [...(trails[event.message_id] ?? []), event.state];
  }

  return { messages, states, trails, opened };
}

function previewOf(message: ChatMessage): string {
  const body = message.body.replace(/\s+/g, " ").trim();
  if (body) return body.length > 90 ? `${body.slice(0, 89)}…` : body;
  if (message.attachments.length === 1) return `Sent ${message.attachments[0].name}`;
  if (message.attachments.length > 1) return `Sent ${message.attachments.length} files`;
  return "No text";
}

/**
 * Fold a seed thread with its journal events into the one view a screen reads.
 *
 * The seed messages and the journal messages are merged by time (a stable tiebreak keeps
 * one order), and every message's state comes from the journal when it names one, else
 * the seed's own recorded state. A state event may target a seed message — that is how
 * the office marks a recorded family message read.
 */
export function foldChatThread(seed: ChatThreadSeed, events: ChatEvent[]): ChatThreadView {
  const fold = foldChatEvents(events);
  const project = (message: ChatMessage, seededState?: ChatMessageState): ChatMessageView => {
    const state = fold.states[message.id] ?? seededState ?? "sent";
    // The seed's own recorded state is the trail's first entry; journal events follow,
    // so a seed message marked read later keeps both facts (delivered → read).
    const raw = [
      ...(seededState ? [seededState] : []),
      ...(fold.trails[message.id] ?? []),
    ];
    const trail = raw.filter((value, index) => index === 0 || value !== raw[index - 1]);
    return { ...message, state, state_trail: trail.length > 0 ? trail : ["sent"] };
  };

  const seeded = seed.messages.map((message) => project(message, message.state));
  const posted = fold.messages.map((message) => project(message));
  const messages = [...seeded, ...posted].sort(
    (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
  );

  const last = messages.length > 0 ? messages[messages.length - 1] : null;
  let attachmentCount = 0;
  let attachmentBytes = 0;
  for (const message of messages) {
    attachmentCount += message.attachments.length;
    for (const attachment of message.attachments) attachmentBytes += attachment.size;
  }

  return {
    id: seed.id,
    kind: seed.kind,
    participant_id: seed.participant_id,
    participant_name: seed.participant_name,
    subject: seed.subject,
    created_at: seed.created_at,
    messages,
    last_message_at: last?.at ?? null,
    last_message_preview: last ? previewOf(last) : "No messages yet",
    last_message_author: last?.author ?? null,
    unread_for_office: messages.filter((m) => m.author === "participant" && m.state !== "read").length,
    unread_for_participant: messages.filter((m) => m.author === "office" && m.state !== "read").length,
    message_count: messages.length,
    attachment_count: attachmentCount,
    attachment_bytes: attachmentBytes,
  };
}

/** A thread that exists before its first message (an opened conversation with no seed). */
export function newThreadView(
  seed: Pick<
    ChatThreadSeed,
    "id" | "kind" | "participant_id" | "participant_name" | "subject" | "created_at"
  >,
): ChatThreadView {
  return foldChatThread({ ...seed, messages: [] }, []);
}

/* -------------------------------------------------------------- presentation --- */

export const CHAT_STATE_LABEL: Record<ChatMessageState, string> = {
  sending: "sending…",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "not sent",
};

export const CHAT_STATE_TONE: Record<ChatMessageState, string> = {
  sending: "neutral",
  sent: "neutral",
  delivered: "neutral",
  read: "neutral",
  failed: "danger",
};

/** The participant's own words for a thread kind, used in the two portals. */
export const CHAT_KIND_LABEL: Record<ChatThreadKind, string> = {
  family: "Family",
  agent: "Agent",
};

/**
 * The one honest transport line. There is no live push service in this build: the thread
 * is server-rendered and re-checked on a short poll, so a state is recorded from the
 * other side's own next request — never claimed as a push.
 */
export const CHAT_TRANSPORT_NOTE =
  "Messages are saved on the office's server. This page checks for new ones every few seconds — there is no live push service yet.";

/** The reference line on every chat screen: a durable demo record, not a messaging contract. */
export const CHAT_SERVICE_NOTE =
  "Threads are a demo-local journal; no messaging/communications service contract is frozen. Attachments live on this server's disk under .data/attachments.";

/** The draft rule: a message needs words or at least one file. */
export const CHAT_MESSAGE_MAX_CHARS = 4000;

/** What is wrong with a draft's text, or null when it is sendable. */
export function chatBodyIssue(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length > CHAT_MESSAGE_MAX_CHARS) {
    return `That message is ${trimmed.length} characters — keep it under ${CHAT_MESSAGE_MAX_CHARS}.`;
  }
  return null;
}

/** List-order helper: newest activity first (the office Inbox). */
export function sortThreadsByActivity(threads: ChatThreadView[]): ChatThreadView[] {
  return [...threads].sort((a, b) => {
    const at = a.last_message_at ?? a.created_at;
    const bt = b.last_message_at ?? b.created_at;
    return bt.localeCompare(at) || a.subject.localeCompare(b.subject);
  });
}
