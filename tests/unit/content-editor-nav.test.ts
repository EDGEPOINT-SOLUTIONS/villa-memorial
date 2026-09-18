import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STAFF_NAV } from "@/lib/rbac/nav";

/**
 * One content editor (captain, 2026-09-18 — audit §7.1 G5). The old
 * "/staff/store" stub and its duplicate nav entry promised a second content
 * surface next to the real editor; the merge means:
 *  - exactly ONE staff nav entry opens the content editor (/staff/landing);
 *  - no nav item points at a page that does not exist (the store keeps a real
 *    page file that redirects, so a bookmarked URL never 404s).
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STAFF_DIR = path.join(ROOT, "app", "(staff)", "staff");

const redirectCalls = vi.hoisted(() => ({ hrefs: [] as string[] }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    redirectCalls.hrefs.push(href);
    // Next's redirect() unwinds the render by throwing.
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("the staff area has one content editor", () => {
  it("publishes /staff/landing once and no store-content duplicate", () => {
    const items = STAFF_NAV.flatMap((section) => section.items);
    const contentEditors = items.filter(
      (item) => item.href === "/staff/landing" || item.href === "/staff/store",
    );
    expect(contentEditors).toHaveLength(1);
    expect(contentEditors[0].href).toBe("/staff/landing");
    expect(contentEditors[0].label).toBe("Pages & content");
    expect(contentEditors[0].scopes).toEqual(["catalog:write"]);
  });

  it("keeps every nav destination backed by a real page file", () => {
    const missing = STAFF_NAV.flatMap((section) => section.items)
      .map((item) => path.join(STAFF_DIR, item.href.replace("/staff/", "")))
      .filter((dir) => !existsSync(path.join(dir, "page.tsx")));
    expect(missing).toEqual([]);
  });

  it("redirects the retired /staff/store URL to the real editor", async () => {
    const { default: StorePage } = await import("@/app/(staff)/staff/store/page");
    expect(() => StorePage()).toThrow("NEXT_REDIRECT");
    expect(redirectCalls.hrefs).toEqual(["/staff/landing"]);
  });

  it("the retired stub redirects instead of rendering a not-wired page", () => {
    const source = readFileSync(path.join(STAFF_DIR, "store", "page.tsx"), "utf8");
    expect(source).toContain('redirect("/staff/landing")');
    expect(source).not.toContain("gatedSectionPage");
    expect(source).not.toContain("NotWiredState");
  });
});
