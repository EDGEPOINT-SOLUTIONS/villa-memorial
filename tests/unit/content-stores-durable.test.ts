import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import contentFile from "@/lib/fixtures/landing/content.json";
import { ApiError } from "@/lib/api-client/api-error";
import { landingStorePath, listLandingContent, saveLandingContent } from "@/lib/api-client/landing";
import {
  contentPagesStorePath,
  getPageDocument,
  listPageDocuments,
  savePageDocument,
  seedPageDocuments,
} from "@/lib/api-client/content-pages";

/**
 * THE CONTENT STORES ARE DURABLE.
 *
 * THE DEFECT THESE TESTS EXIST FOR. Both stores that back page editing — the landing
 * document (Home, the FAQ, the blog, the header/footer, the office contact block) and the
 * four page documents (Park · Services · Plans · Coffins) — kept an edit on `globalThis`
 * with no file behind it. A staff member saved, the page re-rendered with the change, and
 * the edit was **gone on the next restart**; in a multi-instance deploy it reached only
 * the instance that handled the save. Every commerce and ops store was durable. These two,
 * the ones behind "how every page can be edited", were not.
 *
 * The restart test is the one that matters: a restart is a fresh process with empty module
 * state, so the only thing that can survive is the file. These assert the saved revision
 * is physically in the journal, in the documented envelope, and is what a read returns.
 *
 * Each suite gets its own throwaway journals (`tests/setup.ts` redirects both env vars).
 */

const SEED = (contentFile as unknown as { content: Record<string, unknown> }).content;

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-content-durable-"));
  process.env.LANDING_STORE_PATH = path.join(dir, "landing.json");
  process.env.CONTENT_PAGES_STORE_PATH = path.join(dir, "pages.json");
});

afterEach(async () => {
  delete process.env.LANDING_STORE_PATH;
  delete process.env.CONTENT_PAGES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the landing content document is durable", () => {
  it("reads the recorded seed when nothing has been saved", async () => {
    const content = await listLandingContent();
    expect(content.logo.wordmark).toBe("Villa Funeraria");
    // No journal file is written by a read.
    await expect(readFile(landingStorePath(), "utf8")).rejects.toThrow();
  });

  it("saves an edit to disk and reads the LATEST revision back", async () => {
    await saveLandingContent({
      ...SEED,
      logo: { ...(SEED.logo as Record<string, unknown>), wordmark: "Sanctuario de Prueba" },
    });

    // On disk, in the documented envelope.
    const parsed = JSON.parse(await readFile(landingStorePath(), "utf8")) as {
      version: number;
      events: Array<{ kind: string; content: { logo: { wordmark: string } } }>;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].kind).toBe("landing_saved");
    expect(parsed.events[0].content.logo.wordmark).toBe("Sanctuario de Prueba");

    // And a read that shares no module state with the write finds it.
    const content = await listLandingContent();
    expect(content.logo.wordmark).toBe("Sanctuario de Prueba");
  });

  it("folds two saves to the second one, appending rather than overwriting history", async () => {
    const first = { ...SEED, logo: { ...(SEED.logo as Record<string, unknown>), wordmark: "First" } };
    const second = { ...SEED, logo: { ...(SEED.logo as Record<string, unknown>), wordmark: "Second" } };
    await saveLandingContent(first);
    await saveLandingContent(second);

    const parsed = JSON.parse(await readFile(landingStorePath(), "utf8")) as { events: unknown[] };
    expect(parsed.events).toHaveLength(2);
    expect((await listLandingContent()).logo.wordmark).toBe("Second");
  });

  it("refuses a corrupt journal rather than silently falling back to the seed", async () => {
    await writeFile(landingStorePath(), "{ not json", "utf8");
    await expect(listLandingContent()).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a journal whose event is not a landing save, naming the store", async () => {
    await writeFile(
      landingStorePath(),
      JSON.stringify({ version: 1, events: [{ kind: "something_else", at: "x" }] }),
      "utf8",
    );
    await expect(listLandingContent()).rejects.toThrow(/malformed landing store/);
  });
});

