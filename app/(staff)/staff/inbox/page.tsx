import Link from "next/link";
import { ChatThreadList } from "@/components/chat/chat-thread-list";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { StatCard, StatusChip } from "@/components/kit";
import { Badge } from "@/components/ui/badge";
import { NeedsYou } from "@/components/staff/needs-you";
import { ApiError } from "@/lib/api-client/api-error";
import { listChatThreads } from "@/lib/api-client/chat-store";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { CHAT_SERVICE_NOTE } from "@/lib/chat";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getDashboardSummary } from "@/lib/api-client/reporting";
import { listInquiries, type Inquiry } from "@/lib/api-client/crm";
import { listFixtureAdminOrders, type AdminOrder } from "@/lib/api-client/order-store";
import { loadWorkOrders, type WorkOrderList } from "@/lib/api-client/work-orders";
import { listFamilyRequests, type FamilyRequest } from "@/lib/api-client/family";
import { listDocuments, type Document } from "@/lib/api-client/documents";
import { loadNotificationCatalogue } from "@/lib/api-client/notifications";
import {
  NOTIFICATION_SERVICE_NOTE,
  audienceLabel,
  channelLabel,
  type NotificationCatalogue,
} from "@/lib/notifications";
import { buildNeedsYou } from "@/lib/staff-queue";

export const metadata = { title: "Inbox — Admin Portal" };
export const dynamic = "force-dynamic";

/**
 * The Admin Inbox (`/staff/inbox`) — the Today group's one triage surface.
 *
 * The board's Inbox is where the office starts: the durable family/agent ↔ office
 * conversations (the plan §9.6 chat, newest activity first, with the office's unread
 * count per thread) AND the cross-record queue that folds notifications, family
 * requests, inquiries, orders and payment notices into one typed list. The notification
 * catalogue is surfaced below, honestly: no notification service is connected, so the
 * message types show as designed and the sent log stays empty.
 *
 * `cases:read` gates the list, `cases:write` the send (the conversation page reads the
 * same pair). Both are provisional reuses while `rbac-scopes-v1` names no messaging
 * code. Every triage source is read independently for a session that could open its own
 * screen; a store that cannot be read contributes no rows rather than a guess.
 */

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

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

  const canSeeLots = hasAnyScope(session.scopes, ["property:read"]);
  const canSeeFinance = hasAnyScope(session.scopes, ["billing:read", "accounting:read"]);
  const canSeeOrders = hasAnyScope(session.scopes, ["orders:read"]);
  const canSeeDocuments = hasAnyScope(session.scopes, ["documents:read"]);

  const [summary, inquiries, orders, workOrders, familyRequests, documents, catalogue] =
    await Promise.all([
      canSeeFinance ? safe(getDashboardSummary(), null) : Promise.resolve(null),
      safe<Inquiry[]>(listInquiries(), []),
      canSeeOrders
        ? safe<AdminOrder[]>(listFixtureAdminOrders(), [])
        : Promise.resolve([] as AdminOrder[]),
      canSeeLots ? safe<WorkOrderList | null>(loadWorkOrders(), null) : Promise.resolve(null),
      safe<FamilyRequest[]>(listFamilyRequests(), []),
      canSeeDocuments
        ? safe<Document[]>(listDocuments(), [])
        : Promise.resolve([] as Document[]),
      safe<NotificationCatalogue | null>(loadNotificationCatalogue(), null),
    ]);

  const paymentAlerts = summary?.payment_alerts ?? null;
  const queue = buildNeedsYou({
    alerts: paymentAlerts,
    inquiries,
    orders,
    workOrders,
    familyRequests,
    documents,
  });
  const notWired = (catalogue?.service_state ?? "not_wired") === "not_wired";
  const templates = catalogue?.templates ?? [];
  const openRequests = familyRequests.filter((r) => r.state !== "done").length;

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Inbox"
        lead="Conversations with families and agents, and what needs the office today."
        actions={
          <Link className="btn btn--secondary btn--sm" href="/staff/notifications">
            Notifications
          </Link>
        }
      />

      <div className="kpi-grid">
        <StatCard label="Needs you" value={queue.length} sub="across every record" />
        <StatCard label="Family requests" value={openRequests} sub="still open" />
        <StatCard
          label="New inquiries"
          value={inquiries.filter((i) => i.status === "new").length}
          sub="unanswered"
        />
        <StatCard
          label="Designed notices"
          value={templates.length}
          sub={notWired ? "waiting on the service" : "connected"}
        />
      </div>

      <PageSection>
        <div className="row row--space row--wrap">
          <h2 className="page-section-title">Conversations</h2>
          <span className="text-sm text-muted">{threads.length} thread{threads.length === 1 ? "" : "s"}</span>
        </div>
        <p className="text-sm text-muted">{CHAT_SERVICE_NOTE}</p>
        <ChatThreadList threads={threads} />
      </PageSection>

      <PageSection>
        <div className="row row--space row--wrap">
          <h2 className="page-section-title">Needs you today</h2>
          <span className="text-sm text-muted">
            {queue.length} item{queue.length === 1 ? "" : "s"} typed by kind, newest need first
          </span>
        </div>
        <NeedsYou rows={queue} />
      </PageSection>

      <PageSection>
        <Card
          header={
            <div className="row row--space row--wrap">
              <h2>Notifications</h2>
              <StatusChip tone={notWired ? "warning" : "success"}>
                {notWired ? "Not switched on" : "Connected"}
              </StatusChip>
            </div>
          }
        >
          <p className="text-sm text-muted">{NOTIFICATION_SERVICE_NOTE}</p>
          <ul className="stack-2">
            {templates.map((template) => (
              <li key={template.id} className="row row--space row--wrap">
                <span>
                  <strong>{template.message}</strong>
                  <span className="text-sm text-muted"> · {template.event}</span>
                </span>
                <span className="row row--wrap">
                  <span className="text-sm text-muted">{audienceLabel(template.audiences)}</span>
                  <Badge tone="neutral">{channelLabel(template.channels)}</Badge>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 mb-0">
            <Link href="/staff/notifications" className="link-muted text-sm">
              Open the full catalogue and the sent log →
            </Link>
          </p>
        </Card>
      </PageSection>
    </>
  );
}
