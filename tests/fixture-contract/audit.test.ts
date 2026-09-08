import { describe, expect, it } from "vitest";
import eventsFile from "@/lib/fixtures/audit/events.json";

/**
 * Fixture↔contract test: the audit fixture must keep matching the REAL audit
 * service `GET /events` response (audit-event-types-v1, KEB-D1-03): append-only
 * entries, action = {resource}.{verb}, outcome enum succeeded|denied|failed.
 */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ACTION_RE = /^[a-z_]+\.[a-z_]+$/;

describe("audit fixtures mirror the live contract", () => {
  it("events carry the frozen index field set", () => {
    const events = (eventsFile as { events: Array<Record<string, unknown>> }).events;
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(typeof e.id).toBe("string");
      expect(typeof e.actor_user_id).toBe("string");
      expect(String(e.action)).toMatch(ACTION_RE);
      expect(typeof e.resource_type).toBe("string");
      expect(typeof e.resource_id).toBe("string");
      expect(["succeeded", "denied", "failed"]).toContain(e.outcome);
      expect(String(e.occurred_at)).toMatch(ISO_RE);
      expect(e.correlation_id === null || typeof e.correlation_id === "string").toBe(true);
    }
  });

  it("records at least one entry per outcome a screen must render", () => {
    const events = (eventsFile as { events: Array<{ outcome: string }> }).events;
    expect(events.some((e) => e.outcome === "succeeded")).toBe(true);
    expect(events.some((e) => e.outcome === "denied")).toBe(true);
  });
});
