import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * /general-price-list IS the PDF (captain, 2026-10-02).
 *
 * The route handler replaced the coded HTML page, so this suite pins the
 * contract the captain asked for: the URL answers `application/pdf` inline (the
 * browser's own viewer opens the document), carries the %PDF header and the
 * villa-general-price-list.pdf filename, and degrades to an honest 500 rather
 * than a broken page when the document cannot be built.
 */

const state = vi.hoisted(() => ({ fails: false }));

vi.mock("@/lib/export/pdf", () => ({
  paperToPdfBuffer: async () => {
    if (state.fails) throw new Error("pdfkit exploded");
    return Buffer.from("%PDF-1.7\n");
  },
}));

const { GET } = await import("@/app/(public)/general-price-list/route");

afterEach(() => {
  state.fails = false;
  vi.restoreAllMocks();
});

describe("GET /general-price-list", () => {
  it("serves the price list as an inline PDF with its filename", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="villa-general-price-list.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("answers an honest error page and logs when the document cannot be built", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.fails = true;

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("General Price List unavailable");
    expect(spy).toHaveBeenCalledTimes(1);
    const [tag, error] = spy.mock.calls[0];
    expect(String(tag)).toContain("general-price-list");
    expect(error).toBeInstanceOf(Error);
  });
});
