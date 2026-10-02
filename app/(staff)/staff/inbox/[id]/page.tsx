import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThreadList } from "@/components/chat/chat-thread-list";
import { ChatView } from "@/components/chat/chat-view";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { getChatThread, listChatThreads } from "@/lib/api-client/chat-store";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { CHAT_KIND_LABEL, CHAT_SERVICE_NOTE } from "@/lib/chat";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Conversation — Admin Portal" };
export const dynamic = "force-dynamic";

/**
 * One conversation (`/staff/inbox/[id]`) — the board's own screen.
 *
 * The office reads every thread; `cases:write` decides whether the composer is shown
 * (the route enforces it too). The rail beside the conversation is the same thread list
 * the Inbox renders, so moving between conversations never loses the office's place.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Inbox" title="Conversation" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let thread;
  let threads;
  try {
    thread = await getChatThread(id);
    threads = await listChatThreads();
  } catch (error) {
    return (
      <>
        <PageHeader eyebrow="Inbox" title="Conversation" />
        <PageSection>
          <ErrorState
            message={
              error instanceof ApiError
                ? error.message
                : "The conversation could not be read just now."
            }
          />
        </PageSection>
      </>
    );
  }
  if (!thread) notFound();

  const canWrite = hasAnyScope(session.scopes, ["cases:write"]);

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title={thread.subject}
        lead={`${CHAT_KIND_LABEL[thread.kind]} ↔ Admin · ${thread.message_count} message${
          thread.message_count === 1 ? "" : "s"
        }${thread.attachment_count > 0 ? ` · ${thread.attachment_count} file${thread.attachment_count === 1 ? "" : "s"} kept` : ""}`}
        actions={
          <Link className="btn btn--secondary btn--sm" href="/staff/inbox">
            All conversations
          </Link>
        }
      />
      <PageSection>
        <p className="text-sm text-muted">{CHAT_SERVICE_NOTE}</p>
        <div className="chat-layout">
          <aside className="chat-layout__rail" aria-label="Conversations">
            <ChatThreadList threads={threads} activeId={id} />
          </aside>
          <div className="chat-layout__main">
            <ChatView role="office" thread={thread} canSend={canWrite} />
          </div>
        </div>
      </PageSection>
    </>
  );
}
