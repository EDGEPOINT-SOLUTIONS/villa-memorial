import { describe, expect, it } from "vitest";
import { readPageDocument, readCatalogueEntry } from "@/lib/content-catalog";
import {
  SERVICE_ENTRY_DEFS,
  SERVICE_ALACARTE_FALLBACK_NOTES,
  SERVICE_CHAPEL_FALLBACK_NOTES,
  isServiceCopyBlockId,
  serviceEntryDef,
  serviceEntryDefForRoute,
  serviceEntryView,
  serviceHeroVariant,
  servicePageContentFromDocument,
} from "@/lib/service-content";
import seedEntries from "@/lib/fixtures/content/service-entries.json";

/**
 * The Funeraria Memorial Services content model (content-catalogue Phase 3):
 * the service descriptions read from the page document with their recorded
 * fallbacks, and the guide service entries' typed view.
 */

const servicesDoc = readPageDocument({
  key: "services",
  title: "Funeraria Memorial Services",
  hero: { eyebrow: "", headline: "Funeral services", lead: "", image: null, background: null, backgroundTransparency: 100 },
  tabs: [],
  blocks: [
    { id: "services-alacarte-retrieval", type: "paragraph", heading: "Retrieval", body: ["Edited retrieval description."] },
    { id: "services-chapel-common", type: "paragraph", heading: "", body: ["Edited common chapel copy."] },
  ],
  entries: [],
});

describe("the service page content reading", () => {
  it("falls back to the page's pre-migration copy when a block is absent", () => {
    const content = servicePageContentFromDocument(null);
    expect(content.alacarteNotes.Retrieval).toBe(SERVICE_ALACARTE_FALLBACK_NOTES.Retrieval);
    expect(content.chapelNotes.common).toBe(SERVICE_CHAPEL_FALLBACK_NOTES.common);
    expect(content.chapelNotes.private).toBe(SERVICE_CHAPEL_FALLBACK_NOTES.private);
  });

  it("reads an edited block and falls back per line", () => {
    const content = servicePageContentFromDocument(servicesDoc);
    expect(content.alacarteNotes.Retrieval).toBe("Edited retrieval description.");
    expect(content.chapelNotes.common).toBe("Edited common chapel copy.");
    // An untouched line keeps the recorded copy.
    expect(content.alacarteNotes.Delivery).toBe(SERVICE_ALACARTE_FALLBACK_NOTES.Delivery);
  });

  it("knows which block ids it consumes", () => {
    expect(isServiceCopyBlockId("services-alacarte-retrieval")).toBe(true);
    expect(isServiceCopyBlockId("services-chapel-private")).toBe(true);
    expect(isServiceCopyBlockId("services-intro")).toBe(false);
  });
});

describe("the guide service entries", () => {
  const entries = (seedEntries as { entries: unknown[] }).entries.map((raw) => readCatalogueEntry(raw));

  it("names the captain-confirmed three routes once", () => {
    expect(SERVICE_ENTRY_DEFS.map((def) => def.route)).toEqual([
      "/services/death-at-home",
      "/services/death-at-hospital",
      "/transport",
    ]);
    expect(serviceEntryDefForRoute("/transport")?.key).toBe("transport");
    expect(serviceEntryDef("not-a-guide")).toBeUndefined();
  });

  it("seeds one entry per route with a hero alt and caption", () => {
    for (const def of SERVICE_ENTRY_DEFS) {
      const entry = entries.find((record) => record.key === def.key);
      expect(entry, def.key).toBeDefined();
      expect(entry?.kind).toBe("service");
      expect(entry?.media.gallery[0]?.alt.trim().length, def.key).toBeGreaterThan(0);
      expect(entry?.media.hero, def.key).toBeTruthy();
    }
  });

  it("builds the entry view from the record and falls back when it is missing", () => {
    const transport = serviceEntryDef("transport")!;
    const entry = entries.find((record) => record.key === "transport")!;
    const view = serviceEntryView(entry, transport);
    expect(view.title).toBe("Transport");
    expect(view.route).toBe("/transport");
    expect(view.eyebrow).toBe("Services · Transport");
    expect(view.blocks).toEqual([]);

    const fallback = serviceEntryView(null, transport);
    expect(fallback.title).toBe(transport.fallbackTitle);
    expect(fallback.summary).toBe(transport.fallbackSummary);
  });

  it("resolves a client photograph through the one imagery rule home", () => {
    const variant = serviceHeroVariant("/media/client/hearse-carriage-gold-side-wide-960.webp", "card");
    expect(variant?.src).toContain("hearse-carriage-gold-side-card");
    expect(variant?.srcSet).toContain("hearse-carriage-gold-side-card-880");
    // A non-client path is left exactly as stored.
    expect(serviceHeroVariant("/media/death_at_home.jpg")).toEqual({ src: "/media/death_at_home.jpg" });
    expect(serviceHeroVariant(null)).toBeNull();
  });
});
