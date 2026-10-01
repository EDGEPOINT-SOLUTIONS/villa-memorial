import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FAMILY_COVERED_SCREENS,
  FAMILY_PRD_SCREENS,
  FAMILY_SUPPORTING_SCREENS,
} from "@/lib/family/portal-coverage";
import { FAMILY_PORTAL_NAV } from "@/components/portal-nav";

/**
 * The PRD's customer/family portal screen list
 * (in-memoriam `docs/04-modules/screen-inventory.md` §Customer/family portal),
 * pinned to the family portal that ships: every named screen has a route, the
 * route has a real page on disk, the family rail reaches it, and each row says
 * what is still missing for it to be fully real.
 */
const APP = path.resolve(__dirname, "..", "..", "app");

const PRD_SCREEN_NAMES = [
  "Customer Dashboard",
  "Family Dashboard",
  "My Plans",
  "My Lots",
  "My Payments",
  "My Documents",
  "My Memorials",
  "My Funeral Cases",
  "My Requests",
  "My Appointments",
  "Support/Ticket",
  "Privacy Center",
];

/** A family route is real when its page.tsx exists under app/(family). */
function pageFor(route: string): string | null {
  const file = path.join(APP, "(family)", ...route.replace(/^\//, "").split("/"), "page.tsx");
  return fs.existsSync(file) ? file : null;
}

describe("the PRD family screen list is fully covered", () => {
  it("names every screen exactly as the screen inventory does", () => {
    expect(FAMILY_PRD_SCREENS.map((screen) => screen.screen)).toEqual(PRD_SCREEN_NAMES);
  });

  it("gives every screen a family route with a real page", () => {
    for (const screen of FAMILY_COVERED_SCREENS) {
      expect(screen.route.startsWith("/client/"), `${screen.screen} must be a family route`).toBe(
        true,
      );
      expect(pageFor(screen.route), `${screen.screen} (${screen.route}) has no page`).not.toBeNull();
    }
  });

  it("reaches every covered route from the family rail", () => {
    const rail = new Set(FAMILY_PORTAL_NAV.map((item) => item.to));
    for (const screen of FAMILY_COVERED_SCREENS) {
      expect(rail.has(screen.route), `${screen.screen} (${screen.route}) is not in the rail`).toBe(
        true,
      );
    }
  });

  it("states the owning PRD module and what is still missing, per screen", () => {
    for (const screen of FAMILY_COVERED_SCREENS) {
      expect(screen.module.length, `${screen.screen} needs a PRD module`).toBeGreaterThan(3);
      expect(screen.missing.length, `${screen.screen} needs an honest 'missing' line`).toBeGreaterThan(
        20,
      );
    }
  });

  it("is honest about which screens are not switched on yet", () => {
    const honest = FAMILY_PRD_SCREENS.filter((screen) => screen.state === "honest").map(
      (screen) => screen.screen,
    );
    // Only the Privacy Center has no family-facing service behind it at all; the
    // funeral case now shows the office's own recorded arrangement (still provisional).
    expect(honest).toEqual(["Privacy Center"]);
    expect(FAMILY_SUPPORTING_SCREENS.map((screen) => screen.route)).toEqual([
      "/client/notifications",
      "/client/profile",
    ]);
  });

  it("records the four screens the captain approved building on 2026-09-18 as partial", () => {
    // Lots, memorials, requests and appointments now show the office's own recorded
    // record with named honest states; none of them is a designed-only page any more,
    // and none claims to be fully real while its contract is missing.
    const rebuilt = FAMILY_PRD_SCREENS.filter((screen) =>
      ["My Lots", "My Memorials", "My Requests", "My Appointments"].includes(screen.screen),
    );
    expect(rebuilt).toHaveLength(4);
    for (const screen of rebuilt) {
      expect(screen.state, `${screen.screen} must be record-backed now`).toBe("partial");
      expect(screen.missing, `${screen.screen} must still name its missing contract`).toMatch(
        /contract|service|projection/,
      );
    }
  });
});
