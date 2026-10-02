import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  chatThreadPath,
  findChatAttachment,
  getChatThread,
  listChatThreads,
  markThreadDelivered,
  markThreadRead,
  postChatMessage,
  totalOfficeUnread,
} from "@/lib/api-client/chat-store";

/**
 * The durable chat store — one append-only journal per thread, folded onto the recorded
 * seed, with content-addressed attachments. Each test gets its own throwaway
 * CHAT_STORE_DIR / CHAT_ATTACHMENTS_DIR so a demo message never leaks between suites.
 */

const FAMILY_THREAD = "family-00000000-0000-4000-8000-000000000014";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-chat-store-"));
  process.env.CHAT_STORE_DIR = path.join(dir, "chat");
  process.env.CHAT_ATTACHMENTS_DIR = path.join(dir, "attachments");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function pdf(name: string, bytes = Buffer.from("hello chat")) {
  return { name, declaredMime: "application/pdf", bytes };
}

describe("the seed folds onto empty journals", () => {
  it("lists the recorded conversations, newest activity first", async () => {
    const threads = await listChatThreads();
    expect(threads.map((t) => t.subject)).toEqual([
      "Santos family",
      "Alex Agent",
      "Cory Customer · Dela Cruz family",
    ]);
    expect(threads[0].message_count).toBe(3);
    expect(threads[0].attachment_count).toBe(3);
  });

  it("reads one thread with its attachments and per-message state", async () => {
    const thread = await getChatThread("family-00000000-0000-4000-8000-000000000201");
    expect(thread?.messages[0].body).toBe("Here is the signed application and the ID.");
    expect(thread?.messages[0].state).toBe("read");
    expect(thread?.messages[1].attachments[0].name).toBe("schedule.xlsx");
  });

  it("counts the office's unread messages for the Inbox badge", async () => {
    // The Santos thread's last participant message is still only `sent`.
    expect(await totalOfficeUnread()).toBe(1);
  });

  it("copies the recorded seed files into the attachment store", async () => {
    await getChatThread("family-00000000-0000-4000-8000-000000000201");
    const names = await readdir(process.env.CHAT_ATTACHMENTS_DIR!);
    expect(names).toContain("4675e4aef27238ad7bf3361a26c6d976ce1c4279fba43f13a0d889f8974b2941");
    expect(names).toContain("bde090afc4d5ca8f44d02ca97432bf0388ba80c84314b1f98183c39c09d28948");
  });
});

