import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The guarded family image READ route (plan §6.9, D10).
 *
 * A family picture is served only to the session that owns it, only with
 * `private, no-store` (never a shared or long-lived cache), and a stranger's
 * request, a missing picture and an unknown slot all answer the same 404 — the
 * route never confirms whose picture exists.
 */
const state = vi.hoisted(() => ({ session: null as null | { userId: string } }));

vi.mock("@/lib/auth/family-session", () => ({
  familySessionOrNull: async () => state.session,
}));

const { GET } = await import("@/app/api/family/images/[slot]/route");
const { writeFamilyImage } = await import("@/lib/family-image-store");

const OWNER = "00000000-0000-4000-8000-0000000000aa";
const STRANGER = "00000000-0000-4000-8000-0000000000bb";
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "family-image-route-"));
  process.env.FAMILY_IMAGE_DIR = dir;
  state.session = null;
});

afterEach(async () => {
  delete process.env.FAMILY_IMAGE_DIR;
  await fs.rm(dir, { recursive: true, force: true });
});

function call(slot: string) {
  return GET(new Request(`http://localhost/api/family/images/${slot}`), {
    params: Promise.resolve({ slot }),
  });
}

describe("GET /api/family/images/[slot]", () => {
  it("returns a signed-out request a 404, never a picture", async () => {
    await writeFamilyImage(OWNER, "avatar", Buffer.from([1, 2, 3]), "image/png");
    const response = await call("avatar");
    expect(response.status).toBe(404);
  });

  it("serves the owner their picture with a private, no-store cache", async () => {
    await writeFamilyImage(OWNER, "avatar", Buffer.from([1, 2, 3]), "image/png");
    state.session = { userId: OWNER };
    const response = await call("avatar");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3]);
  });

  it("refuses another family the same picture", async () => {
    await writeFamilyImage(OWNER, "avatar", Buffer.from([1, 2, 3]), "image/png");
    state.session = { userId: STRANGER };
    expect((await call("avatar")).status).toBe(404);
  });

  it("answers an unknown slot and a missing picture with 404", async () => {
    state.session = { userId: OWNER };
    expect((await call("other")).status).toBe(404);
    expect((await call("portrait")).status).toBe(404);
  });
});
