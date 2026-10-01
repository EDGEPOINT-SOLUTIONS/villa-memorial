import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";
import { memorialsLiveModeEnabled, loadPublishedMemorials } from "@/lib/api-client/memorials";
import { readMemorialConsents } from "@/lib/api-client/memorial-store";

/**
 * The digital-memorial fixture contract (F-04).
 *
 * No digital-memorial service or contract exists, so this file's contract is the
 * PRIVACY STATE it seeds: nothing is published, no consent is recorded, and no
 * person may be fabricated to make the screens look alive. If a future PR seeds a
 * published consent here, this test fails and the PR must bring the service
 * contract that justifies it.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

type Fixture = {
  _provenance: { status: string; recorded: string; note: string | string[] };
  service_state: string;
  consents: unknown[];
};

const fixture = memorialsFile as unknown as Fixture;

describe("the memorial fixture seeds the honest, unpublished state", () => {
  it("carries provenance naming the missing service and the openness of the rules", () => {
    expect(fixture._provenance.status).toContain("PROVISIONAL");
    expect(fixture._provenance.recorded).toBe("2026-09-30");
    const note = Array.isArray(fixture._provenance.note)
      ? fixture._provenance.note.join(" ")
      : fixture._provenance.note;
    expect(note).toContain("no contract freezes its shape");
    expect(note).toContain("Public memorial search/privacy rules");
  });

  it("publishes NO memorial and records NO consent — nothing may be fabricated", async () => {
    expect(fixture.service_state).toBe("not_wired");
    expect(fixture.consents).toEqual([]);
    expect(memorialsLiveModeEnabled()).toBe(false);
    expect(await readMemorialConsents()).toEqual([]);
    expect(await loadPublishedMemorials()).toEqual([]);
  });

  it("never copies a demo family loved one into the public fixture", () => {
    const family = JSON.parse(
      readFileSync(path.join(ROOT, "lib", "fixtures", "family", "snapshot.json"), "utf8"),
    ) as { loved_ones?: Array<{ id?: string; name?: string }> };
    for (const person of family.loved_ones ?? []) {
      expect(String(person.name)).toBeTruthy();
      expect(JSON.stringify(fixture)).not.toContain(String(person.name));
    }
  });
});