describe("the page documents are durable", () => {
  it("reads the recorded seed documents when nothing has been saved", async () => {
    const docs = await listPageDocuments();
    // Home is composed from the landing document, the others are stored.
    expect(docs.map((d) => d.key)).toEqual([
      "home",
      "park",
      "services",
      "plans",
      "coffins",
      "blog",
      "contact",
      "memorials",
      "builder",
      "facilities",
      "gallery",
      "priceList",
      "login",
    ]);
    const park = await getPageDocument("park");
    expect(park?.title).toBe("Villa Memorial Park");
  });

  it("saves a page edit to disk and reads it back", async () => {
    const park = await getPageDocument("park");
    expect(park).toBeTruthy();
    const saved = await savePageDocument("park", {
      ...park,
      hero: { ...park!.hero, headline: "A park that survives a restart" },
    });
    expect(saved.hero.headline).toBe("A park that survives a restart");

    const parsed = JSON.parse(await readFile(contentPagesStorePath(), "utf8")) as {
      version: number;
      events: Array<{ kind: string; document: { key: string } }>;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.events[0].kind).toBe("page_saved");
    expect(parsed.events[0].document.key).toBe("park");

    // A read sharing no module state with the write.
    const reread = await getPageDocument("park");
    expect(reread?.hero.headline).toBe("A park that survives a restart");
  });

  it("replaces a page rather than accumulating copies of it", async () => {
    const park = await getPageDocument("park");
    await savePageDocument("park", { ...park, hero: { ...park!.hero, headline: "First" } });
    await savePageDocument("park", { ...park, hero: { ...park!.hero, headline: "Second" } });

    const docs = await listPageDocuments();
    // Still thirteen documents — a save edits one, it does not add one.
    expect(docs).toHaveLength(13);
    expect((await getPageDocument("park"))?.hero.headline).toBe("Second");
  });

  it("keeps the other documents untouched when one is saved", async () => {
    const before = await getPageDocument("plans");
    const park = await getPageDocument("park");
    await savePageDocument("park", { ...park, hero: { ...park!.hero, headline: "Only the park" } });
    expect((await getPageDocument("plans"))?.hero.headline).toBe(before?.hero.headline);
  });

  it("holds a page document and a save path for every corner surface (wave 1)", async () => {
    // The seven surfaces that shipped with their copy as page constants until
    // the admin plan: each now has a document the office can edit and read back.
    for (const key of ["contact", "memorials", "builder", "facilities", "gallery", "priceList", "login"]) {
      const doc = await getPageDocument(key);
      expect(doc, key).toBeTruthy();
      const saved = await savePageDocument(key, {
        ...doc,
        hero: { ...doc!.hero, headline: `Edited ${key}` },
      });
      expect(saved.hero.headline, key).toBe(`Edited ${key}`);
      expect((await getPageDocument(key))?.hero.headline, key).toBe(`Edited ${key}`);
    }
  });

  it("refuses a corrupt journal rather than silently falling back to the seed", async () => {
    await writeFile(contentPagesStorePath(), "not json at all", "utf8");
    await expect(listPageDocuments()).rejects.toBeInstanceOf(ApiError);
  });

  it("still exposes the seed for a caller that wants it", () => {
    expect(seedPageDocuments().map((d) => d.key)).toEqual([
      "park",
      "services",
      "plans",
      "coffins",
      "blog",
      "contact",
      "memorials",
      "builder",
      "facilities",
      "gallery",
      "priceList",
      "login",
    ]);
  });
});

describe("the shared journal mechanics", () => {
  it("points a store at its own env var, and at .data otherwise", async () => {
    expect(landingStorePath()).toBe(path.join(dir, "landing.json"));
    expect(contentPagesStorePath()).toBe(path.join(dir, "pages.json"));

    const previous = process.env.LANDING_STORE_PATH;
    delete process.env.LANDING_STORE_PATH;
    expect(landingStorePath()).toBe(path.join(process.cwd(), ".data", "landing-content.json"));
    process.env.LANDING_STORE_PATH = previous;
  });
});
