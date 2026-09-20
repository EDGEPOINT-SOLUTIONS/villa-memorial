/**
 * Typed read for the staff notifications screen (`/staff/notifications`).
 *
 * ⚠ PROVISIONAL — the platform's notification service is P4
 * (`docs/02-architecture/microservices.md:39`: templates, rules, delivery logs,
 * consent) and does not exist in this build; no notification contract is frozen and
 * there is no `NOTIFICATIONS_BASE_URL` to read one from. The screen therefore serves
 * the designed catalogue in `lib/fixtures/operations/notifications.json`, whose
 * `service_state` is `not_wired` and whose `log` is EMPTY: nothing has been sent, and
 * this reader never invents a message to make the page look alive.
 *
 * The reader is a tolerant reader (repo rule): field by field, extra keys ignored, a
 * malformed record is a 502, never a cast.
 */
import notificationsFile from "@/lib/fixtures/operations/notifications.json";
import { ApiError } from "@/lib/api-client/api-error";
import {
  isNotificationAudience,
  isNotificationChannel,
  isNotificationLogState,
  type NotificationCatalogue,
  type NotificationMessage,
  type NotificationTemplate,
} from "@/lib/notifications";

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

export function toNotificationTemplate(raw: unknown): NotificationTemplate {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed notification template", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const message = text(r.message);
  const event = text(r.event);
  const when = text(r.when);
  const audiences = Array.isArray(r.audiences) ? r.audiences : [];
  const channels = Array.isArray(r.channels) ? r.channels : [];
  if (!id || !message || !event || !when) {
    throw new ApiError("malformed notification template", 502);
  }
  if (
    audiences.length === 0 ||
    !audiences.every(isNotificationAudience) ||
    channels.length === 0 ||
    !channels.every(isNotificationChannel)
  ) {
    throw new ApiError(`malformed notification template ${id}: audience or channel is not recorded`, 502);
  }
  return { id, message, event, when, audiences, channels };
}

export function toNotificationMessage(raw: unknown): NotificationMessage {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed notification message", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const templateId = text(r.template_id);
  const message = text(r.message);
  const sentAt = text(r.sent_at);
  if (
    !id ||
    !templateId ||
    !message ||
    !sentAt ||
    Number.isNaN(Date.parse(sentAt)) ||
    !isNotificationAudience(r.audience) ||
    !isNotificationChannel(r.channel) ||
    !isNotificationLogState(r.state)
  ) {
    throw new ApiError("malformed notification message", 502);
  }
  return {
    id,
    template_id: templateId,
    message,
    audience: r.audience,
    channel: r.channel,
    state: r.state,
    sent_at: sentAt,
  };
}

/** The recorded catalogue, validated. Synchronous so tests can call it directly. */
export function notificationCatalogueFromFixture(): NotificationCatalogue {
  return notificationCatalogueFrom(notificationsFile);
}

/** The same validation over any recorded store — the seam the reader's tests use. */
export function notificationCatalogueFrom(store: unknown): NotificationCatalogue {
  const record = store as Record<string, unknown> | null;
  const serviceState = record?.service_state === "wired" ? "wired" : "not_wired";
  const templates = (Array.isArray(record?.templates) ? record.templates : []).map(
    toNotificationTemplate,
  );
  const log = (Array.isArray(record?.log) ? record.log : []).map(toNotificationMessage);
  return { service_state: serviceState, templates, log };
}

/** What the page calls. There is no live branch: no service has a contract to read. */
export async function loadNotificationCatalogue(): Promise<NotificationCatalogue> {
  return notificationCatalogueFromFixture();
}
