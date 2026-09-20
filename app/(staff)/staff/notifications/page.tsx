import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
 */
function TemplateTable({ catalogue }: { catalogue: NotificationCatalogue }) {
  const notWired = catalogue.service_state === "not_wired";
  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table">
        <caption>
          The messages the product is designed to send — described, not configured.
        </caption>
        <thead>
          <tr>
            <th scope="col">Message</th>
            <th scope="col">Trigger</th>
            <th scope="col">When</th>
            <th scope="col">Goes to</th>
            <th scope="col">Channel</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          {catalogue.templates.map((template) => (
            <tr key={template.id}>
              <td>
                <strong>{template.message}</strong>
              </td>
              <td className="text-sm">{template.event}</td>
              <td className="text-sm">{template.when}</td>
              <td>{audienceLabel(template.audiences)}</td>
              <td className="text-sm">{channelLabel(template.channels)}</td>
              <td>
                {notWired ? (
                  <Badge tone="warning">Not switched on</Badge>
                ) : (
                  <Badge tone="success">Ready</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        actions={<Badge tone="warning">{notWired ? "Not switched on" : "Connected"}</Badge>}
      />

      <PageSection>
        <p className="ops-lead">What the office tells people, and what has actually gone out.</p>
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
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Sent</span>
              <span className="kpi-card__value">{sent}</span>
              <span className="kpi-card__sub">recorded messages</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Designed messages</span>
              <span className="kpi-card__value">{catalogue.templates.length}</span>
              <span className="kpi-card__sub">waiting on the service</span>
            </span>
          </span>
          <span className="card kpi-card">
            <span className="kpi-card__body">
              <span className="kpi-card__label">Service</span>
              <span className="kpi-card__value">{notWired ? "Off" : "On"}</span>
              <span className="kpi-card__sub">
                {notWired ? "no notification contract is frozen" : "notification service connected"}
              </span>
            </span>
          </span>
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
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <caption>The recorded sends, newest first.</caption>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Message</th>
                      <th scope="col">To</th>
                      <th scope="col">Channel</th>
                      <th scope="col">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogue.log.map((message) => (
                      <tr key={message.id}>
                        <td className="text-sm">
                          {manilaDay(message.sent_at)} · {manilaTime(message.sent_at)}
                        </td>
                        <td>
                          <strong>{message.message}</strong>
                        </td>
                        <td>{audienceLabel([message.audience])}</td>
                        <td className="text-sm">{NOTIFICATION_CHANNEL_LABEL[message.channel]}</td>
                        <td>
                          <Badge tone={NOTIFICATION_LOG_STATE_TONE[message.state]}>
                            {NOTIFICATION_LOG_STATE_LABEL[message.state]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card
          header={
            <div className="row row--space row--wrap">
              <h2>What the notification service adds</h2>
              <Badge tone="warning">Waiting on the service</Badge>
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
