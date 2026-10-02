import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allStaffForms } from "@/lib/staff-forms";

/**
 * The Forms hub's register (`lib/staff-forms.ts`) — the captain's "every form ...
 * one place". A listed form whose page does not exist would be a dead link on the
 * one screen built to end them, so every entry is walked against the app router.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PUBLIC_PREFIXES = ["/contact", "/appointments", "/quote"];

function pageFile(href: string): string {
  const clean = href.split("?")[0];
  if (PUBLIC_PREFIXES.includes(clean)) {
    const rel = clean === "/" ? "" : clean.slice(1);
    return path.join(ROOT, "app", "(public)", rel, "page.tsx");
  }
  const rel = clean.replace(/^\/staff\//, "");
  return path.join(ROOT, "app", "(staff)", "staff", rel, "page.tsx");
}

describe("the forms register", () => {
  it("points every entry at a page that exists", () => {
    const forms = allStaffForms();
    expect(forms.length).toBeGreaterThanOrEqual(12);
    const missing = forms
      .map((form) => ({ form, file: pageFile(form.href) }))
      .filter(({ file }) => !existsSync(file))
      .map(({ form, file }) => `${form.key} → ${form.href} (${path.relative(ROOT, file)})`);
    expect(missing, "a Forms hub entry pointed at a route with no page").toEqual([]);
  });

  it("names every form once, with a real status", () => {
    const forms = allStaffForms();
    const keys = forms.map((form) => form.key);
    expect(new Set(keys).size).toBe(keys.length);
    const statuses = new Set(forms.map((form) => form.status));
    for (const status of statuses) {
      expect(["working", "waits", "public", "contextual"]).toContain(status);
    }
    // At least the captain's named forms are present.
    for (const key of ["inquiry", "case", "membership", "payment", "provisional_receipt"]) {
      expect(keys, `missing the ${key} form`).toContain(key);
    }
  });
});
