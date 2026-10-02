import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The PDF export route must be diagnosable in production.
 *
 * The GET branch (the public General Price List) answers a plain
 * `{"error":"pdf rendering failed"}` to the visitor and nothing else, which is why the
 * staging 500 had no trace. The catch now logs the real error server-side while the
 * user-facing body stays exactly as it was. This suite forces the renderer to throw and
 * pins both halves.
 */

const state = vi.hoisted(() => ({ fails: false }));

vi.mock("@/lib/export/pdf", () => ({
  paperToPdfBuffer: async () => {
    if (state.fails) {
      throw new Error("pdfkit exploded: MODULE_NOT_FOUND #standard-fonts/TimesRoman");
    }
    return Buffer.from("%PDF-1.4\n");
  },
}));

const { GET } = await import("@/app/api/export/paper-pdf/route");

function call() {
  return GET(new Request("http://localhost/api/export/paper-pdf?document=general-price-list"));
}

afterEach(() => {
  state.fails = false;
  vi.restoreAllMocks();
});

describe("GET /api/export/paper-pdf — failure logging", () => {
  it("logs the real error and keeps the user-facing message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.fails = true;

    const response = await call();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "pdf rendering failed" });
    expect(spy).toHaveBeenCalledTimes(1);
    const [tag, error] = spy.mock.calls[0];
    expect(String(tag)).toContain("paper-pdf");
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("pdfkit exploded");
  });

  it("does not log on a successful render", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.fails = false;

    const response = await call();

    expect(response.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });
});
