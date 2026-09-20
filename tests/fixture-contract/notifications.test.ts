import { describe, expect, it } from "vitest";
import notificationsFile from "@/lib/fixtures/operations/notifications.json";
import {
  isNotificationAudience,
  isNotificationChannel,
  type NotificationTemplate,
} from "@/lib/notifications";

/**
 * The notifications fixture is the DESIGNED catalogue, and the one thing it may never
 * contain is a fabricated message: no notification service exists (P4 is unbuilt), so
 * the log is empty and this suite fails if anyone ever adds an entry to make the screen
 * look alive. What it does pin:
 *
 *   1. `service_state` is `not_wired` — the only honest state today;
 *   2. the four designed message types the captain named are present, each with a
 *      trigger, an audience and a channel from the blueprint's own lists;
 *   3. the log is EMPTY and carries no recipient details anywhere.
 */
const store = notificationsFile as unknown as {
  _provenance: { status?: string; note?: string[] | string };
  tenant_id: string;
  service_state: string;
  templates: NotificationTemplate[];
  log: unknown[];
};

const DESIGNED_MESSAGES = [
  "Booking confirmation",
  "Payment reminder",
  "Document-ready note",
  "Service reminder",
];

describe("the notification catalogue is designed, and nothing claims to have been sent", () => {
  it("records the unwired service state and an empty sent log", () => {
    expect(store._provenance).toBeTruthy();
    expect(store.service_state).toBe("not_wired");
    expect(store.log).toEqual([]);
  });

  it("carries the four designed message types", () => {
    expect(store.templates.map((template) => template.message).sort()).toEqual(
      [...DESIGNED_MESSAGES].sort(),
    );
    for (const template of store.templates) {
      expect(template.id).toBeTruthy();
      expect(template.event).toBeTruthy();
      expect(template.when).toBeTruthy();
      expect(template.audiences.length).toBeGreaterThan(0);
      expect(template.audiences.every(isNotificationAudience), template.id).toBe(true);
      expect(template.channels.length).toBeGreaterThan(0);
      expect(template.channels.every(isNotificationChannel), template.id).toBe(true);
    }
    expect(new Set(store.templates.map((template) => template.id)).size).toBe(
      store.templates.length,
    );
  });

  it("names every audience the screen prints and no recipient detail", () => {
    const audiences = new Set(store.templates.flatMap((template) => template.audiences));
    expect([...audiences].sort()).toEqual(["agent", "family", "staff"]);
    // No per-person data may hide in a template — there is no service to have sent it.
    const serialized = JSON.stringify(store.templates);
    expect(serialized).not.toMatch(/phone|recipient|@|address/i);
  });
});
