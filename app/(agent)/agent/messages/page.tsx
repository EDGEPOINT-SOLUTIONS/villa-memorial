import { ChatView } from "@/components/chat/chat-view";
import { PageHeader, PageSection } from "@/components/ui/page";
import { getChatThread } from "@/lib/api-client/chat-store";
import { portalForSession } from "@/lib/auth/destination";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { chatThreadIdFor, CHAT_SERVICE_NOTE, newThreadView } from "@/lib/chat";

export const metadata = { title: "Messages — Villa Funeraria agent portal" };
export const dynamic = "force-dynamic";

/**
 * Agent messages (`/agent/messages`) — the agent's own line to the office, the
 * admin↔agent half of the board's chat (§9.6). The thread is the one whose participant
 * is this agent; the send route checks the same ownership.
 */
export default async function AgentMessagesPage() {
  const session = await requirePortalSessionOrRedirect("agent");

  if (portalForSession(session) !== "agent") {
    return (
      <>
        <PageHeader
          eyebrow="Tools"
          title="Messages"
          lead="Reading an agent's conversation as a staff preview."
        />
        <PageSection>
          <p className="text-sm text-muted">
            Open the Admin Inbox to reply. An agent account is needed to write from this side.
          </p>
        </PageSection>
      </>
    );
  }

  const threadId = chatThreadIdFor("agent", session.userId);
  const existing = await getChatThread(threadId);
  const thread =
    existing ??
    newThreadView({
      id: threadId,
      kind: "agent",
      participant_id: session.userId,
      participant_name: session.displayName,
      subject: session.displayName,
      created_at: new Date().toISOString(),
    });

  return (
    <>
      <PageHeader eyebrow="Tools" title="Messages" lead="Your conversation with the office." />
      <PageSection>
        <p className="text-sm text-muted">{CHAT_SERVICE_NOTE}</p>
        <ChatView role="agent" thread={thread} canSend />
      </PageSection>
    </>
  );
}
