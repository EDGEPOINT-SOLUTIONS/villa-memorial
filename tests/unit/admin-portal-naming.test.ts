import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSource } from "../helpers/css-rules";

/**
 * The area is the ADMIN PORTAL (captain 2026-09-20): "the admin area calls
 * itself the Staff Portal". The word "staff" may still name PEOPLE (the staff
 * directory, staff roles, the `staff@vm.demo` persona); it must not name the
 * AREA — the sidebar, every page's metadata title, the sign-in door, the portal
 * switcher and the staff-authored document provenance all say Admin Portal.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STAFF_APP = path.join(ROOT, "app/(staff)");

/** Every `.tsx` under app/(staff), recursively. */
function staffSources(dir = STAFF_APP): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return staffSources(full);
    return entry.endsWith(".tsx") ? [full] : [];
  });
}

function relative(file: string): string {
  return path.relative(ROOT, file);
}

describe("the administrative area is named the Admin Portal", () => {
  it("no staff page or layout calls the area the Staff Portal", () => {
    const offenders = staffSources()
      .filter((file) => /Staff Portal|Staff portal|staff portal/.test(readFileSync(file, "utf8")))
      .map(relative);
    expect(offenders).toEqual([]);
  });

  it("the shell's brand title is Admin Portal and the metadata suffix is consistent", () => {
    expect(readSource("app/(staff)/staff/layout.tsx")).toContain('brandTitle="Admin Portal"');

    const titled = staffSources().filter((file) =>
      /title:\s*(?:"|`)[^"`]* — Admin Portal/.test(readFileSync(file, "utf8")),
    );
    // Every staff page carries the suffix; a mass revert to a mixed set fails here.
    expect(titled.length).toBeGreaterThan(50);
  });

  it("the sign-in door, the portal switcher and the document provenance say Admin", () => {
    const signIn = readSource("lib/sign-in.ts");
    expect(signIn).toContain('title: "Admin portal"');
    expect(signIn).toContain('portal: "admin"');
    expect(signIn).not.toMatch(/Staff portal|Staff ·/);

    const switcher = readSource("components/portal-switch.tsx");
    expect(switcher).toContain('href: "/staff/dashboard"');
    expect(switcher).not.toMatch(/label: "Staff"/);

    const billing = readSource("lib/api-client/billing-store.ts");
    expect(billing).not.toContain("Staff portal");
    expect(billing).toContain("Admin portal");
  });
});
