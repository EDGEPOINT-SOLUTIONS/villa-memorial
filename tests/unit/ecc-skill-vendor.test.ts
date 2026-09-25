/**
 * ECC vendored skills — the guard for the bounded, attributed ECC subset
 * (captain authorisation 2026-09-25, Option A of
 * `data/villa-ecc-adoption-plan/report.md`).
 *
 * ECC's plain-Markdown skills are vendored under ONE namespace,
 * `.agents/skills/ecc/`, as reference and audit material only. This file pins
 * that rule set:
 *   1. the namespace folder is self-contained and matches `manifest.json`;
 *   2. every vendored `SKILL.md` carries the MIT attribution, the pinned ECC
 *      commit and the "reference only, not a style authority" header line;
 *   3. each vendored file matches its manifest SHA-256;
 *   4. every skill is registered in `skills-lock.json` under the `ecc-` name;
 *   5. NO product style path (`app/`, `components/`, `lib/`, `styles/`)
 *      references the folder, so ECC can never become a style authority;
 *   6. the added Pi skill advertisement stays inside its byte budget.
 *
 * Deleting `.agents/skills/ecc/` (and this file + the lock entries) fully reverts
 * the vendor: nothing else in the repo refers to it.
 */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const NAMESPACE = path.join(ROOT, ".agents", "skills", "ecc");
const MANIFEST_PATH = path.join(NAMESPACE, "manifest.json");

const PINNED_COMMIT = "e482e579415fde18357cafce70f177ae19fd7f03";
const HEADER_LINE = "> **ECC reference only — not a style authority.**";
const BUDGET_BYTES = 4096;
const PRODUCT_DIRS = ["app", "components", "lib", "styles"] as const;

type ManifestSkill = {
  name: string;
  dir: string;
  eccPath: string;
  eccSha256: string;
  vendoredSha256: string;
  extraFiles?: string[];
};

type Manifest = {
  version: number;
  namespace: string;
  posture: string;
  source: { repo: string; url: string; commit: string; version: string; license: string; copyright: string };
  requiredHeaderLine: string;
  advertisementBudgetBytes: number;
  skills: ManifestSkill[];
};

