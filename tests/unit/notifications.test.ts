import { describe, expect, it } from "vitest";
import {
  loadNotificationCatalogue,
  notificationCatalogueFrom,
  notificationCatalogueFromFixture,
  toNotificationMessage,
  toNotificationTemplate,
} from "@/lib/api-client/notifications";
import notificationsFile from "@/lib/fixtures/operations/notifications.json";
import {
  audienceLabel,
  channelLabel,
  isNotificationAudience,
  isNotificationChannel,
  isNotificationLogState,
  NOTIFICATION_AUDIENCE_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_LOG_STATE_LABEL,
  NOTIFICATION_LOG_STATE_TONE,
  NOTIFICATION_SERVICE_NEEDS,
} from "@/lib/notifications";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * The notifications catalogue's pure answers and its reader: the audience/channel/log
 * vocabulary the screen prints, the labelled joins, the four things the service still
 * has to settle, and a reader that refuses an unknown audience/channel or a log entry
 * without a recorded send instant. The fixture itself never carries a fabricated send —
 * a test-only entry is how the log branch is proven.
 */

const RAW = notificationsFile as unknown as Record<string, unknown>;

const TEST_LOG_ENTRY = {
  id: "notif-log-test-1",
  template_id: "notif-booking-confirmation",
  message: "Booking confirmation",
  audience: "family",
  channel: "sms",
  state: "sent",
  sent_at: "2026-09-10T02:00:00Z",
};

describe("the notification vocabulary", () => {
  it("labels every audience, channel and log state the screen prints", () => {
    expect(Object.values(NOTIFICATION_AUDIENCE_LABEL)).toEqual(["Family", "Agent", "Staff"]);
    expect(Object.values(NOTIFICATION_CHANNEL_LABEL)).toEqual([
      "Email",
      "SMS",
      "Messenger",
      "Push",
      "In-app",
    ]);
    expect(Object.values(NOTIFICATION_LOG_STATE_LABEL)).toEqual([
      "Queued",
      "Sent",
      "Delivered",
      "Failed",
    ]);
    expect(NOTIFICATION_LOG_STATE_TONE.delivered).toBe("success");
    expect(NOTIFICATION_LOG_STATE_TONE.failed).toBe("danger");
  });

  it("guards the three vocabularies", () => {
    expect(isNotificationAudience("family")).toBe(true);
    expect(isNotificationAudience("client")).toBe(false);
    expect(isNotificationChannel("in_app")).toBe(true);
    expect(isNotificationChannel("whatsapp")).toBe(false);
    expect(isNotificationLogState("delivered")).toBe(true);
    expect(isNotificationLogState("opened")).toBe(false);
  });

  it("joins audiences and channels the way a row reads", () => {
    expect(audienceLabel(["family", "agent"])).toBe("Family · Agent");
    expect(channelLabel(["sms", "email"])).toBe("SMS · Email");
  });

  it("names the four things the notification service still has to settle", () => {
    expect(NOTIFICATION_SERVICE_NEEDS.map((need) => need.key)).toEqual([
      "templates",
      "rules",
      "delivery",
      "consent",
    ]);
    for (const need of NOTIFICATION_SERVICE_NEEDS) {
      expect(need.label).toBeTruthy();
      expect(need.detail).toBeTruthy();
    }
  });
});

describe("the catalogue reader", () => {
  it("serves the designed catalogue with an empty log", async () => {
    const catalogue = await loadNotificationCatalogue();
    expect(catalogue.service_state).toBe("not_wired");
    expect(catalogue.templates).toHaveLength(4);
    expect(catalogue.log).toEqual([]);
  });

  it("validates one recorded message when a service finally records one", () => {
    const catalogue = notificationCatalogueFrom({ ...RAW, log: [TEST_LOG_ENTRY] });
    expect(catalogue.log).toHaveLength(1);
    expect(catalogue.log[0]).toMatchObject({ audience: "family", channel: "sms", state: "sent" });
  });

  it("refuses an unknown audience, channel or log state", () => {
    expect(() =>
      toNotificationTemplate({
        id: "t",
        message: "M",
        event: "E",
        when: "W",
        audiences: ["client"],
        channels: ["sms"],
      }),
    ).toThrow(ApiError);
    expect(() => toNotificationMessage({ ...TEST_LOG_ENTRY, channel: "whatsapp" })).toThrow(ApiError);
    expect(() => toNotificationMessage({ ...TEST_LOG_ENTRY, state: "opened" })).toThrow(ApiError);
  });

  it("refuses a message with no recorded send instant", () => {
    expect(() => toNotificationMessage({ ...TEST_LOG_ENTRY, sent_at: "yesterday" })).toThrow(
      /malformed notification message/,
    );
    expect(() => toNotificationMessage({ ...TEST_LOG_ENTRY, sent_at: undefined })).toThrow(ApiError);
  });

  it("keeps the fixture's state honest", () => {
    const catalogue = notificationCatalogueFromFixture();
    expect(catalogue.service_state).toBe("not_wired");
    expect(catalogue.log).toEqual([]);
  });
});
