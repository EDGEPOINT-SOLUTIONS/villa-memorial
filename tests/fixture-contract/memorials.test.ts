import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";
import {
  memorialsLiveModeEnabled,
  publishedMemorials,
} from "@/lib/api-client/memorials";

/**
 * The digital-memorial fixture contract (F-04).
 *
 * No digital-memorial service or contract exists, so this file's contract is the
 * PRIVACY STATE it records: nothing is published, the demo family has chosen no
 * visibility, and no person may be fabricated to make the screens look alive.
 * If a future PR adds a memorial here, this test fails and the PR must bring the
 * service contract that justifies it.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

type Fixture = {
  _provenance: { status: string; recorded: string; note: string | string[] };
  service_state: string;
  consent_record: { ref: string; visibility: string | null; note: string };
  memorials: unknown[];
};

const fixture = memorialsFile as unknown as Fixture;

describe("the memorial fixture records the honest, unpublished state", () => {
  it("carries provenance naming the missing service and the openness of the rules", () => {
    expect(fixture._provenance.status).toContain("PROVISIONAL");
    expect(fixture._provenance.recorded).toBe("2026-09-18");
    const note = Array.isArray(fixture._provenance.note)
      ? fixture._provenance.note.join(" ")
      : fixture._provenance.note;
    expect(note).toContain("no contract freezes its shape");
    expect(note).toContain("Public memorial search/privacy rules");
  });

  it("publishes NO memorial — nothing may be fabricated for the screens", () => {
    expect(fixture.service_state).toBe("not_wired");
    expect(fixture.memorials).toEqual([]);
    expect(publishedMemorials()).toEqual([]);
    expect(memorialsLiveModeEnabled()).toBe(false);
  });

  it("points the demo family's consent at the family snapshot, with no choice made", () => {
    expect(fixture.consent_record.visibility).toBeNull();
    expect(fixture.consent_record.ref).toBe("lib/fixtures/family/snapshot.json#loved_one");
    expect(fixture.consent_record.note).toContain("Not decided");

    // The reference must resolve: the family snapshot really carries the record.
    const family = JSON.parse(
      readFileSync(path.join(ROOT, "lib", "fixtures", "family", "snapshot.json"), "utf8"),
    ) as { loved_one?: { name?: string } };
    expect(family.loved_one?.name).toBeTruthy();

    // ...and the public fixture never copies that person anywhere.
    const raw = JSON.stringify(fixture);
    expect(raw).not.toContain(String(family.loved_one?.name));
  });
});
