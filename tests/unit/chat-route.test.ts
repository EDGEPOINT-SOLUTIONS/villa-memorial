import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * The chat BFF routes — the guards that make a thread reachable only by the office and
 * the one participant it belongs to, plus the send path's refusals. Cookies are mocked;
 * each test gets fresh store/attachment directories.
 */

/* --- test-only demo fixture (clean start, captain 2026-10-03) --- */
vi.mock("@/lib/fixtures/chat/threads.json", async () => ({
  default: (await import("../fixtures/chat-threads-demo.json")).default,
}));
/* --- end test-only demo fixture --- */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const threadsRoute = await import("@/app/api/chat/threads/route");
const threadRoute = await import("@/app/api/chat/threads/[id]/route");
const readRoute = await import("@/app/api/chat/threads/[id]/read/route");
const attachmentRoute = await import("@/app/api/chat/attachments/[hash]/route");

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const FAMILY_ID = "00000000-0000-4000-8000-000000000014";
const FAMILY_THREAD = `family-${FAMILY_ID}`;
const SANTOS_THREAD = "family-00000000-0000-4000-8000-000000000201";
const SANTOS_PDF = "4675e4aef27238ad7bf3361a26c6d976ce1c4279fba43f13a0d889f8974b2941";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-chat-route-"));
  process.env.CHAT_STORE_DIR = path.join(dir, "chat");
  process.env.CHAT_ATTACHMENTS_DIR = path.join(dir, "attachments");
  cookieJar.values = {};
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signInAs(userId: string, displayName: string, scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  cookieJar.values.im_at = `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: userId,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({ id: userId, tenant_id: TENANT_ID, email: `${userId}@vm.demo`, display_name: displayName }),
    "utf8",
  ).toString("base64");
}

const signInOffice = (scopes = ["cases:read", "cases:write"]) =>
  signInAs("00000000-0000-4000-8000-000000000012", "Sam Staff", scopes);
const signInFamily = () => signInAs(FAMILY_ID, "Cory Customer", ["tenancy:modules:read", "catalog:read"]);
const signInAgent = () =>
  signInAs("00000000-0000-4000-8000-000000000013", "Alex Agent", [
    "tenancy:modules:read",
    "catalog:read",
    "orders:read",
    "property:read",
  ]);

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}
function hashParams(hash: string) {
  return { params: Promise.resolve({ hash }) };
}

function upload(body: string, files: Array<{ name: string; type: string; bytes: Buffer }> = []) {
  const form = new FormData();
  form.set("body", body);
  for (const file of files) {
    // A fresh Uint8Array copy keeps the BlobPart tied to a plain ArrayBuffer.
    form.append("files", new File([new Uint8Array(file.bytes)], file.name, { type: file.type }));
  }
  return form;
}

function post(id: string, form: FormData) {
  return threadRoute.POST(
    new Request(`http://localhost/api/chat/threads/${id}`, { method: "POST", body: form }),
    params(id),
  );
}

function get(id: string) {
  return threadRoute.GET(new Request(`http://localhost/api/chat/threads/${id}`), params(id));
}

describe("the Admin Inbox list route", () => {
  it("401s signed out and 403s a non-staff session", async () => {
    expect((await threadsRoute.GET()).status).toBe(401);
    signInFamily();
    expect((await threadsRoute.GET()).status).toBe(403);
  });

  it("lists every conversation for a cases:read session", async () => {
    signInOffice(["cases:read"]);
    const res = await threadsRoute.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { threads: Array<{ id: string }>; unread: number };
    expect(body.threads.map((thread) => thread.id)).toContain(SANTOS_THREAD);
    expect(body.unread).toBe(1);
  });
});

describe("opening one thread", () => {
  it("401s signed out", async () => {
    expect((await get(FAMILY_THREAD)).status).toBe(401);
  });

  it("lets the participant open their own thread and records delivery", async () => {
    signInFamily();
    const res = await get(FAMILY_THREAD);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { thread: { id: string } };
    expect(body.thread.id).toBe(FAMILY_THREAD);
  });

  it("403s a participant reaching another family's thread", async () => {
    signInFamily();
    expect((await get(SANTOS_THREAD)).status).toBe(403);
  });

  it("lets the office open every thread", async () => {
    signInOffice();
    expect((await get(SANTOS_THREAD)).status).toBe(200);
  });

  it("lets an agent open their own thread", async () => {
    signInAgent();
    expect((await get("agent-00000000-0000-4000-8000-000000000013")).status).toBe(200);
  });
});

