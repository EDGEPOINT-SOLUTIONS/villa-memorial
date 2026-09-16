import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_PORTAL_NAV,
  asSingleGroup,
  FAMILY_MORE_NAV,
  FAMILY_PORTAL_NAV,
  FAMILY_PORTAL_TABS,
  FAMILY_PRIMARY_NAV,
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

describe("family portal navigation (approved redesign)", () => {
  it("puts six plain names in the bar, in the family's reading order", () => {
    expect(FAMILY_PRIMARY_NAV.map((item) => item.label)).toEqual([
      "Home",
      "The funeral",
      "Payments",
      "Papers",
      "Remembering",
      "Your details",
    ]);
  });

  it("keeps every remaining page behind More, each with one plain line", () => {
    expect(FAMILY_MORE_NAV.map((item) => item.label)).toEqual([
      "Help and requests",
      "Ask for a visit",
      "Your plan",
      "Your lot",
      "Family and access",
      "What we tell you about",
      "Privacy Center",
    ]);
    for (const item of FAMILY_MORE_NAV) {
      expect(item.detail.length, `${item.label} needs a plain line`).toBeGreaterThan(8);
    }
  });

  it("uses no staff nouns and no ledger words in the bar", () => {
    const labels = FAMILY_PORTAL_NAV.map((item) => item.label).join(" ");
    expect(labels).not.toContain("Case");
    expect(labels).not.toContain("My Funeral");
    expect(labels).not.toContain("My Lots");
    expect(labels).not.toContain("Documents");
  });

  it("keeps the routes the app already serves", () => {
    for (const item of FAMILY_PORTAL_NAV) {
      expect(item.to.startsWith("/client/")).toBe(true);
    }
    const routes = FAMILY_PORTAL_NAV.map((item) => item.to);
    expect(routes).toContain("/client/dashboard");
    expect(routes).toContain("/client/documents");
    expect(routes).toContain("/client/privacy");
  });

  it("has a real page behind every entry", () => {
    for (const item of FAMILY_PORTAL_NAV) {
      expect(routeExists(item.to), `${item.label} (${item.to}) has no page`).toBe(true);
    }
  });

  it("pins four destinations plus More on a phone, in priority order", () => {
    expect(FAMILY_PORTAL_TABS.map((tab) => tab.label)).toEqual([
      "Home",
      "Funeral",
      "Payments",
      "Papers",
      "More",
    ]);
    expect(FAMILY_PORTAL_TABS.filter((tab) => !tab.more)).toHaveLength(4);
    const more = FAMILY_PORTAL_TABS.find((tab) => tab.more);
    expect(more?.to).toBe("");
    for (const tab of FAMILY_PORTAL_TABS.filter((t) => !t.more)) {
      expect(FAMILY_PORTAL_NAV.map((item) => item.to)).toContain(tab.to);
    }
  });

  it("renders one unnamed group for a portal without grouping (agent)", () => {
    const groups = asSingleGroup(AGENT_PORTAL_NAV);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("");
    expect(groups[0].items).toHaveLength(AGENT_PORTAL_NAV.length);
  });
});