describe("posting a message", () => {
  it("appends one event to the thread's journal and folds it back", async () => {
    const view = await postChatMessage({
      threadId: FAMILY_THREAD,
      author: "participant",
      authorName: "Cory Customer",
      body: "One more thing, please.",
      now: new Date("2026-10-02T03:00:00Z"),
    });
    expect(view.messages.at(-1)?.body).toBe("One more thing, please.");
    expect(view.messages.at(-1)?.author).toBe("participant");
    expect(view.messages.at(-1)?.state).toBe("sent");

    const raw = JSON.parse(await readFile(chatThreadPath(FAMILY_THREAD), "utf8")) as {
      version: number;
      events: Array<{ kind: string }>;
    };
    expect(raw.version).toBe(1);
    expect(raw.events.map((event) => event.kind)).toEqual(["message_posted"]);

    const reread = await getChatThread(FAMILY_THREAD);
    expect(reread?.messages.at(-1)?.body).toBe("One more thing, please.");
  });

  it("stores a file under its sha256 and a re-upload costs nothing", async () => {
    const before = (await readdir(process.env.CHAT_ATTACHMENTS_DIR!).catch(() => [])) as string[];
    const file = pdf("note.pdf", Buffer.from("same bytes"));
    const first = await postChatMessage({
      threadId: FAMILY_THREAD,
      author: "participant",
      authorName: "Cory Customer",
      body: "",
      files: [file],
    });
    const id = first.messages.at(-1)!.attachments[0].id;
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(path.join(process.env.CHAT_ATTACHMENTS_DIR!, id))).toBe(true);

    await postChatMessage({
      threadId: FAMILY_THREAD,
      author: "participant",
      authorName: "Cory Customer",
      body: "",
      files: [file],
    });
    const after = await readdir(process.env.CHAT_ATTACHMENTS_DIR!);
    // The file was written once; the second upload reused the same address.
    expect(after.filter((name) => name === id)).toHaveLength(1);
    expect(new Set(after).size).toBe(after.length);
    expect(before.length).toBeLessThanOrEqual(after.length);
  });

  it("refuses an off-list file, an oversized file and an empty message, writing nothing", async () => {
    await expect(
      postChatMessage({
        threadId: FAMILY_THREAD,
        author: "participant",
        authorName: "Cory Customer",
        body: "",
        files: [{ name: "virus.exe", declaredMime: "application/octet-stream", bytes: Buffer.from("x") }],
      }),
    ).rejects.toMatchObject({ status: 415 });

    await expect(
      postChatMessage({
        threadId: FAMILY_THREAD,
        author: "participant",
        authorName: "Cory Customer",
        body: "",
        files: [{ name: "big.pdf", declaredMime: "application/pdf", bytes: Buffer.alloc(10 * 1024 * 1024 + 1) }],
      }),
    ).rejects.toMatchObject({ status: 413 });

    await expect(
      postChatMessage({
        threadId: FAMILY_THREAD,
        author: "participant",
        authorName: "Cory Customer",
        body: "   ",
      }),
    ).rejects.toMatchObject({ status: 422 });

    expect(existsSync(chatThreadPath(FAMILY_THREAD))).toBe(false);
  });

  it("opens a brand-new conversation for a participant who has none", async () => {
    const id = "family-new-person";
    const view = await postChatMessage({
      threadId: id,
      author: "participant",
      authorName: "New Family",
      body: "Hello, we need help.",
      open: {
        kind: "family",
        participant_id: "new-person",
        participant_name: "New Family",
        subject: "New Family",
      },
    });
    expect(view.id).toBe(id);
    expect(view.subject).toBe("New Family");
    const ids = (await listChatThreads()).map((thread) => thread.id);
    expect(ids).toContain(id);
  });

  it("refuses an open whose participant does not match the thread id", async () => {
    await expect(
      postChatMessage({
        threadId: "family-someone",
        author: "participant",
        authorName: "X",
        body: "hi",
        open: {
          kind: "family",
          participant_id: "someone-else",
          participant_name: "X",
          subject: "X",
        },
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("delivery and read states append, never overwrite", () => {
  it("moves a scored send to delivered and then read", async () => {
    await postChatMessage({
      threadId: FAMILY_THREAD,
      author: "participant",
      authorName: "Cory Customer",
      body: "Still here?",
      now: new Date("2026-10-02T03:00:00Z"),
    });
    const delivered = await markThreadDelivered(FAMILY_THREAD, "office");
    const last = delivered!.messages.at(-1)!;
    expect(last.state).toBe("delivered");

    const read = await markThreadRead(FAMILY_THREAD, "office");
    expect(read!.messages.at(-1)!.state).toBe("read");
    expect(read!.messages.at(-1)!.state_trail).toEqual(["sent", "delivered", "read"]);
    expect(read!.unread_for_office).toBe(0);
  });

  it("does not downgrade a read message", async () => {
    const before = await getChatThread("family-00000000-0000-4000-8000-000000000201");
    const after = await markThreadDelivered("family-00000000-0000-4000-8000-000000000201", "office");
    const first = after!.messages.find((m) => m.id === before!.messages[0].id)!;
    expect(first.state).toBe("read");
  });
});

describe("store integrity", () => {
  it("500s a corrupt journal rather than guessing", async () => {
    const file = chatThreadPath(FAMILY_THREAD);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "{ not json", "utf8");
    await expect(getChatThread(FAMILY_THREAD)).rejects.toMatchObject({ status: 500 });
  });

  it("reads an unknown address as null (the route turns that into a 404)", async () => {
    expect(await getChatThread("family-not-a-real-person")).toBeNull();
    expect(await getChatThread("../etc/passwd")).toBeNull();
  });

  it("resolves an attachment only for a viewer who can open a referencing thread", async () => {
    const thread = await getChatThread("family-00000000-0000-4000-8000-000000000201");
    const hash = thread!.messages[0].attachments[0].id;
    expect(await findChatAttachment(hash, { role: "office" })).not.toBeNull();
    expect(
      await findChatAttachment(hash, {
        role: "family",
        userId: "00000000-0000-4000-8000-000000000014",
      }),
    ).toBeNull();
    expect(await findChatAttachment("c".repeat(64), { role: "office" })).toBeNull();
  });
});