describe("sending", () => {
  it("401s signed out and 403s a participant writing to another thread", async () => {
    expect((await post(FAMILY_THREAD, upload("hello"))).status).toBe(401);
    signInFamily();
    expect((await post(SANTOS_THREAD, upload("hello"))).status).toBe(403);
  });

  it("opens a message on the family's own thread", async () => {
    signInFamily();
    const res = await post(FAMILY_THREAD, upload("Friday works for us."));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { thread: { messages: Array<{ body: string; author: string }> } };
    const last = body.thread.messages.at(-1);
    expect(last?.body).toBe("Friday works for us.");
    expect(last?.author).toBe("participant");
  });

  it("404s an office send to a conversation that does not exist", async () => {
    signInOffice();
    expect((await post("family-nobody", upload("hello"))).status).toBe(404);
  });

  it("explains a refused file type (415) and an oversized file (413)", async () => {
    signInFamily();
    const badType = await post(
      FAMILY_THREAD,
      upload("", [{ name: "virus.exe", type: "application/octet-stream", bytes: Buffer.from("x") }]),
    );
    expect(badType.status).toBe(415);
    expect(((await badType.json()) as { error: string }).error).toContain("docx");

    const tooBig = await post(
      FAMILY_THREAD,
      upload("", [
        { name: "big.pdf", type: "application/pdf", bytes: Buffer.alloc(10 * 1024 * 1024 + 1) },
      ]),
    );
    expect(tooBig.status).toBe(413);
    expect(((await tooBig.json()) as { error: string }).error).toContain("big.pdf");
  });

  it("422s a message with neither words nor a file", async () => {
    signInFamily();
    expect((await post(FAMILY_THREAD, upload("   "))).status).toBe(422);
  });

  it("sends an attachment and serves it back to the owner", async () => {
    signInFamily();
    const res = await post(
      FAMILY_THREAD,
      upload("", [
        { name: "note.pdf", type: "application/pdf", bytes: Buffer.from("attachment bytes") },
      ]),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      thread: { messages: Array<{ attachments: Array<{ id: string }> }> };
    };
    const hash = body.thread.messages.at(-1)!.attachments[0].id;
    const served = await attachmentRoute.GET(
      new Request(`http://localhost/api/chat/attachments/${hash}`),
      hashParams(hash),
    );
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await served.arrayBuffer()).toString("utf8")).toBe("attachment bytes");
  });
});

describe("read and attachment access", () => {
  it("marks the thread read for the office", async () => {
    signInOffice();
    const res = await readRoute.POST(new Request("http://localhost", { method: "POST" }), params(SANTOS_THREAD));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { thread: { unread_for_office: number } };
    expect(body.thread.unread_for_office).toBe(0);
  });

  it("does not serve one family an attachment held in another family's thread", async () => {
    signInFamily();
    const denied = await attachmentRoute.GET(
      new Request(`http://localhost/api/chat/attachments/${SANTOS_PDF}`),
      hashParams(SANTOS_PDF),
    );
    expect(denied.status).toBe(404);
  });

  it("serves the office an attachment its own thread references", async () => {
    signInOffice();
    const res = await attachmentRoute.GET(
      new Request(`http://localhost/api/chat/attachments/${SANTOS_PDF}`),
      hashParams(SANTOS_PDF),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("401s the attachment route signed out and 404s a malformed address", async () => {
    expect(
      (await attachmentRoute.GET(new Request("http://localhost"), hashParams(SANTOS_PDF))).status,
    ).toBe(401);
    signInOffice();
    expect(
      (await attachmentRoute.GET(new Request("http://localhost"), hashParams("../evil"))).status,
    ).toBe(404);
  });
});
