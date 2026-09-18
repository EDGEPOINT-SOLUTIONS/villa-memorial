import { describe, expect, it } from "vitest";
import { leadFirstName, leadFollowOns, stageBadgeTone, stageMeta, stageTrail } from "@/lib/crm/lead-view";

/**
 * The staff lead record's own presentation policy (pure, no rendering):
 *   · the pipeline vocabulary is the agent record's own (one home), and
 *   · the office's next step per interest opens the form the office really uses.
 */
describe("staff lead record view policy", () => {
  it("shares the agent pipeline's stage words and order, not a second vocabulary", () => {
    expect(stageMeta("qualified").label).toBe("Qualified");
    expect(stageMeta("presentation").label).toBe("Meeting planned");
    const trail = stageTrail("contacted");
    expect(trail.map((step) => step.label)).toEqual([
      "New",
      "Contacted",
      "Qualified",
      "Meeting planned",
      "Ready to close",
      "Reserved",
      "Sold",
    ]);
    expect(trail.find((step) => step.current)?.stage).toBe("contacted");
    // An unknown stage is not placed on the PRD line — it shows as itself.
    expect(stageTrail("nurture")).toEqual([
      { stage: "nurture", label: "nurture", reached: true, current: true },
    ]);
  });

  it("gives every stage a badge tone — the badge always carries the stage word too", () => {
    expect(stageBadgeTone("new")).toBe("neutral");
    expect(stageBadgeTone("contacted")).toBe("info");
    expect(stageBadgeTone("qualified")).toBe("warning");
    expect(stageBadgeTone("proposal")).toBe("accent");
    expect(stageBadgeTone("sold")).toBe("success");
    expect(stageBadgeTone("unknown")).toBe("neutral");
  });

  it("sends each interest to the office's own next-step screen", () => {
    expect(leadFollowOns({ interest: "plan" })[0]).toMatchObject({
      href: "/staff/plans/membership/new",
    });
    expect(leadFollowOns({ interest: "lot" })[0]).toMatchObject({ href: "/staff/property" });
    expect(leadFollowOns({ interest: "services" })[0]).toMatchObject({ href: "/staff/cases/new" });
  });

  it("uses the person's first name for the contact action", () => {
    expect(leadFirstName("Cecilia Ramos")).toBe("Cecilia");
    expect(leadFirstName("  Boyet Salazar ")).toBe("Boyet");
  });
});
