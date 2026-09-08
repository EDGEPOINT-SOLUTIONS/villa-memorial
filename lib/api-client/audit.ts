/**
 * Typed data access for the Audit trail surface.
 *
 * Shape mirrors audit's `GET /audit/api/v1/events` (index response) and the frozen
 * audit-event-types-v1 contract (KEB-D1-03): append-only entries keyed by
 * `action = {resource}.{verb}` with an outcome of succeeded|denied|failed.
 *
 * Live mode: AUDIT_BASE_URL set → `${AUDIT_BASE_URL}/audit/api/v1/events?…` through
 * the edge gateway with the staff session. Unset → recorded fixtures.
 */
import eventsFile from "@/lib/fixtures/audit/events.json";
import { ApiError } from "@/lib/api-client/api-error";
import { getAuthedJson, itemsOf } from "@/lib/api-client/staff-fetch";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "";

export function auditLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type AuditOutcome = "succeeded" | "denied" | "failed";

export type AuditEvent = {
  id: string;
  actor_user_id: string;
  action: string; // {resource}.{verb} from the frozen registry
  resource_type: string;
  resource_id: string;
  outcome: AuditOutcome;
  occurred_at: string; // ISO8601 UTC
  correlation_id: string | null;
};

export type AuditFilter = {
  outcome?: AuditOutcome;
  action?: string;
  resource_type?: string;
  limit?: number;
};

/** Tolerant reader: extra fields ignored, critical missing ones → 502. */
function toAuditEvent(raw: unknown): AuditEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed audit event", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.action !== "string") {
    throw new ApiError("malformed audit event", 502);
  }
  return {
    id: r.id,
    actor_user_id: String(r.actor_user_id ?? ""),
    action: r.action,
    resource_type: String(r.resource_type ?? ""),
    resource_id: String(r.resource_id ?? ""),
    outcome: (r.outcome as AuditOutcome) ?? "succeeded",
    occurred_at: String(r.occurred_at ?? ""),
    correlation_id: typeof r.correlation_id === "string" ? r.correlation_id : null,
  };
}

export async function listAuditEvents(filter: AuditFilter = {}): Promise<AuditEvent[]> {
  if (auditLiveModeEnabled()) {
    // The audit API filters by action/resource_type/resource_id/limit — outcome is a
    // display convention here (like billing aging), so outcome filtering happens below
    // in the presentation layer on the loaded page.
    const params = new URLSearchParams();
    if (filter.action) params.set("action", filter.action);
    if (filter.resource_type) params.set("resource_type", filter.resource_type);
    if (filter.limit) params.set("limit", String(filter.limit));
    const qs = params.toString();
    const payload = await getAuthedJson(
      BASE_URL,
      `/audit/api/v1/events${qs ? `?${qs}` : ""}`,
    );
    let items = itemsOf(payload).map(toAuditEvent);
    if (filter.outcome) items = items.filter((e) => e.outcome === filter.outcome);
    return items;
  }

  let items = (eventsFile as { events: unknown[] }).events;
  if (filter.outcome) items = items.filter((e) => (e as { outcome?: string }).outcome === filter.outcome);
  if (filter.action) items = items.filter((e) => (e as { action?: string }).action === filter.action);
  if (filter.resource_type) {
    items = items.filter((e) => (e as { resource_type?: string }).resource_type === filter.resource_type);
  }
  if (filter.limit) items = items.slice(0, filter.limit);
  return items.map(toAuditEvent);
}
