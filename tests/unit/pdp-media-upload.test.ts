import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getItemEntry, saveItemEntry } from "@/lib/api-client/content-entries";
import { mediaUploadDir, storedMediaReferenceIssues } from "@/lib/media-upload";
import { mediaPublicBaseUrl, publicMediaUrl, storedMediaName } from "@/lib/media-url";

/**
 * P4 — storage hardening (data/villa-pdp-cms-plan/report.md §3.3, §8.2, §10).
 *
 *  - POST /api/content/media writes the prepared bytes under MEDIA_UPLOAD_DIR and
 *    returns the short `/api/media/<id>.<ext>` path;
 *  - it refuses without `catalog:write` and writes nothing when it does;
 *  - GET /api/media/<name> streams the stored bytes with long cache headers and
 *    404s a missing or traversal name;
 *  - the saved document stores that path, never a base64 data URL; a data URL is
 *    refused by the validator;
 *  - the referenced-bytes guard proves a reference resolves to a real file.
 *
 * Cookies are mocked and every test gets its own throwaway MEDIA_UPLOAD_DIR and
 * entry-store journal.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const uploadRoute = await import("@/app/api/content/media/route");
const readRoute = await import("@/app/api/media/[...path]/route");

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
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: "Sam Staff",
    }),
    "utf8",
  ).toString("base64");
}

/** A tiny but real PNG (1×1, transparent) — the bytes the browser would send. */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

function upload(body: Buffer = PNG_BYTES, contentType = "image/png") {
  return uploadRoute.POST(
    new Request("http://localhost/api/content/media", {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Uint8Array(body),
    }),
  );
}

function read(name: string) {
  return readRoute.GET(new Request(`http://localhost/api/media/${name}`), {
    params: Promise.resolve({ path: name.split("/") }),
  } as never);
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-media-upload-"));
  process.env.MEDIA_UPLOAD_DIR = path.join(dir, "media-uploads");
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
});

afterEach(async () => {
  delete process.env.MEDIA_UPLOAD_DIR;
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("POST /api/content/media", () => {
  it("writes the bytes under MEDIA_UPLOAD_DIR and returns a short path", async () => {
    signInAs(["catalog:read", "catalog:write"]);
    const response = await upload();
    expect(response.status).toBe(201);
    const payload = (await response.json()) as { url: string };
    expect(payload.url).toMatch(/^\/api\/media\/[0-9a-f-]{36}\.png$/);

    const name = payload.url.replace("/api/media/", "");
    const stored = await readFile(path.join(mediaUploadDir(), name));
    expect(stored.equals(PNG_BYTES)).toBe(true);
  });

  it("answers 401 for an anonymous caller and 403 for a read-only session, writing nothing", async () => {
    expect((await upload()).status).toBe(401);
    signInAs(["catalog:read"]);
    expect((await upload()).status).toBe(403);
    await expect(stat(mediaUploadDir())).rejects.toThrow();
  });

  it("refuses a non-image content type", async () => {
    signInAs(["catalog:write"]);
    expect((await upload(PNG_BYTES, "application/pdf")).status).toBe(415);
    expect((await upload(Buffer.alloc(0))).status).toBe(422);
  });
});

describe("GET /api/media/[...path]", () => {
  it("streams the stored bytes with long cache headers", async () => {
    signInAs(["catalog:write"]);
    const { url } = (await (await upload()).json()) as { url: string };
    const name = url.replace("/api/media/", "");

    const response = await read(name);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.equals(PNG_BYTES)).toBe(true);
  });

  it("404s a missing file and a traversal name", async () => {
    expect((await read("does-not-exist.png")).status).toBe(404);
    expect((await read("../secret.txt")).status).toBe(404);
  });
});

describe("the document stores a path, not a data URL", () => {
  it("saves an uploaded gallery path and reads it back", async () => {
    signInAs(["catalog:write"]);
    const { url } = (await (await upload()).json()) as { url: string };

    const seed = await getItemEntry("CSK-LUMINA");
    expect(seed).not.toBeNull();
    await saveItemEntry(
      "CSK-LUMINA",
      {
        ...seed,
        gallery: [{ id: "g1", src: url, alt: "The Lumina casket", caption: null, sample: false }],
      },
      "editor@vm.demo",
    );

    const saved = await getItemEntry("CSK-LUMINA");
    expect(saved?.gallery[0].src).toBe(url);
    expect(saved?.gallery[0].src.startsWith("data:")).toBe(false);
    expect((await storedMediaReferenceIssues([saved!.gallery[0].src])).length).toBe(0);
  });

  it("refuses to save an embedded data URL", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    await expect(
      saveItemEntry("CSK-LUMINA", {
        ...seed,
        gallery: [
          {
            id: "g1",
            src: `data:image/png;base64,${"A".repeat(500)}`,
            alt: "An embedded photo",
            caption: null,
            sample: false,
          },
        ],
      }),
    ).rejects.toThrow(/data URL/i);
  });
});

describe("the referenced-bytes guard", () => {
  it("fails a stored reference whose bytes are gone and a data URL", async () => {
    const missing = await storedMediaReferenceIssues(["/api/media/missing-photo.png"]);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("not in the media upload store");

    const embedded = await storedMediaReferenceIssues(["data:image/png;base64,AAAA"]);
    expect(embedded).toHaveLength(1);
    expect(embedded[0]).toContain("data URL");
  });

  it("leaves a library path and an https URL to their own rules", async () => {
    expect(await storedMediaReferenceIssues(["/media/chapel-common.jpg", "https://x.test/a.jpg"])).toEqual(
      [],
    );
  });

  it("leaves the src unchanged unless a media base is configured", () => {
    const stored = "/api/media/abc.png";
    expect(publicMediaUrl(stored, null)).toBe(stored);
    expect(publicMediaUrl("/media/chapel-common.jpg", "https://cdn.test")).toBe(
      "/media/chapel-common.jpg",
    );
    expect(publicMediaUrl(stored, "https://cdn.test")).toBe("https://cdn.test/api/media/abc.png");
    expect(storedMediaName(stored)).toBe("abc.png");
    // A nested or escaping name is never a stored reference.
    expect(storedMediaName("/api/media/../secret")).toBeNull();
  });

  it("reads MEDIA_PUBLIC_BASE_URL and trims trailing slashes", () => {
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.test/";
    try {
      expect(mediaPublicBaseUrl()).toBe("https://cdn.test");
      expect(publicMediaUrl("/api/media/x.png", mediaPublicBaseUrl())).toBe(
        "https://cdn.test/api/media/x.png",
      );
    } finally {
      delete process.env.MEDIA_PUBLIC_BASE_URL;
    }
    expect(mediaPublicBaseUrl()).toBeNull();
  });

  it("refuses a save whose stored reference has no bytes", async () => {
    const seed = await getItemEntry("CSK-LUMINA");
    await expect(
      saveItemEntry("CSK-LUMINA", {
        ...seed,
        gallery: [{ id: "g1", src: "/api/media/gone.png", alt: "Missing", caption: null, sample: false }],
      }),
    ).rejects.toThrow(/not in the media upload store/);
  });
});
