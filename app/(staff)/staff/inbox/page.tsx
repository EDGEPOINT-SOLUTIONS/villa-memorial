import Link from "next/link";
import { ChatThreadList } from "@/components/chat/chat-thread-list";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { listChatThreads } from "@/lib/api-client/chat-store";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { CHAT_SERVICE_NOTE } from "@/lib/chat";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Inbox — Admin Portal" };
export const dynamic = "force-dynamic";

/**
 * The Admin Inbox (`/staff/inbox`) — every conversation the office keeps with a family or
 * an agent, newest activity first, with the office's unread count per thread.
 *
 * `cases:read` gates the list, `cases:write` the send (the conversation page reads the
 * same pair). Both are provisional reuses while `rbac-scopes-v1` names no messaging code,
 * exactly like the rest of the CRM seam. The screen states its honest boundary once: the
 * threads are a demo-local journal, not a messaging service.
 */
export default async function InboxPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Today" title="Inbox" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let threads;
  try {
    threads = await listChatThreads();
  } catch (error) {
    return (
      <>
        <PageHeader eyebrow="Today" title="Inbox" />
        <PageSection>
          <ErrorState
            message={
              error instanceof ApiError
                ? error.message
                : "The conversations could not be read just now."
            }
          />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Inbox"
        lead="Conversations with families and agents."
        actions={
          <Link className="btn btn--secondary btn--sm" href="/staff/notifications">
            Notifications
          </Link>
        }
      />
      <PageSection>
        <p className="text-sm text-muted">{CHAT_SERVICE_NOTE}</p>
        <ChatThreadList threads={threads} />
      </PageSection>
    </>
  );
}
