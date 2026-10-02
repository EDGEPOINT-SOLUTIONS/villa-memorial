import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The paper PDF must render in the PRODUCTION image, not only in dev.
 *
 * `lib/export/pdf.ts` imports pdfkit, but Next bundles pdfkit's JavaScript into a
 * server chunk whose one runtime dependency the standalone tracer cannot see: the
 * chunk builds a `createRequire()` on `node_modules/pdfkit/js/pdfkit.node.mjs` and
 * then resolves its standard fonts through the package's `#standard-fonts/*` import
 * map. The package is therefore absent from `.next/standalone`, and both PDF export
 * routes (`/api/export/paper-pdf`, `/api/family/papers/receipt/*`) return 500 on a
 * plain production host while rendering fine in dev, where node_modules is on disk.
 *
 * This file guards the two things that keep the image honest:
 *   1. the `run` stage of the Dockerfile carries `node_modules/pdfkit` node-owned and
 *      asserts the standard fonts resolve (the build fails otherwise), and
 *   2. the package layout the bundled chunk relies on is really there — each
 *      `#standard-fonts/*` subpath resolves through `createRequire`, and each target
 *      file exists on disk, so a future pdfkit bump that relocates them fails here.
 *
 * Docker cannot run in this WSL distro, so the image build itself is verified on the
 * staging deploy; these assertions fail the test suite the moment the Dockerfile copy
 * is dropped.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DOCKERFILE = readFileSync(path.join(ROOT, "Dockerfile"), "utf8");

/** Split a Dockerfile into its `FROM … AS <name>` stages. */
function stages(dockerfile: string): Map<string, string> {
  const out = new Map<string, string>();
  let name = "(unnamed)";
  let lines: string[] = [];
  const flush = () => {
    if (lines.length > 0) out.set(name, lines.join("\n"));
  };
  for (const line of dockerfile.split("\n")) {
    const match = /^FROM\s+\S+(?:\s+AS\s+(\S+))?\s*$/i.exec(line.trim());
    if (match) {
      flush();
      name = match[1] ?? "(unnamed)";
      lines = [];
      continue;
    }
    lines.push(line);
  }
  flush();
  return out;
}

/** Join backslash continuations and drop comments, leaving one entry per instruction. */
function instructions(stage: string): string[] {
  const merged: string[] = [];
  let buffer = "";
  for (const raw of stage.split("\n")) {
    const line = raw.trimEnd();
    if (line.trimStart().startsWith("#")) continue;
    if (line.endsWith("\\")) {
      buffer += `${line.slice(0, -1)} `;
      continue;
    }
    buffer += line;
    if (buffer.trim() !== "") merged.push(buffer.trim());
    buffer = "";
  }
  if (buffer.trim() !== "") merged.push(buffer.trim());
  return merged;
}

/**
 * The standard-font subpaths pdfkit resolves at runtime. The list mirrors the loop in
 * pdfkit's bundled entry (`js/pdfkit.node.mjs`); the paper profiles use Times and
 * Helvetica, but all fourteen are cheap to pin and catch a package-layout move.
 */
const STANDARD_FONT_SUBPATHS = [
  "Courier",
  "CourierBold",
  "CourierBoldOblique",
  "CourierOblique",
  "Helvetica",
  "HelveticaBold",
  "HelveticaBoldOblique",
  "HelveticaOblique",
  "Symbol",
  "TimesBold",
  "TimesBoldItalic",
  "TimesItalic",
  "TimesRoman",
  "ZapfDingbats",
] as const;

describe("production image carries pdfkit", () => {
  const run = stages(DOCKERFILE).get("run");

  it("copies node_modules/pdfkit into the node-owned run stage", () => {
    expect(run, "the Dockerfile must declare a `run` stage").toBeDefined();
    const copy = instructions(run ?? "").find(
      (line) => /^COPY\b/i.test(line) && /node_modules\/pdfkit\b/.test(line),
    );
    expect(
      copy,
      "the run stage must COPY node_modules/pdfkit — the standalone tracer never sees it",
    ).toBeDefined();
    expect(copy).toMatch(/--from=deps\b/);
    expect(copy).toMatch(/--chown=node:node\b/);
    expect(copy).toMatch(/\/app\/node_modules\/pdfkit\b/);
    expect(copy).toMatch(/\.\/node_modules\/pdfkit\b/);
  });

  it("asserts the run stage resolves the standard fonts pdfkit asks for", () => {
    const guard = instructions(run ?? "").find(
      (line) => /^RUN\b/i.test(line) && /#standard-fonts/.test(line),
    );
    expect(
      guard,
      "the run stage must RUN a check that requires the #standard-fonts subpaths",
    ).toBeDefined();
    expect(guard).toMatch(/createRequire/);
  });
});

describe("pdfkit runtime files the standalone tracer cannot see", () => {
  it("resolves every standard-font subpath through createRequire", () => {
    const req = createRequire(path.join(ROOT, "node_modules/pdfkit/js/pdfkit.node.mjs"));
    for (const face of STANDARD_FONT_SUBPATHS) {
      const font = req(`#standard-fonts/${face}`) as { name?: string };
      expect(font, face).toBeTruthy();
      expect(typeof font.name, face).toBe("string");
    }
  });

  it("ships the package import map and the target .cjs files beside it", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(ROOT, "node_modules/pdfkit/package.json"), "utf8"),
    ) as { imports?: Record<string, string> };
    expect(pkg.imports?.["#standard-fonts/*"]).toBe("./js/standard-fonts/*.cjs");
    for (const face of STANDARD_FONT_SUBPATHS) {
      expect(
        existsSync(path.join(ROOT, "node_modules/pdfkit/js/standard-fonts", `${face}.cjs`)),
        `node_modules/pdfkit/js/standard-fonts/${face}.cjs`,
      ).toBe(true);
    }
  });
});

describe("GET /api/export/paper-pdf?document=general-price-list", () => {
  it("renders the public General Price List to a real PDF in Node", async () => {
    const { GET } = await import("@/app/api/export/paper-pdf/route");
    const response = await GET(
      new Request("http://localhost/api/export/paper-pdf?document=general-price-list"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("answers 404 for an unknown document", async () => {
    const { GET } = await import("@/app/api/export/paper-pdf/route");
    const response = await GET(
      new Request("http://localhost/api/export/paper-pdf?document=purchase"),
    );
    expect(response.status).toBe(404);
  });
});
