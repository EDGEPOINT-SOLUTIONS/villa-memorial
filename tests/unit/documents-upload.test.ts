import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getDocument, listDocuments } from "@/lib/api-client/documents";

/**
 * `POST /api/documents` — the office filing a document (the captain: the Documents
 * page "must actually work end to end (list, open, upload where a store exists,
 * honest gaps elsewhere)").
 *
 * WHAT IS PINNED:
 *  · a `documents:write` session's upload files a REAL repository row — the staff
 *    list and the detail reader find it;
 *  · the row is metadata-only (no object store in v1): `file_size_bytes` is 0, which
 *    the screen renders as "not stored", and the render artifact still 404s — an
 *    honest gap, never a silent fake paper;
 *  · anonymous / read-only callers are refused and file nothing.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[]) {
  cookieJar.values.im_at = accessToken(scopes);
}

function post(body: unknown): Promise<Response> {
  return route.POST(
    new Request("http://localhost/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

const route = await import("@/app/api/documents/route");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-documents-upload-"));
  process.env.DOCUMENTS_STORE_PATH = path.join(dir, "documents.json");
  delete cookieJar.values.im_at;
  delete process.env.DOCUMENTS_BASE_URL;
});

afterEach(async () => {
  delete process.env.DOCUMENTS_STORE_PATH;
  delete process.env.DOCUMENTS_BASE_URL;
  await rm(dir, { recursive: true, force: true });
});

describe("POST /api/documents", () => {
  it("files a document the repository list and detail page can read", async () => {
    signInAs(["documents:write"]);
    const before = await listDocuments();

    const response = await post({
      title: "Deed of sale — Lot D05",
      document_type: "contract",
      related_case_number: "CASE-2026-0001",
    });
    expect(response.status).toBe(201);
    const document = (await response.json()) as {
      id: string;
      document_number: string;
      status: string;
      file_size_bytes: number;
    };
    expect(document.document_number).toMatch(/^DOC-\d{4}-\d{5}$/);
    expect(document.status).toBe("uploaded");
    // The honest gap: the row is filed, the binary is not kept (no object store).
    expect(document.file_size_bytes).toBe(0);

    const after = await listDocuments();
    expect(after).toHaveLength(before.length + 1);
    const recorded = await getDocument(document.id);
    expect(recorded.title).toBe("Deed of sale — Lot D05");
    expect(recorded.related_case_number).toBe("CASE-2026-0001");
  });

  it("rejects a missing title or an unknown type without filing anything", async () => {
    signInAs(["documents:write"]);
    const before = await listDocuments();
    expect((await post({ document_type: "contract" })).status).toBe(422);
    expect((await post({ title: "X", document_type: "scroll" })).status).toBe(422);
    expect(await listDocuments()).toHaveLength(before.length);
  });

  it("refuses an anonymous or read-only caller and files nothing", async () => {
    const before = await listDocuments();
    delete cookieJar.values.im_at;
    expect((await post({ title: "X", document_type: "permit" })).status).toBe(401);

    signInAs(["documents:read"]);
    expect((await post({ title: "X", document_type: "permit" })).status).toBe(403);
    expect(await listDocuments()).toHaveLength(before.length);
  });
});