function readManifest(): Manifest {
  expect(existsSync(MANIFEST_PATH), `${MANIFEST_PATH} must exist`).toBe(true);
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Frontmatter `name`/`description`; the vendored files keep a minimal block. */
function frontmatter(raw: string): { name?: string; description?: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---")) return {};
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = normalized.slice(4, end);
  const name = /^name:\s*(.+)$/m.exec(block)?.[1]?.trim();
  const descRaw = /^description:\s*(.+)$/m.exec(block)?.[1]?.trim();
  const description = descRaw?.startsWith('"') && descRaw.endsWith('"') ? descRaw.slice(1, -1) : descRaw;
  return { name, description };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Reproduce Pi's `formatSkillsForPrompt` (`dist/core/skills.js`) for the
 * vendored set, the way `data/villa-ecc-adoption-plan/report.md` §2.6 measures
 * the system-prompt advertisement: name + description + absolute location.
 */
function advertisementBytes(skills: { name: string; description: string; filePath: string }[]): number {
  const lines = [
    "\n\nThe following skills provide specialized instructions for specific tasks.",
    "Use the read tool to load a skill's file when the task matches its description.",
    "When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.",
    "",
    "<available_skills>",
  ];
  for (const skill of skills) {
    lines.push("  <skill>");
    lines.push(`    <name>${escapeXml(skill.name)}</name>`);
    lines.push(`    <description>${escapeXml(skill.description)}</description>`);
    lines.push(`    <location>${escapeXml(skill.filePath)}</location>`);
    lines.push("  </skill>");
  }
  lines.push("</available_skills>");
  return Buffer.byteLength(lines.join("\n"), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

describe("ECC vendored skills are namespaced, attributed and reference-only", () => {
  const manifest = readManifest();

  it("is one self-contained namespace matching manifest.json", () => {
    expect(manifest.namespace).toBe("ecc");
    expect(manifest.source.repo).toBe("affaan-m/ECC");
    expect(manifest.source.commit).toBe(PINNED_COMMIT);
    expect(manifest.source.license).toBe("MIT");
    expect(manifest.requiredHeaderLine).toBe(HEADER_LINE);
    expect(manifest.advertisementBudgetBytes).toBe(BUDGET_BYTES);
    expect(manifest.skills.length).toBeGreaterThan(0);
    expect(manifest.skills.length).toBeLessThanOrEqual(10);

    const dirs = readdirSync(NAMESPACE)
      .filter((name) => statSync(path.join(NAMESPACE, name)).isDirectory())
      .sort();
    expect(dirs).toEqual(manifest.skills.map((s) => s.dir).sort());
  });

  it("carries the MIT attribution, pinned commit and reference-only header on every file", () => {
    for (const skill of manifest.skills) {
      const file = path.join(NAMESPACE, skill.dir, "SKILL.md");
      expect(existsSync(file), `${skill.name} SKILL.md must exist`).toBe(true);
      const raw = readFileSync(file, "utf8");

      const fm = frontmatter(raw);
      expect(fm.name, `${skill.name} frontmatter name`).toBe(skill.name);
      expect(fm.name?.startsWith("ecc-"), `${skill.name} must be namespaced`).toBe(true);
      expect(fm.description?.trim().length ?? 0, `${skill.name} needs a description`).toBeGreaterThan(0);

      expect(raw.includes(HEADER_LINE), `${skill.name} must carry the reference-only header`).toBe(true);
      expect(raw.includes(PINNED_COMMIT), `${skill.name} must name the pinned ECC commit`).toBe(true);
      expect(raw.includes("MIT"), `${skill.name} must carry its MIT attribution`).toBe(true);
      expect(raw.includes("Affaan Mustafa"), `${skill.name} must name the MIT copyright holder`).toBe(true);
    }

    expect(existsSync(path.join(NAMESPACE, "LICENSE"))).toBe(true);
    const license = readFileSync(path.join(NAMESPACE, "LICENSE"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 Affaan Mustafa");
  });

  it("pins each vendored file's content hash and any extra file", () => {
    for (const skill of manifest.skills) {
      expect(sha256(path.join(NAMESPACE, skill.dir, "SKILL.md")), `${skill.name} vendored hash`).toBe(
        skill.vendoredSha256,
      );
      for (const extra of skill.extraFiles ?? []) {
        expect(existsSync(path.join(NAMESPACE, skill.dir, extra)), `${skill.name}/${extra} must exist`).toBe(true);
      }
    }
  });

  it("is registered in skills-lock.json under the ecc- namespace", () => {
    const lock = JSON.parse(readFileSync(path.join(ROOT, "skills-lock.json"), "utf8")) as {
      skills: Record<string, { source: string; sourceType: string; skillPath: string; computedHash: string }>;
    };
    for (const skill of manifest.skills) {
      const entry = lock.skills[skill.name];
      expect(entry, `${skill.name} must be in skills-lock.json`).toBeTruthy();
      expect(entry.source).toBe("affaan-m/ECC");
      expect(entry.sourceType).toBe("github");
      expect(entry.skillPath).toBe(skill.eccPath);
      expect(entry.computedHash).toBe(skill.eccSha256);
    }
  });

  it("is never a style authority: no product path depends on it", () => {
    const needles = [".agents/skills/ecc", "skills/ecc", ...manifest.skills.map((s) => s.name)];
    const offenders: string[] = [];
    for (const dir of PRODUCT_DIRS) {
      for (const file of walk(path.join(ROOT, dir))) {
        if (!/\.(ts|tsx|js|jsx|mjs|cjs|css|json|md)$/.test(file)) continue;
        const contents = readFileSync(file, "utf8");
        for (const needle of needles) {
          if (contents.includes(needle)) offenders.push(`${path.relative(ROOT, file)} → ${needle}`);
        }
      }
    }
    expect(offenders, "product code must never reference the vendored ECC folder").toEqual([]);
  });

  it("stays inside the skill-advertisement byte budget", () => {
    const skills = manifest.skills.map((skill) => {
      const file = path.join(NAMESPACE, skill.dir, "SKILL.md");
      const fm = frontmatter(readFileSync(file, "utf8"));
      return { name: fm.name ?? skill.name, description: fm.description ?? "", filePath: file };
    });
    const bytes = advertisementBytes(skills);
    expect(bytes, `added advertisement ${bytes} bytes must be <= ${BUDGET_BYTES}`).toBeLessThanOrEqual(BUDGET_BYTES);
  });
});
