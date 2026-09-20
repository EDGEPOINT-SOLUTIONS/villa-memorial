import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getServiceEntry,
  listServiceEntries,
  saveServiceEntry,
  seedServiceEntries,
} from "@/lib/api-client/content-entries";
import { SERVICE_ENTRY_DEFS } from "@/lib/service-content";

/**
 * The service-entry store (content-catalogue Phase 3): the three guide entries,
 * the seed-then-save seam, the durable journal, and the server veto on a price
 * binding that does not resolve against the live catalogue.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-service-entries-"));
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
});

afterEach(async () => {
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function edited(title: string) {
  const seed = seedServiceEntries().find((entry) => entry.key === "death-at-home")!;
  return { ...seed, title };
}

describe("the service-entry store", () => {
  it("serves the three guide entries in the captain's order", async () => {
    const entries = await listServiceEntries();
    expect(entries.map((entry) => entry.key)).toEqual(SERVICE_ENTRY_DEFS.map((def) => def.key));
    expect(entries.every((entry) => entry.kind === "service")).toBe(true);
  });

  it("reads one entry by key and null for anything else", async () => {
    expect((await getServiceEntry("death-at-hospital"))?.key).toBe("death-at-hospital");
    expect(await getServiceEntry("not-a-guide")).toBeNull();
  });

  it("saves an edit and serves it to the next read", async () => {
    await saveServiceEntry("death-at-home", edited("Death at home, revised"), "user-1");
    const entry = await getServiceEntry("death-at-home");
    expect(entry?.title).toBe("Death at home, revised");
    expect(entry?.updated_at).not.toBeNull();
    expect(entry?.updated_by).toBe("user-1");
  });

  it("rejects a price block that names a SKU the catalogue does not carry", async () => {
    await expect(
      saveServiceEntry(
        "death-at-home",
        {
          ...edited("Death at home"),
          blocks: [
            { id: "b1", type: "priceTable", heading: "Prices", binding: { kind: "sku", sku: "NOT-A-SKU" }, note: null },
          ],
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ApiError);
    // The refused save wrote nothing.
    expect((await getServiceEntry("death-at-home"))?.blocks).toHaveLength(0);
  });

  it("refuses a save whose body names a different entry", async () => {
    await expect(saveServiceEntry("transport", edited("Death at home"))).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps the seed untouched by saves", async () => {
    const before = seedServiceEntries().find((entry) => entry.key === "death-at-home")?.title;
    await saveServiceEntry("death-at-home", edited("Edited"));
    const after = seedServiceEntries().find((entry) => entry.key === "death-at-home")?.title;
    expect(before).toBe(after);
  });

  it("persists a save to the durable journal on disk", async () => {
    await saveServiceEntry("death-at-home", edited("Death at home, revised"), "user-1");
    const journal = await readFile(process.env.CONTENT_ENTRIES_STORE_PATH as string, "utf8");
    expect(journal).toContain("entry_saved");
    expect(journal).toContain("Death at home, revised");
  });
});
