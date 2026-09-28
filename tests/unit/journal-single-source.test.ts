import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 7 — one home for the durable-journal mechanics (client-minutes cleanup).
 *
 * Eleven fixture stores used to carry their own copies of the same ~65 lines: an
 * ENOENT-tolerant read, a `{version:1, events}` envelope check, an atomic
 * temp-file + fsync + `rename(2)` write, and a one-writer promise chain. That duplication is
 * exactly where the Phase 2 `globalThis` mistake survived unnoticed. They now delegate to
 * `lib/api-client/journal.ts`; this fails a store that grows its own mechanics back.
 */

const DIR = path.join(process.cwd(), "lib", "api-client");
const JOURNAL = "journal.ts";

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".ts"))
  .filter((name) => name !== JOURNAL);

describe("the journal mechanics have one home", () => {
  it("only journal.ts touches node:fs", () => {
    const offenders = files.filter((name) =>
      readFileSync(path.join(DIR, name), "utf8").includes('from "node:fs"'),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("no store keeps its own writer queue", () => {
    const offenders = files.filter((name) =>
      /let writeQueue/.test(readFileSync(path.join(DIR, name), "utf8")),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("no store parses the raw journal file by hand", () => {
    const offenders = files.filter((name) =>
      /JSON\.parse\(raw\)/.test(readFileSync(path.join(DIR, name), "utf8")),
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the two stores from Phase 2 and the Phase 6 store also delegate", () => {
    for (const name of ["content-pages.ts", "landing.ts", "burials-store.ts", "order-store.ts"]) {
      const source = readFileSync(path.join(DIR, name), "utf8");
      expect(source, name).toContain("@/lib/api-client/journal");
    }
  });
});
