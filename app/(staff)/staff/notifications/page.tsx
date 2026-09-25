import {
  DataTable,
  EmptyState,
  StatCard,
  StatusChip,
  type DataTableColumn,
} from "@/components/kit";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { loadNotificationCatalogue } from "@/lib/api-client/notifications";
import { manilaDay, manilaTime } from "@/lib/agent/agent-view";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  audienceLabel,
  channelLabel,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_LOG_STATE_LABEL,
  NOTIFICATION_LOG_STATE_TONE,
  NOTIFICATION_SERVICE_NEEDS,
  NOTIFICATION_SERVICE_NOTE,
  type NotificationCatalogue,
  type NotificationMessage,
  type NotificationTemplate,
} from "@/lib/notifications";

export const metadata = { title: "Notifications — Admin Portal" };

/**
 * Staff Notifications (`/staff/notifications`, PRD S26, blueprint §41).
 *
 * What the office tells people and how, as a real screen: the four notification types the
 * product is designed to send (booking confirmation · payment reminder · document-ready
 * note · service reminder), each with its trigger, audience and channel, and the recorded
 * sent log. The platform's notification service is P4 and does not exist in this build —
 * nothing has been sent, so the log is empty and says what the service will send and why
 * it cannot yet. No placeholder message is fabricated to make the page look alive; the
 * family notifications page takes the same line.
 *
 * The catalogue is APP-AUTHORED (`lib/fixtures/operations/notifications.json`): the
 * blueprint's own audiences and channels, described and not configured. The screen is
 * read-only — sending is exactly what the service that does not exist would do.
 *
 * Layout renders through the component kit (`components/kit`) — both tables are
 * `DataTable`, the tiles `StatCard`, the state chips `StatusChip`.
 */

const TEMPLATE_COLUMNS: ReadonlyArray<DataTableColumn<NotificationTemplate>> = [
  { key: "message", header: "Message" },
  { key: "trigger", header: "Trigger", className: "text-sm" },
  { key: "when", header: "When", className: "text-sm" },
  { key: "audiences", header: "Goes to" },
  { key: "channels", header: "Channel", className: "text-sm" },
  { key: "state", header: "State" },
];

const LOG_COLUMNS: ReadonlyArray<DataTableColumn<NotificationMessage>> = [
  { key: "when", header: "When", className: "text-sm" },
  { key: "message", header: "Message" },
  { key: "audience", header: "To" },
  { key: "channel", header: "Channel", className: "text-sm" },
  { key: "state", header: "State" },
];

function TemplateTable({ catalogue }: { catalogue: NotificationCatalogue }) {
  const notWired = catalogue.service_state === "not_wired";
  return (
    <DataTable<NotificationTemplate>
      columns={TEMPLATE_COLUMNS}
      rows={catalogue.templates}
      rowKey={(template) => template.id}
      renderCell={(template, column) => {
        switch (column.key) {
          case "message":
            return <strong>{template.message}</strong>;
          case "trigger":
            return template.event;
          case "when":
            return template.when;
          case "audiences":
            return audienceLabel(template.audiences);
          case "channels":
            return channelLabel(template.channels);
          case "state":
            return notWired ? (
              <StatusChip tone="warning">Not switched on</StatusChip>
            ) : (
              <StatusChip tone="success">Ready</StatusChip>
            );
          default:
            return null;
        }
      }}
      caption={<>The messages the product is designed to send — described, not configured.</>}
      emptyTitle="No messages designed"
      emptyHint="Designed messages appear here as the notification service is scoped."
    />
  );
}

export default async function NotificationsPage() {
  const session = await requireSessionOrRedirect();
  // No frozen notification scope exists in rbac-scopes-v1; the screen reuses the
  // cases:read the nav entry already gates on, provisionally, until the notification
  // contract brings its own scope.
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Notifications" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let catalogue: NotificationCatalogue;
  try {
    catalogue = await loadNotificationCatalogue();
  } catch (error) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Notifications" />
        <PageSection>
          <ErrorState
            message={
              error instanceof ApiError
                ? error.message
                : "Unable to load the notification catalogue."
            }
          />
        </PageSection>
      </>
    );
  }

  const sent = catalogue.log.length;
  const notWired = catalogue.service_state === "not_wired";

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        lead="The message types the platform will send, and their audiences."
        actions={
          <StatusChip tone="warning">{notWired ? "Not switched on" : "Connected"}</StatusChip>
        }
      />

      <PageSection>
        <div className="row row--wrap">
          <a className="btn btn--primary" href="#what-will-send">
            What will be sent
          </a>
          <a className="btn btn--secondary" href="#sent-log">
            Sent log
          </a>
        </div>
        <p className="text-sm text-muted">{NOTIFICATION_SERVICE_NOTE}</p>
        <div className="kpi-grid">
          <StatCard label="Sent" value={sent} sub="recorded messages" />
          <StatCard
            label="Designed messages"
            value={catalogue.templates.length}
            sub="waiting on the service"
          />
          <StatCard
            label="Service"
            value={notWired ? "Off" : "On"}
            sub={
              notWired ? "no notification contract is frozen" : "notification service connected"
            }
          />
        </div>
      </PageSection>

      <PageSection>
        <div className="card" id="what-will-send">
          <div className="card__header row row--space row--wrap">
            <h2>What the product will send</h2>
            <span className="text-sm text-muted">
              {catalogue.templates.length} designed message
              {catalogue.templates.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="card__body">
            <TemplateTable catalogue={catalogue} />
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="card" id="sent-log">
          <div className="card__header row row--space row--wrap">
            <h2>Sent log</h2>
            <span className="text-sm text-muted">{sent} recorded</span>
          </div>
          <div className="card__body">
            {sent === 0 ? (
              <div className="stack-3">
                <EmptyState
                  title="Nothing has been sent yet"
                  hint="When the notification service is connected, every message will appear here with its recipient, channel and delivery state."
                />
                <p className="text-sm text-muted mb-0">
                  It cannot send today: no notification rule or event contract is frozen, and
                  the service exposes no outward API.
                </p>
              </div>
            ) : (
              <DataTable<NotificationMessage>
                columns={LOG_COLUMNS}
                rows={catalogue.log}
                rowKey={(message) => message.id}
                renderCell={(message, column) => {
                  switch (column.key) {
                    case "when":
                      return (
                        <>
                          {manilaDay(message.sent_at)} · {manilaTime(message.sent_at)}
                        </>
                      );
                    case "message":
                      return <strong>{message.message}</strong>;
                    case "audience":
                      return audienceLabel([message.audience]);
                    case "channel":
                      return NOTIFICATION_CHANNEL_LABEL[message.channel];
                    case "state":
                      return (
                        <StatusChip tone={NOTIFICATION_LOG_STATE_TONE[message.state]}>
                          {NOTIFICATION_LOG_STATE_LABEL[message.state]}
                        </StatusChip>
                      );
                    default:
                      return null;
                  }
                }}
                caption={<>The recorded sends, newest first.</>}
                emptyTitle="Nothing has been sent yet"
                emptyHint="Delivered and failed messages appear here once the service is connected."
              />
            )}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card
          header={
            <div className="row row--space row--wrap">
              <h2>What the notification service adds</h2>
              <StatusChip tone="warning">Waiting on the service</StatusChip>
            </div>
          }
        >
          <ul className="ops-list">
            {NOTIFICATION_SERVICE_NEEDS.map((need) => (
              <li key={need.key} className="ops-list__row">
                <span className="ops-list__label">{need.label}</span>
                <span className="text-sm text-muted">{need.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      </PageSection>
    </>
  );
}
