import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import personasFile from "@/lib/fixtures/auth/personas.json";
import { hasAnyScope, STAFF_NAV } from "@/lib/rbac/nav";

/**
 * Frozen scope vocabulary guard for staff gates (rbac-scopes-v1).
 *
 * The PRD alignment audit (`docs/08-delivery/prd-alignment-audit.md` §8-G1) found
 * three staff pages gating on `["scheduling"]`, `["cases"]`, `["property"]` — tokens
 * that can never match a session's `{module}:{action}` scopes, so even the admin
 * persona saw `ForbiddenState` where the designed not-wired state belongs.
 *
 * This suite makes that class a recurring check instead of a comment: it parses every
 * staff gate's inline scope array out of the source and asserts each token is in the
 * frozen vocabulary (`docs/08-delivery/contracts/rbac-scopes-v1.md`), that the gates
 * are declared as inline arrays (so this test can always read them), and that the
 * admin persona — the top of the role ladder — resolves every gate. It also pins the
 * contract's own three-way cross-check (nav + persona scopes) to the same vocabulary.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STAFF_DIR = path.join(ROOT, "app", "(staff)");
const CONTRACT = path.join(ROOT, "docs", "08-delivery", "contracts", "rbac-scopes-v1.md");

/** Call shapes that gate a staff screen: helper name → index of its scope-array argument. */
const GATE_ARG_INDEX: Record<string, number> = { gatedSectionPage: 2, hasAnyScope: 1 };
const SCOPE_TOKEN_RE = /^[a-z][a-z-]*(?::[a-z][a-z-]*)+$/;

type Gate = {
  where: string;
  helper: string;
  scopes: string[];
  inlineArray: boolean;
};

function frozenVocabulary(): Set<string> {
  const md = readFileSync(CONTRACT, "utf8");
  const section = md.split("## Frozen vocabulary")[1]?.split("## Rules")[0] ?? "";
  const tokens = [...section.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1].trim())
    .filter((t) => SCOPE_TOKEN_RE.test(t));
  return new Set(tokens);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const entry = path.join(dir, name);
    if (statSync(entry).isDirectory()) return walk(entry);
    return /\.tsx?$/.test(entry) ? [entry] : [];
  });
}

function collectGates(): Gate[] {
  const gates: Gate[] = [];
  const helperFile = path.join(STAFF_DIR, "staff", "gated-section.tsx");

  for (const file of walk(STAFF_DIR)) {
    // The shared helper is the gate itself; its scope argument is a parameter.
    if (file === helperFile) continue;

    const rel = path.relative(ROOT, file);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        Object.hasOwn(GATE_ARG_INDEX, node.expression.text)
      ) {
        const helper = node.expression.text;
        const arg = node.arguments[GATE_ARG_INDEX[helper]];
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        const where = `${rel}:${line}`;
        if (arg && ts.isArrayLiteralExpression(arg)) {
          const scopes = arg.elements.filter(ts.isStringLiteral).map((el) => el.text);
          gates.push({ where, helper, scopes, inlineArray: scopes.length === arg.elements.length });
        } else {
          gates.push({ where, helper, scopes: [], inlineArray: false });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return gates;
}

describe("staff scope gates use the frozen vocabulary", () => {
  const vocabulary = frozenVocabulary();
  const gates = collectGates();

  it("parses the frozen vocabulary and finds the staff gates", () => {
    // Guard the parser itself: the contract's 23 scopes and the real gate call sites
    // both exist, so a silently-empty parse cannot pass every later assertion.
    expect(vocabulary.size).toBeGreaterThanOrEqual(23);
    for (const scope of [
      "cases:read",
      "scheduling:read",
      "property:read",
      "catalog:write",
      "identity:users:manage",
      "tenancy:tenants:manage",
    ]) {
      expect(vocabulary.has(scope), `rbac-scopes-v1 is missing ${scope}`).toBe(true);
    }
    expect(gates.length).toBeGreaterThanOrEqual(40);
  });

  it("declares every gate as an inline scope array", () => {
    const opaque = gates
      .filter((g) => !g.inlineArray)
      .map((g) => `${g.where} (${g.helper})`);
    expect(opaque, "gate scope lists must be inline arrays so this test can read them").toEqual([]);
  });

  it("uses only tokens from the frozen vocabulary", () => {
    const unknown = gates.flatMap((g) =>
      g.scopes
        .filter((scope) => !vocabulary.has(scope))
        .map((scope) => `${g.where} ${g.helper} declares "${scope}"`),
    );
    expect(unknown, "malformed scope tokens can never match a session").toEqual([]);
  });

  it("resolves every gate for the admin persona — no gate is unreachable", () => {
    const admin = personasFile.personas.find((p) => p.email === "admin@vm.demo");
    expect(admin, "admin persona exists in the auth fixture").toBeTruthy();
    const blocked = gates
      .filter((g) => !hasAnyScope(admin!.scopes, g.scopes))
      .map((g) => `${g.where} (${g.helper}) requires ${g.scopes.join(", ")}`);
    expect(blocked).toEqual([]);
  });

  it("keeps nav items and persona scopes inside the same vocabulary", () => {
    const navTokens = STAFF_NAV.flatMap((section) => section.items.flatMap((item) => item.scopes));
    const personaTokens = personasFile.personas.flatMap((p) => p.scopes);
    const unknown = [...new Set([...navTokens, ...personaTokens])].filter(
      (scope) => !vocabulary.has(scope),
    );
    expect(unknown).toEqual([]);
  });
});
