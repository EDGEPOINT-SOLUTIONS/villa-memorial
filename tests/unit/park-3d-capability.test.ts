import { describe, expect, it } from "vitest";
import { PLOT_EDIT_SCOPES, canEditPlots } from "@/lib/park-3d/capability";

/**
 * Plotting is ADMIN ONLY (spec §3, captain 2026-09-16).
 *
 * One capability flag, derived from the session scopes the page reads from the
 * httpOnly cookies: a customer sees the map and the lots, can inspect and select,
 * and gets no plotting tools in either mode. These tests pin the boundary so a
 * later change cannot quietly open editing to everyone.
 */
describe("who may plot", () => {
  it("refuses signed-out visitors, empty scopes and unknown shapes", () => {
    expect(canEditPlots(null)).toBe(false);
    expect(canEditPlots(undefined)).toBe(false);
    expect(canEditPlots([])).toBe(false);
    expect(canEditPlots(["catalog:read", "property:read", "orders:read"])).toBe(false);
    expect(canEditPlots(["hr:read", "documents:read"])).toBe(false);
  });

  it("allows a staff member holding the property edit scope", () => {
    expect(canEditPlots(PLOT_EDIT_SCOPES)).toBe(true);
    expect(canEditPlots(["property:read", "property:write"])).toBe(true);
    expect(canEditPlots(["property:write", "catalog:read"])).toBe(true);
  });

  it("does not leak the capability from look-alike scopes", () => {
    expect(canEditPlots(["property:write-all"])).toBe(false);
    expect(canEditPlots(["property:rw"])).toBe(false);
    expect(canEditPlots(["write"])).toBe(false);
  });
});
