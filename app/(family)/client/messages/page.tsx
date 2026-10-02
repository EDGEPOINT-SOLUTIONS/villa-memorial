import { ChatView } from "@/components/chat/chat-view";
import { PageHeader, PageSection } from "@/components/ui/page";
import { getChatThread } from "@/lib/api-client/chat-store";
import { portalForSession } from "@/lib/auth/destination";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { chatThreadIdFor, newThreadView } from "@/lib/chat";
import { FAMILY_HELP } from "@/lib/family/contact";
import { Answer, CallAction } from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";

export const metadata = { title: "Messages — Villa Funeraria" };
export const dynamic = "force-dynamic";

/**
 * Family messages (`/client/messages`) — the family's own line to the office.
 *
 * The thread is the one whose participant is this account (`chatThreadIdFor`), so a
 * family can only ever open its own conversation; the send route enforces the same thing.
 * A staff preview of the family portal can read but not write, and says so.
 *
 * The page renders the same family grammar as the rest of the portal (one answer, one
 * panel) and keeps the honest line short: the conversation is a demo record, not a live
 * messaging service, and the office phone is the action that always reaches a person.
 */
export default async function FamilyMessagesPage() {
  const session = await requirePortalSessionOrRedirect("family");

  if (portalForSession(session) !== "family") {
    return (
      <>
        <PageHeader
          eyebrow="Help"
          title="Messages"
          lead="Reading a family’s conversation as a staff preview."
        />
        <PageSection>
          <p className="text-sm text-muted">
            Open the Admin Inbox to reply. A family account is needed to write from this side.
          </p>
        </PageSection>
      </>
    );
  }

  const threadId = chatThreadIdFor("family", session.userId);
  const existing = await getChatThread(threadId);
  const thread =
    existing ??
    newThreadView({
      id: threadId,
      kind: "family",
      participant_id: session.userId,
      participant_name: session.displayName,
      subject: session.displayName,
      created_at: new Date().toISOString(),
    });

  return (
    <div className="dash">
      <Answer
        kicker="Help"
        headline="Messages"
        sub="Your conversation with the office."
        actions={<CallAction label={`Call ${FAMILY_HELP.phone}`} />}
      />
      <div className="dash-grid">
        <DashPanel role="neutral" className="dash-span-12" label="Messages" title="Your messages">
          <ChatView role="family" thread={thread} canSend />
        </DashPanel>
      </div>
    </div>
  );
}
