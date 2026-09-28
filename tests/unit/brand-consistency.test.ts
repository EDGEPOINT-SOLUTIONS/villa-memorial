import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { BRAND_NAME, brandTitle } from "@/lib/brand";
import { SITE_NAME } from "@/lib/seo";

/**
 * One brand name (client minute 2026-09-21, item 3). The review found "Villa Funeraria"
 * in three places beside a separately hardcoded "Villa Memorial" in the staff eyebrow, the
 * portal frames and the `(public)` fallback title, and no test pinning the header wordmark.
 * These cases make the brand a single constant and fail a page-title suffix that regresses
 * to the company's old name.
 *
 * "Villa Memorial PARK" (the place) and "Villa Memorial Plan" (the product) are legitimate
 * and are not matched here.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("one brand name", () => {
  it("SEO's site name IS the brand constant", () => {
    expect(SITE_NAME).toBe(BRAND_NAME);
  });

  it("brands a page title from the constant", () => {
    expect(brandTitle("Memorial lots")).toBe(`Memorial lots — ${BRAND_NAME}`);
  });

  it("no page-title suffix still uses the old company name", () => {
    // "— Villa Memorial Park" (the place) and "— Villa Memorial Plan" (the product) are
    // legitimate; only the bare company suffix is the defect.
    const oldSuffix = /\u2014 Villa Memorial(?! (Park|Plan))/;
    const offenders: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const file of sourceFiles(path.join(ROOT, dir))) {
        if (oldSuffix.test(readFileSync(file, "utf8"))) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the surfaces the review named read the ONE constant", () => {
    const surfaces = [
      "app/(public)/layout.tsx",
      "app/(staff)/staff/layout.tsx",
      "components/portal-frame.tsx",
      "lib/seo.ts",
    ];
    for (const file of surfaces) {
      expect(readFileSync(path.join(ROOT, file), "utf8"), file).toContain("BRAND_NAME");
    }
  });
});
