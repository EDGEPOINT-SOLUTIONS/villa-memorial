"use client";

/**
 * The chat conversation — one component for all three screens (the Admin Inbox, the
 * family portal and the agent portal).
 *
 * WHAT IT DOES: renders a folded thread (`lib/chat.ts`), sends a message + files through
 * the BFF (`POST /api/chat/threads/:id`), re-checks the thread on a short poll, and marks
 * it read when the screen is open. The bubble grammar is the board's own
 * (`data/villa-admin-plan/report.md` §9.6): the sender's messages on the right, the other
 * side's on the left, each with its recorded state.
 *
 * WHAT IT DOES NOT DO: hold rules. The message/attachment rules are the shared pure
 * functions in `lib/chat.ts` + `lib/chat-attachments.ts` (the same ones the store runs),
 * so a refused file reads the same in the browser and on the server. Delivery/read are
 * never claimed here — the state shown is what the server folded. There is no live push:
 * the component polls, and `CHAT_TRANSPORT_NOTE` says so on the screen.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
import { EmptyState } from "@/components/kit";
import { manilaDay, manilaTime } from "@/lib/agent/agent-view";
import {
  CHAT_MESSAGE_MAX_CHARS,
  CHAT_STATE_LABEL,
  CHAT_TRANSPORT_NOTE,
  type ChatMessageView,
  type ChatThreadView,
} from "@/lib/chat";
import {
  CHAT_ATTACHMENT_ACCEPT,
  chatAttachmentMime,
  chatAttachmentRefusal,
  formatChatBytes,
  isImageChatMime,
} from "@/lib/chat-attachments";

export type ChatRole = "office" | "family" | "agent";

type PendingMessage = {
  id: string;
  body: string;
  at: string;
  fileNames: string[];
  state: "sending" | "failed";
  error?: string;
};

function attachmentsOf(message: ChatMessageView) {
  return message.attachments.map((attachment) => {
    const href = `/api/chat/attachments/${attachment.id}`;
    const isImage = isImageChatMime(attachment.mime);
    return (
      <a
        key={attachment.id}
        className="chat-attach"
        href={href}
        target="_blank"
        rel="noreferrer"
        title={`${attachment.name} · ${formatChatBytes(attachment.size)}`}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- a guarded chat attachment, not a build asset
          <img className="chat-attach__thumb" src={href} alt={attachment.name} />
        ) : (
          <Paperclip className="chat-attach__icon" size={16} aria-hidden="true" />
        )}
        <span className="chat-attach__name">{attachment.name}</span>
        <span className="chat-attach__size">{formatChatBytes(attachment.size)}</span>
      </a>
    );
  });
}

function Message({
  message,
  own,
}: {
  message: ChatMessageView;
  own: boolean;
}) {
  return (
    <div className={`chat-msg chat-msg--${own ? "me" : "them"}`}>
      {message.body ? <p className="chat-msg__body">{message.body}</p> : null}
      {message.attachments.length > 0 ? (
        <div className="chat-msg__attachments">{attachmentsOf(message)}</div>
      ) : null}
      <p className="chat-msg__meta">
        <span className="chat-msg__author">{message.author_name}</span>
        {" · "}
        <time dateTime={message.at}>
          {manilaDay(message.at)} · {manilaTime(message.at)}
        </time>
        {own ? <span className="chat-msg__state"> · {CHAT_STATE_LABEL[message.state]}</span> : null}
      </p>
    </div>
  );
}

export function ChatView({
  role,
  thread,
  canSend,
  pollMs = 5000,
}: {
  role: ChatRole;
  thread: ChatThreadView;
  canSend: boolean;
  pollMs?: number;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(thread);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const base = useId();
  const url = `/api/chat/threads/${encodeURIComponent(current.id)}`;

  // Keep the prop's fresh server render when the page refreshes around us.
  useEffect(() => {
    setCurrent(thread);
  }, [thread]);

  // The short poll — the honest transport, with no push service.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { thread?: ChatThreadView };
        if (active && data.thread) setCurrent(data.thread);
      } catch {
        /* a poll that cannot reach the server changes nothing */
      }
    };
    void load();
    const timer = window.setInterval(load, pollMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [url, pollMs]);

  // Mark read while the conversation is open (and when the tab regains focus).
  useEffect(() => {
    const mark = () => {
      void fetch(`${url}/read`, { method: "POST" }).catch(() => undefined);
    };
    mark();
    window.addEventListener("focus", mark);
    return () => window.removeEventListener("focus", mark);
  }, [url]);

  function pickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    const issues: string[] = [];
    for (const file of Array.from(list)) {
      const mime = chatAttachmentMime(file.name, file.type);
      const refusal = chatAttachmentRefusal({ name: file.name, mime, size: file.size });
      if (refusal) issues.push(refusal);
      else accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted]);
    setFileError(issues[0] ?? null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function send(nextBody = body, nextFiles = files) {
    const text = nextBody.trim();
    if (!text && nextFiles.length === 0) {
      setError("Write a message or attach a file.");
      return;
    }
    if (text.length > CHAT_MESSAGE_MAX_CHARS) {
      setError(`That message is ${text.length} characters — keep it under ${CHAT_MESSAGE_MAX_CHARS}.`);
      return;
    }
    setError(null);
    setFileError(null);
    const optimistic: PendingMessage = {
      id: `pending-${Date.now()}`,
      body: text,
      at: new Date().toISOString(),
      fileNames: nextFiles.map((file) => file.name),
      state: "sending",
    };
    setPending((prev) => [...prev, optimistic]);
    setBody("");
    setFiles([]);
    setBusy(true);
    const form = new FormData();
    form.set("body", text);
    for (const file of nextFiles) form.append("files", file);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { thread?: ChatThreadView; error?: string }
        | null;
      if (!res.ok) {
        const message = data?.error ?? "The message could not be sent.";
        setPending((prev) =>
          prev.map((item) =>
            item.id === optimistic.id ? { ...item, state: "failed", error: message } : item,
          ),
        );
        setError(message);
        setBody(text);
        setFiles(nextFiles);
        return;
      }
      setPending((prev) => prev.filter((item) => item.id !== optimistic.id));
      if (data?.thread) setCurrent(data.thread);
      router.refresh();
    } catch {
      setPending((prev) =>
        prev.map((item) =>
          item.id === optimistic.id
            ? { ...item, state: "failed", error: "Could not reach the office." }
            : item,
        ),
      );
      setError("Could not reach the office. Try again.");
      setBody(text);
      setFiles(nextFiles);
    } finally {
      setBusy(false);
    }
  }

  const ownSender = role === "office" ? "office" : "participant";

  return (
    <div className="chat-view">
      <p className="chat-note" role="note">
        {CHAT_TRANSPORT_NOTE}
      </p>

      <div className="chat" role="log" aria-label="Message history" aria-live="polite">
        {current.messages.length === 0 && pending.length === 0 ? (
          <EmptyState
            title="No messages yet"
            hint="Write the first message below, or attach a file."
          />
        ) : null}
        {current.messages.map((message) => (
          <Message key={message.id} message={message} own={message.author === ownSender} />
        ))}
        {pending.map((item) => (
          <div
            key={item.id}
            className={`chat-msg chat-msg--me chat-msg--${item.state}`}
            aria-busy={item.state === "sending"}
          >
            {item.body ? <p className="chat-msg__body">{item.body}</p> : null}
            {item.fileNames.length > 0 ? (
              <div className="chat-msg__attachments">
                {item.fileNames.map((name) => (
                  <span key={name} className="chat-attach chat-attach--pending">
                    <Paperclip className="chat-attach__icon" size={16} aria-hidden="true" />
                    <span className="chat-attach__name">{name}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <p className="chat-msg__meta">
              <span className="chat-msg__state">
                {item.state === "failed" ? CHAT_STATE_LABEL.failed : CHAT_STATE_LABEL.sending}
              </span>
              {item.error ? <span className="chat-msg__error"> · {item.error}</span> : null}
            </p>
          </div>
        ))}
      </div>

      {canSend ? (
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor={`${base}-body`} className="visually-hidden">
            Write a message
          </label>
          <textarea
            id={`${base}-body`}
            className="chat-composer__input"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            maxLength={CHAT_MESSAGE_MAX_CHARS}
            placeholder="Write a message…"
          />
          {files.length > 0 ? (
            <ul className="chat-composer__files" aria-label="Files to send">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="chat-composer__file">
                  <Paperclip size={14} aria-hidden="true" />
                  <span>{file.name}</span>
                  <span className="text-muted">{formatChatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="chat-composer__actions">
            <label className="btn btn--secondary btn--sm" htmlFor={`${base}-files`}>
              <Paperclip size={16} aria-hidden="true" />
              Attach
            </label>
            <input
              ref={fileInput}
              id={`${base}-files`}
              className="visually-hidden"
              type="file"
              multiple
              accept={CHAT_ATTACHMENT_ACCEPT}
              onChange={(event) => pickFiles(event.target.files)}
            />
            <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
              <Send size={16} aria-hidden="true" />
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
          <p className="chat-composer__hint">
            Attach Word, Excel, PDF or an image — up to {formatChatBytes(10 * 1024 * 1024)} each.
          </p>
          {fileError ? (
            <p className="field__error" role="alert">
              {fileError}
            </p>
          ) : null}
          {error ? (
            <p className="field__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="chat-readonly" role="note">
          You can read this conversation but not write to it on this sign-in.
        </p>
      )}
    </div>
  );
}
