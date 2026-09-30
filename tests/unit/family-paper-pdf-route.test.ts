import { describe, expect, it, vi } from "vitest";

/**
 * The family's guarded receipt PDF route (plan §6.7, D8).
 *
 * The shared PDF renderer was reachable only by the staff-scoped export route,
 * which a customer session cannot pass; this route is the family-scoped fix. It
 * rebuilds the receipt from the signed-in family's own snapshot (never
 * client-supplied blocks), serves it `inline` with a `private, no-store` cache,
 * and answers 404 when signed out or when the record has no copy.
 */
const state = vi.hoisted(() => ({ session: null as null | { userId: string } }));

vi.mock("@/lib/auth/family-session", () => ({
  familySessionOrNull: async () => state.session,
}));

const { GET } = await import("@/app/api/family/papers/receipt/[reference]/route");

function call(reference: string, disposition?: string) {
  const query = disposition ? `?disposition=${disposition}` : "";
  return GET(new Request(`http://localhost/api/family/papers/receipt/${reference}${query}`), {
    params: Promise.resolve({ reference }),
  });
}

describe("GET /api/family/papers/receipt/[reference]", () => {
  it("answers a signed-out request with 404", async () => {
    state.session = null;
    expect((await call("OR-2026-00201")).status).toBe(404);
  });

  it("renders the family's own recorded receipt as an inline PDF", async () => {
    state.session = { userId: "00000000-0000-4000-8000-0000000000aa" };
    const response = await call("OR-2026-00201");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // A PDF starts with "%PDF-".
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("honours the attachment disposition when asked", async () => {
    state.session = { userId: "00000000-0000-4000-8000-0000000000aa" };
    const response = await call("OR-2026-00201", "attachment");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("answers 404 for a receipt that is not the family's", async () => {
    state.session = { userId: "00000000-0000-4000-8000-0000000000aa" };
    expect((await call("OR-NOT-A-RECEIPT")).status).toBe(404);
  });
});
