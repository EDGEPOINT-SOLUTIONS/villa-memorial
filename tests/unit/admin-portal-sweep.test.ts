/**
 * Admin Portal sweep — the regression home for the captain's 2026-09-25 UI/UX
 * renovation as it applies to every `/staff/*` screen.
 *
 * The foundation (PR #121) whitened the grounds product-wide and confined sky
 * to controls + the footer; `page-backgrounds.test.ts` pins that. This file
 * pins the Admin Portal's half of the sweep, which is about CONSISTENCY and the
 * "sharp, human-made, never an AI template" finish:
 *
 *   1. every staff route's loading and error state renders through the ONE
 *      shared primitive (`PageLoading` / `PageError`), not a re-derived block;
 *   2. every staff page keeps the shared chrome (a `PageHeader`, directly or
 *      through `gatedSectionPage`) — or is a redirect with no page of its own;
 *   3. staff sources carry no raw colour literal (tokens only);
 *   4. the staff content block paints no gradient and no hover lift (the
 *      sheen/lift tells the button pass already removed, applied consistently);
 *   5. the loading placeholder rides the neutral granite ladder, not the brand
 *      blue — a white-ground screen must not flash a tint while it loads.
 *
 * Declaration-level on purpose: vitest runs in `node`, so this fails on the
 * exact declaration that regressed and cannot be satisfied by a view's stray
 * class. Measurements live in the PR; see
 * `docs/08-delivery/admin-portal-sweep-design/README.md`.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  allStyles,
  parseCss,
  readSource,
  selectors,
  staticClassNameTokens,
  type CssRule,
} from "../helpers/css-rules";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STAFF_APP = path.join(ROOT, "app/(staff)");

/** Every `.ts`/`.tsx` under the staff route group, as relative paths. */
function staffSources(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      if (!/\.tsx?$/.test(entry)) return [];
      return [path.relative(ROOT, full).replace(/\\/g, "/")];
    });
  return walk(STAFF_APP);
}

const STAFF_FILES = staffSources();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const byName = (suffix: string) => STAFF_FILES.filter((f) => f.endsWith(suffix));

const STAFF_CSS = parseCss(readSource("styles/components.css"));

describe("every Admin Portal route state renders through the shared primitive", () => {
  it("every loading.tsx renders PageLoading", () => {
    const files = byName("/loading.tsx");
    expect(files.length).toBeGreaterThanOrEqual(20);
    const offenders = files.filter(
      (f) => !read(f).includes('from "@/components/ui/page-loading"') || !read(f).includes("<PageLoading"),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every error.tsx renders PageError", () => {
    const files = byName("/error.tsx");
    expect(files.length).toBeGreaterThanOrEqual(15);
    const offenders = files.filter(
      (f) => !read(f).includes('from "@/components/ui/page-error"') || !read(f).includes("<PageError"),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("every Admin Portal page keeps the shared chrome", () => {
  it("each staff page renders a PageHeader, uses gatedSectionPage, or redirects", () => {
    const offenders = byName("/page.tsx").filter((f) => {
      const source = read(f);
      return !(
        source.includes("PageHeader") ||
        source.includes("gatedSectionPage") ||
        /redirect\(/.test(source)
      );
    });
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("Admin Portal feedback renders through the shared primitives", () => {
  it("hand-rolls neither an alert nor an empty state", () => {
    const offenders = STAFF_FILES.filter((file) =>
      /className="(alert|empty-state)\b/.test(read(file)),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("Admin Portal sources are tokens-only", () => {
  it("carries no raw hex / rgb() / hsl() colour literal", () => {
    const RAW = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
    const offenders: string[] = [];
    for (const file of STAFF_FILES) {
      for (const [index, line] of read(file).split("\n").entries()) {
        if (RAW.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("no Admin Portal class is referenced without a definition", () => {
  it("every static className token in app/(staff) has a matching rule", () => {
    const entries = STAFF_FILES.map((file) => ({ file, source: read(file) }));
    const tokens = staticClassNameTokens(entries);
    const css = allStyles();
    const defined = new Set(
      [...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]),
    );
    // A BEM namespace root with styled children/modifiers (`.paper-view` owning
    // `.paper-view__toolbar`) is a legitimate hook with no rule of its own; only
    // a token with neither a rule nor a styled descendant is a dead reference.
    const namespaces = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][\w-]*?)__/g)) namespaces.add(m[1]);
    for (const m of css.matchAll(/\.([A-Za-z_][\w-]*?)--/g)) namespaces.add(m[1]);
    const offenders = [...tokens.keys()]
      .filter((t) => !defined.has(t) && !namespaces.has(t))
      .sort();
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

describe("the staff content block is flat and sharp", () => {
  const appShellRules = (rules: CssRule[]) =>
    rules.filter((rule) => selectors(rule).some((s) => s.includes(".app-shell")));

  it("paints no gradient anywhere in the staff shell", () => {
    const offenders = appShellRules(STAFF_CSS)
      .filter((rule) => /gradient\(/.test(rule.body) || /--gold-hairline/.test(rule.body))
      .map((rule) => rule.selector);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("lifts nothing on hover (a tile steps its shadow, it does not float)", () => {
    const offenders = appShellRules(STAFF_CSS)
      .filter((rule) => /translateY\(/.test(rule.body))
      .map((rule) => rule.selector);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("keeps the base KPI tile flat too (the kit StatCard's own grammar)", () => {
    const kpiHover = STAFF_CSS.find((r) => r.selector === ".kpi-card:hover");
    expect(kpiHover, ".kpi-card:hover exists").toBeDefined();
    expect(kpiHover!.body).not.toMatch(/translateY\(/);
  });
});

describe("the loading placeholder is neutral, not brand blue", () => {
  it("rides the granite ladder", () => {
    const skeleton = STAFF_CSS.find((r) => r.selector === ".skeleton");
    expect(skeleton, ".skeleton exists").toBeDefined();
    expect(skeleton!.body).not.toMatch(/--navy-|--sky-/);
    expect(skeleton!.body).toMatch(/--granite-/);
  });
});
