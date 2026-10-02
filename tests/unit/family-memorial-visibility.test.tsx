import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The family's memorial switch, end to end (captain, 2026-09-30).
 *
 * This is the file that proves the STORE IS REAL: a POST through the family
 * route writes the record the PUBLIC reader reads, so switching a memorial on
 * makes it appear (with exactly the fields the family chose) and switching it
 * off removes it again. It also pins the two privacy gates — a stranger cannot
 * write a memorial, and a portrait is served publicly only while the family
 * allows it.
 */
const state = vi.hoisted(() => ({
  session: null as null | { userId: string; email: string; scopes: string[] },
}));

vi.mock("@/lib/auth/family-session", () => ({
  familySessionOrNull: async () => state.session,
}));

const { POST } = await import("@/app/api/family/memorials/route");
const { GET: photoGET } = await import("@/app/api/memorials/[id]/photo/route");
const { loadPublishedMemorials, findPublishedMemorial } = await import(
  "@/lib/api-client/memorials"
);
const { readMemorialConsents } = await import("@/lib/api-client/memorial-store");
const { writeFamilyImage } = await import("@/lib/family-image-store");

const FAMILY_USER = "00000000-0000-4000-8000-000000000014";
const ERNESTO = "ernesto-dela-cruz";
const STRANGER = "00000000-0000-4000-8000-0000000000ff";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "memorial-consent-"));
  process.env.MEMORIAL_STORE_PATH = path.join(dir, "family-memorials.json");
  process.env.FAMILY_IMAGE_DIR = path.join(dir, "images");
  state.session = { userId: FAMILY_USER, email: "customer@vm.demo", scopes: [] };
});

afterEach(async () => {
  delete process.env.MEMORIAL_STORE_PATH;
  delete process.env.FAMILY_IMAGE_DIR;
  await fs.rm(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function save(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/family/memorials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/family/memorials — the switch writes the public record", () => {
  it("refuses a signed-out request", async () => {
    state.session = null;
    const response = await save({ person_id: ERNESTO, visible: true });
    expect(response.status).toBe(401);
    expect(await readMemorialConsents()).toEqual([]);
  });

  it("refuses a person who is not on the account", async () => {
    const response = await save({ person_id: "someone-else", visible: true });
    expect(response.status).toBe(404);
    expect(await readMemorialConsents()).toEqual([]);
  });

  it("turning the switch on publishes the name, and only the chosen fields", async () => {
    const response = await save({
      person_id: ERNESTO,
      visible: true,
      show_photo: false,
      show_birth: true,
      show_death: false,
      show_lot: false,
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { public_href: string | null };
    expect(payload.public_href).toBe(`/memorials/${ERNESTO}`);

    const published = await loadPublishedMemorials();
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      id: ERNESTO,
      name: "Ernesto Dela Cruz",
      life_dates: { from: 1948, to: null, display: "Born 1948" },
      photo: null,
      resting_place: null,
    });
    // Search finds the published name.
    expect(await findPublishedMemorial(ERNESTO)).not.toBeNull();
  });

  it("a name-only memorial is complete — no birth or death date required", async () => {
    await save({ person_id: ERNESTO, visible: true });
    const [memorial] = await loadPublishedMemorials();
    expect(memorial.name).toBe("Ernesto Dela Cruz");
    expect(memorial.life_dates.display).toBe("");
    expect(memorial.resting_place).toBeNull();
  });

  it("keeps the lot private unless the family chooses it", async () => {
    await save({ person_id: ERNESTO, visible: true, show_lot: false });
    expect((await loadPublishedMemorials())[0].resting_place).toBeNull();

    await save({ person_id: ERNESTO, visible: true, show_lot: true });
    expect((await loadPublishedMemorials())[0].resting_place).toMatchObject({
      park: "Sanctuario de Mercedes y Gloria",
      section: "A",
      lot: "A-01",
    });
  });

  it("turning the switch off removes the memorial from the public side", async () => {
    await save({ person_id: ERNESTO, visible: true, show_birth: true });
    expect(await loadPublishedMemorials()).toHaveLength(1);

    const response = await save({ person_id: ERNESTO, visible: false });
    expect(response.status).toBe(200);
    expect((await response.json()).public_href).toBeNull();
    expect(await loadPublishedMemorials()).toEqual([]);
    expect(await findPublishedMemorial(ERNESTO)).toBeNull();
  });

  it("carries each loved one's own switch — one person's choice never moves another", async () => {
    await save({ person_id: ERNESTO, visible: true, show_birth: true });
    const records = await readMemorialConsents();
    expect(records).toHaveLength(1);
    expect(records[0].person_id).toBe(ERNESTO);
    // Aurora was never saved and stays absent (default OFF).
    const published = await loadPublishedMemorials();
    expect(published.map((m) => m.id)).toEqual([ERNESTO]);
  });
});

describe("GET /api/memorials/[id]/photo — the published portrait only", () => {
  it("404s while the memorial is off, and while the photograph is not chosen", async () => {
    await writeFamilyImage(FAMILY_USER, "portrait", Buffer.from([1, 2, 3]), "image/png", ERNESTO);
    expect((await photoGET(new Request("http://localhost"), { params: Promise.resolve({ id: ERNESTO }) })).status).toBe(404);

    await save({ person_id: ERNESTO, visible: true, show_photo: false });
    expect((await photoGET(new Request("http://localhost"), { params: Promise.resolve({ id: ERNESTO }) })).status).toBe(404);
  });

  it("serves the family's picture once the switch and the photograph are on", async () => {
    await writeFamilyImage(FAMILY_USER, "portrait", Buffer.from([9, 8, 7]), "image/png", ERNESTO);
    await save({ person_id: ERNESTO, visible: true, show_photo: true });

    const memorial = (await loadPublishedMemorials())[0];
    expect(memorial.photo?.src).toContain(`/api/memorials/${ERNESTO}/photo`);

    const response = await photoGET(new Request("http://localhost"), {
      params: Promise.resolve({ id: ERNESTO }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([9, 8, 7]);
  });

  it("404s for a person whose memorial was never switched on", async () => {
    await writeFamilyImage(FAMILY_USER, "portrait", Buffer.from([1]), "image/png", STRANGER);
    const response = await photoGET(new Request("http://localhost"), {
      params: Promise.resolve({ id: STRANGER }),
    });
    expect(response.status).toBe(404);
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
