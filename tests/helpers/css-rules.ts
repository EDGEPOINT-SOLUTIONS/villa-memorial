/**
 * Tiny CSS reader for declaration-level gates (the house style of
 * tests/unit/broken-pages.test.ts). Vitest runs in `node`, so nothing in the
 * suite can measure real layout; these gates assert the DECLARATIONS that make
 * a phone layout work (or fail loudly when one is dropped), and the tests say
 * so in their own headers rather than pretending to measure.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type CssRule = {
  selector: string;
  body: string;
  /** 0 for a top-level rule, 1 for a rule inside one at-rule, … */
  depth: number;
  /** The enclosing at-rule's header (e.g. "@media (max-width: 40rem)"), if any. */
  media: string | null;
};

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export function readStyle(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

export function allStyles(): string {
  return ["components", "base", "utilities", "fonts", "tokens"]
    .map((name) => readStyle(`styles/${name}.css`))
    .join("\n");
}

export function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

/** Brace-aware walk: nested at-rules are tracked so "inside a phone media
 *  query" is distinguishable from "declared at top level". */
export function parseCss(source: string): CssRule[] {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: CssRule[] = [];
  const mediaStack: string[] = [];
  let buf = "";
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === "{") {
      const selector = buf.trim().replace(/\s+/g, " ");
      if (selector.startsWith("@")) {
        mediaStack.push(selector);
        buf = "";
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < clean.length && depth > 0) {
        if (clean[j] === "{") depth += 1;
        else if (clean[j] === "}") depth -= 1;
        j += 1;
      }
      out.push({
        selector,
        body: clean.slice(i + 1, j - 1),
        depth: mediaStack.length,
        media: mediaStack.at(-1) ?? null,
      });
      i = j - 1;
      buf = "";
      continue;
    }
    if (ch === "}") {
      mediaStack.pop();
      buf = "";
      continue;
    }
    buf += ch;
  }
  return out;
}

export const topLevel = (rules: CssRule[]) => rules.filter((r) => r.depth === 0);

export const inPhone = (rules: CssRule[]) =>
  rules.filter((r) => r.media !== null && /max-width:\s*40rem/.test(r.media));

/** All selectors in a comma-separated selector list. */
export const selectors = (rule: CssRule) => rule.selector.split(",").map((s) => s.trim());

export const ruleFor = (rules: CssRule[], selector: string) =>
  rules.find((r) => r.selector === selector || selectors(r).includes(selector));

/** Does any rule in `list` target this selector? */
export const hasRuleFor = (list: CssRule[], selector: string) =>
  list.some((r) => selectors(r).includes(selector));

export const declares = (rule: CssRule | undefined, property: string, value?: RegExp) => {
  if (!rule) return false;
  const re = new RegExp(`(?<![-\\w])${property}\\s*:\\s*${value ? value.source : "[^;]+"}`);
  return re.test(rule.body);
};

/** Static class tokens from `className="…"` / `className={"…"}` literals in a
 *  source tree (dynamic template chunks are deliberately not parsed — a gate
 *  must not guess). Returns token → the files that use it. */
export function staticClassNameTokens(
  entries: ReadonlyArray<{ file: string; source: string }>,
): Map<string, string[]> {
  const tokens = new Map<string, string[]>();
  for (const { file, source } of entries) {
    for (const m of source.matchAll(/className=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
      for (const token of (m[1] ?? m[2]).split(/\s+/)) {
        if (!token) continue;
        if (!tokens.has(token)) tokens.set(token, []);
        tokens.get(token)!.push(file);
      }
    }
  }
  return tokens;
}

/** Every .tsx/.ts file under app/ and components/, as {file, source}. */
export async function appSources(): Promise<Array<{ file: string; source: string }>> {
  const { readdirSync } = await import("node:fs");
  const out: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name)) out.push({ file: rel, source: readSource(rel) });
    }
  };
  walk("app");
  walk("components");
  return out;
}
