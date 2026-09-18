/**
 * Pure view logic for the STAFF CRM lead record — no React, no I/O, unit-tested.
 *
 * The pipeline vocabulary itself has ONE home: `lib/agent/agent-view.ts`, the same
 * PRD stage words (commerce-catalog §33) the agent portal renders. This module
 * re-exports the shared parts and adds only the office-side presentation policy, so
 * the office and the agent can never describe a lead's stage, source or contact
 * kind differently.
 */
import type { CrmLead } from "@/lib/api-client/crm-leads";

export {
  PIPELINE_STAGES,
  activityKindLabel,
  interestLabel,
  leadSourceLabel,
  manilaDay,
  manilaTime,
  stageMeta,
  stageTrail,
} from "@/lib/agent/agent-view";
export type { StageMeta, StageStep } from "@/lib/agent/agent-view";

/**
 * The one line that names what this record waits on. Enquiry persistence,
 * customer sync and lead assignment are the customer-records service's job;
 * the record itself is the office's read-only demo file.
 */
export const LEAD_RECORD_SERVICE_NOTE =
  "Enquiry persistence, customer sync and lead assignment wait on the customer-records service.";

type BadgeTone = "neutral" | "info" | "warning" | "success" | "accent";

/** A stage's badge tone. The badge always carries the stage word too — colour alone never means anything. */
export function stageBadgeTone(stage: string): BadgeTone {
  switch (stage) {
    case "contacted":
      return "info";
    case "qualified":
      return "warning";
    case "presentation":
      return "info";
    case "proposal":
      return "accent";
    case "reserved":
    case "sold":
      return "success";
    default:
      return "neutral";
  }
}

export type LeadFollowOn = {
  key: string;
  /** The office's own action, in the office's words. */
  label: string;
  /** The screen the action opens today. */
  href: string;
};

/**
 * Where this lead would go next in the office's real work: a services lead becomes
 * a case, a plan lead a membership application, a lot lead a reservation. The
 * office's own forms open today; carrying the lead's details into them waits on
 * the customer-records service — the hint on each say so rather than implying a
 * conversion the platform cannot do yet.
 */
export function leadFollowOns(lead: Pick<CrmLead, "interest">): LeadFollowOn[] {
  switch (lead.interest) {
    case "plan":
      return [
        {
          key: "membership",
          label: "Start a membership application",
          href: "/staff/plans/membership/new",
        },
      ];
    case "lot":
      return [{ key: "property", label: "Reserve a lot on the map", href: "/staff/property" }];
    default:
      return [{ key: "case", label: "Open a case", href: "/staff/cases/new" }];
  }
}

/** The name the contact buttons use — the person's own first name, never a title. */
export function leadFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
