import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_PORTAL_NAV,
  asSingleGroup,
  FAMILY_PORTAL_GROUPS,
  FAMILY_PORTAL_NAV,
  FAMILY_PORTAL_TABS,
} from "@/components/portal-nav";

const APP = path.resolve(__dirname, "..", "..", "app");

/** Every nav destination must exist as a page — a dead rail entry is a bug. */
function routeExists(to: string): boolean {
  const segments = to.replace(/^\//, "").split("/");
  const routeDirs = [
    path.join(APP, "(family)", ...segments.slice(0, -1).concat(segments.slice(-1))),
    path.join(APP, "(family)", ...segments),
  ];
  return routeDirs.some((dir) => fs.existsSync(path.join(dir, "page.tsx")));
}

describe("family portal navigation (approved design)", () => {
  it("groups the pages in the design's order", () => {
    expect(FAMILY_PORTAL_GROUPS.map((g) => g.label)).toEqual([
      "",
      "Our arrangement",
      "Money & papers",
      "Remembering",
      "Getting help",
      "Our family & privacy",
    ]);
  });

  it("uses the family's words, never the staff nouns", () => {
    const labels = FAMILY_PORTAL_NAV.map((item) => item.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("Funeral case");
    expect(labels).toContain("Memorial property");
    expect(labels).not.toContain("My Funeral Cases");
    expect(labels).not.toContain("My Memorial Property");
    expect(labels).not.toContain("My Lots");
  });

  it("keeps the routes the app already serves", () => {
    for (const item of FAMILY_PORTAL_NAV) {
      expect(item.to.startsWith("/client/")).toBe(true);
    }
    expect(FAMILY_PORTAL_NAV.map((i) => i.to)).toContain("/client/dashboard");
    expect(FAMILY_PORTAL_NAV.map((i) => i.to)).toContain("/client/privacy");
  });

  it("has a real page behind every rail entry", () => {
    for (const item of FAMILY_PORTAL_NAV) {
      expect(routeExists(item.to), `${item.label} (${item.to}) has no page`).toBe(true);
    }
  });

  it("pins four destinations plus More on a phone, in priority order", () => {
    expect(FAMILY_PORTAL_TABS.map((t) => t.label)).toEqual([
      "Home",
      "Case",
      "Payments",
      "Help",
      "More",
    ]);
    expect(FAMILY_PORTAL_TABS.filter((t) => !t.more)).toHaveLength(4);
    const more = FAMILY_PORTAL_TABS.find((t) => t.more);
    expect(more?.to).toBe("");
    for (const tab of FAMILY_PORTAL_TABS.filter((t) => !t.more)) {
      expect(FAMILY_PORTAL_NAV.map((i) => i.to)).toContain(tab.to);
    }
  });

  it("renders one unnamed group for a portal without grouping (agent)", () => {
    const groups = asSingleGroup(AGENT_PORTAL_NAV);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("");
    expect(groups[0].items).toHaveLength(AGENT_PORTAL_NAV.length);
  });
});
