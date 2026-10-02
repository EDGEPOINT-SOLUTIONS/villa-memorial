import Link from "next/link";
import { EmptyState } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { manilaDay, manilaTime } from "@/lib/agent/agent-view";
import { CHAT_KIND_LABEL, type ChatThreadView } from "@/lib/chat";

/**
 * The Admin Inbox's thread list — the office's one view of every conversation.
 *
 * A row leads with WHO and the last line (the board's at-a-glance rule), carries the
 * family/agent chip and, when the office has not read the family's latest, an unread
 * count. It renders the folded `ChatThreadView`s the store already produced; it holds no
 * logic of its own.
 */
export function ChatThreadList({
  threads,
  activeId,
  basePath = "/staff/inbox",
}: {
  threads: ChatThreadView[];
  activeId?: string;
  basePath?: string;
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        hint="A message from a family or an agent opens a thread here."
      />
    );
  }
  return (
    <ul className="chat-thread-list" aria-label="Conversations">
      {threads.map((thread) => {
        const active = thread.id === activeId;
        return (
          <li key={thread.id} className="chat-thread-list__item">
            <Link
              href={`${basePath}/${thread.id}`}
              className={`chat-thread-list__row${active ? " chat-thread-list__row--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="chat-thread-list__head">
                <span className="chat-thread-list__subject">{thread.subject}</span>
                <Badge tone="neutral">{CHAT_KIND_LABEL[thread.kind]}</Badge>
                {thread.unread_for_office > 0 ? (
                  <span
                    className="chat-thread-list__unread"
                    aria-label={`${thread.unread_for_office} unread`}
                  >
                    {thread.unread_for_office}
                  </span>
                ) : null}
              </span>
              <span className="chat-thread-list__preview">{thread.last_message_preview}</span>
              <span className="chat-thread-list__meta">
                {thread.last_message_at ? (
                  <time dateTime={thread.last_message_at}>
                    {manilaDay(thread.last_message_at)} · {manilaTime(thread.last_message_at)}
                  </time>
                ) : (
                  <span>No messages yet</span>
                )}
                {thread.attachment_count > 0 ? (
                  <span className="chat-thread-list__files">
                    {thread.attachment_count} file{thread.attachment_count === 1 ? "" : "s"}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
