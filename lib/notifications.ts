/**
 * Notifications — the catalogue and the log, and the line that keeps them honest (PURE).
 *
 * `/staff/notifications` answers what the office tells people and how: the messages the
 * product is designed to send, to whom, through which channel, and what the recorded log
 * says actually went out. The platform's notification service is P4
 * (`docs/02-architecture/microservices.md:39`: templates, rules, delivery logs, consent)
 * and does not exist in this build — `not_wired` is the only service state this module
 * can describe, and the log is empty because nothing has been sent.
 *
 * The vocabulary is the blueprint's own (`docs/04-modules/documents-contracts.md`
 * §Notifications): audiences family · agent · staff, channels email · SMS ·
 * Messenger/approved messaging · push · in-app, and the four designed message types the
 * staff screen lists. Adding a template here is a product decision; adding a LOG ENTRY
 * anywhere is not possible without a service recording one — no placeholder message may
 * be fabricated to make the screen look alive.
 */

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const NOTIFICATION_AUDIENCES = ["family", "agent", "staff"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  family: "Family",
  agent: "Agent",
  staff: "Staff",
};

export const NOTIFICATION_CHANNELS = ["email", "sms", "messenger", "push", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  messenger: "Messenger",
  push: "Push",
  in_app: "In-app",
};

export const NOTIFICATION_LOG_STATES = ["queued", "sent", "delivered", "failed"] as const;
export type NotificationLogState = (typeof NOTIFICATION_LOG_STATES)[number];

export const NOTIFICATION_LOG_STATE_LABEL: Record<NotificationLogState, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
};

export const NOTIFICATION_LOG_STATE_TONE: Record<
  NotificationLogState,
  "info" | "success" | "danger"
> = {
  queued: "info",
  sent: "info",
  delivered: "success",
  failed: "danger",
};

/** The one line every surface on this screen stands on. */
export const NOTIFICATION_SERVICE_NOTE =
  "No notification service is connected — templates, event rules and delivery belong to the platform's notification service (P4).";

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type NotificationTemplate = {
  id: string;
  /** What the office calls it ("Booking confirmation"). */
  message: string;
  /** The recorded event that triggers it ("A chapel booking is recorded"). */
  event: string;
  /** When it would go, in the design's own words ("At booking"). */
  when: string;
  audiences: NotificationAudience[];
  channels: NotificationChannel[];
};

export type NotificationMessage = {
  id: string;
  template_id: string;
  message: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
  state: NotificationLogState;
  /** The instant the service recorded the send. */
  sent_at: string;
};

export type NotificationCatalogue = {
  /** "not_wired" until a notification service and contract exist. */
  service_state: "not_wired" | "wired";
  templates: NotificationTemplate[];
  log: NotificationMessage[];
};

/* ------------------------------------------------------------------ */
/* Guards + labels                                                     */
/* ------------------------------------------------------------------ */

export function isNotificationAudience(value: unknown): value is NotificationAudience {
  return typeof value === "string" && (NOTIFICATION_AUDIENCES as readonly string[]).includes(value);
}

export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === "string" && (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

export function isNotificationLogState(value: unknown): value is NotificationLogState {
  return typeof value === "string" && (NOTIFICATION_LOG_STATES as readonly string[]).includes(value);
}

export function audienceLabel(audiences: readonly NotificationAudience[]): string {
  return audiences.map((audience) => NOTIFICATION_AUDIENCE_LABEL[audience]).join(" · ");
}

export function channelLabel(channels: readonly NotificationChannel[]): string {
  return channels.map((channel) => NOTIFICATION_CHANNEL_LABEL[channel]).join(" · ");
}

/* ------------------------------------------------------------------ */
/* What the service adds (the empty state's answer)                    */
/* ------------------------------------------------------------------ */

export type NotificationServiceNeed = {
  key: string;
  label: string;
  detail: string;
};

/** The four things the notification service has to settle before this screen can list a send. */
export const NOTIFICATION_SERVICE_NEEDS: readonly NotificationServiceNeed[] = [
  {
    key: "templates",
    label: "Template management",
    detail: "The wording and channel of each message, configured per tenant.",
  },
  {
    key: "rules",
    label: "Event-driven rules",
    detail: "Which recorded event sends which message, and when.",
  },
  {
    key: "delivery",
    label: "Delivery log",
    detail: "The recipient, channel, time and delivery state of every send — the log this page shows.",
  },
  {
    key: "consent",
    label: "Consent",
    detail: "Marketing only with the family's consent; service messages follow the arrangement.",
  },
] as const;
