import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  burialsStorePath,
  listStoredBurials,
  scheduleBurial,
  updatePickup,
} from "@/lib/api-client/burials-store";
import type { BurialDraft } from "@/lib/burial-admin";

/**
 * The durable burial store (client minute 2026-09-21, item 2). Every test points
 * `BURIALS_STORE_PATH` at its own throwaway journal, so a write here can never make the
 * fixture-contract tests (or the dev `.data/` store) see one more burial.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-burials-"));
  process.env.BURIALS_STORE_PATH = path.join(dir, "burials.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function draft(over: Partial<BurialDraft> = {}): BurialDraft {
  return {
    date: "2026-10-05",
    time: "10:00",
    case_number: "CASE-2026-0005",
    deceased_name: "Nena Bautista",
    lot_number: "B-002",
    section: "B",
    coordinator: "Elena Villanueva",
    note: null,
    light_pickup: null,
    ...over,
  };
}

describe("the burial store folds the seed with the journal", () => {
  it("serves the recorded sheet when the journal is empty", async () => {
    const burials = await listStoredBurials();
    expect(burials).toHaveLength(3);
    expect(burials.map((b) => b.case_number)).toContain("CASE-2026-0001");
  });

  it("records a burial, and a fresh read sees it (durability)", async () => {
    const recorded = await scheduleBurial({ draft: draft(), actor: "Sam Staff" });
    expect(recorded.id).toBe("bur-2026-0005-nena-bautista");

    // A NEW read path (as a restarted server would do) still sees it.
    const after = await listStoredBurials();
    expect(after.map((b) => b.id)).toContain(recorded.id);
    expect(after.find((b) => b.id === recorded.id)!.date).toBe("2026-10-05");
    // The recorded seed is untouched.
    expect(after).toHaveLength(4);
  });

  it("refuses a second burial for the same case", async () => {
    await expect(
      scheduleBurial({ draft: draft({ case_number: "CASE-2026-0001" }), actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422 });
    expect(await listStoredBurials()).toHaveLength(3);
  });
});

describe("the light pickup write", () => {
  it("moves a recorded pickup's state and persists it", async () => {
    const moved = await updatePickup({
      burialId: "bur-2026-0001-santos",
      state: "in_progress",
      actor: "Sam Staff",
    });
    expect(moved.light_pickup!.state).toBe("in_progress");
    const reread = (await listStoredBurials()).find((b) => b.id === "bur-2026-0001-santos")!;
    expect(reread.light_pickup!.state).toBe("in_progress");
    // The recorded time and crew are kept.
    expect(reread.light_pickup!.time).toBe("15:00");
    expect(reread.light_pickup!.crew).toBe("Delivery crew");
  });

  it("needs a time and crew to set a FIRST pickup, then accepts a state move", async () => {
    const burial = await scheduleBurial({ draft: draft(), actor: "Sam Staff" });
    expect(burial.light_pickup).toBeNull();

    await expect(
      updatePickup({ burialId: burial.id, state: "in_progress", actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 422 });

    const set = await updatePickup({
      burialId: burial.id,
      state: "scheduled",
      time: "16:00",
      crew: "Delivery crew",
      actor: "Sam Staff",
    });
    expect(set.light_pickup).toEqual({
      time: "16:00",
      crew: "Delivery crew",
      state: "scheduled",
      note: null,
    });
  });

  it("404s a burial that does not exist", async () => {
    await expect(
      updatePickup({ burialId: "bur-nope", state: "done", actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("the store refuses to guess", () => {
  it("is a 500 on a corrupt journal, never a silent fall-back to the seed", async () => {
    await writeFile(burialsStorePath(), "{ not json", "utf8");
    await expect(listStoredBurials()).rejects.toMatchObject({ status: 500 });
  });

  it("answers the named 503 in live mode instead of writing a local file", async () => {
    vi.stubEnv("SCHEDULING_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/burials-store");
    await expect(
      live.scheduleBurial({ draft: draft(), actor: "Sam Staff" }),
    ).rejects.toMatchObject({ status: 503 });
  });
});
