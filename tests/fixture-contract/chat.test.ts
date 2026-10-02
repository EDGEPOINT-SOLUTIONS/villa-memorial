import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import threadsFile from "@/lib/fixtures/chat/threads.json";
import manifestFile from "@/lib/fixtures/chat/files/manifest.json";
import personasFile from "@/lib/fixtures/auth/personas.json";
import agentFile from "@/lib/fixtures/agent/workspace.json";
import { chatThreadIdFor } from "@/lib/chat";
import { chatAttachmentMime } from "@/lib/chat-attachments";

/**
 * The chat fixture contract — the recorded seed threads and their committed files.
 *
 * The recorded conversations are app-authored demo data, but the parts that must never
 * drift are mechanical: a thread id is derived from its participant, every attachment row
 * addresses real bytes whose sha256 it names, every file is on the allow-list, and the two
 * sign-in-able threads belong to the actual demo personas (customer@vm.demo and the agent
 * workspace). This test recomputes the hashes from the committed files so a hand-edited
 * JSON can never point at nothing.
 */

const FILES_DIR = path.join(process.cwd(), "lib", "fixtures", "chat", "files");

type Thread = {
  id: string;
  kind: string;
  participant_id: string;
  participant_name: string;
  subject: string;
  messages: Array<{ id: string; body: string; attachments: Array<{ id: string; name: string; mime: string; size: number }> }>;
};

const threads = (threadsFile as { threads: Thread[] }).threads;
const manifest = (manifestFile as { files: Array<{ id: string; name: string; mime: string; file: string; size: number }> }).files;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("chat seed threads", () => {
  it("names each thread after its participant", () => {
    for (const thread of threads) {
      expect(chatThreadIdFor(thread.kind as "family" | "agent", thread.participant_id), thread.id).toBe(thread.id);
    }
  });

  it("bind the two sign-in-able threads to the real demo personas", () => {
    const customer = personasFile.personas.find((persona) => persona.email === "customer@vm.demo");
    const familyThread = threads.find((thread) => thread.participant_id === customer?.user_id);
    expect(familyThread, "a family thread belongs to customer@vm.demo").toBeDefined();

    const agentId = (agentFile as { agent: { id: string } }).agent.id;
    expect(threads.some((thread) => thread.kind === "agent" && thread.participant_id === agentId)).toBe(true);
  });

  it("pins every attachment row to a committed file's real sha256", () => {
    for (const thread of threads) {
      for (const message of thread.messages) {
        for (const attachment of message.attachments) {
          const entry = manifest.find((item) => item.id === attachment.id);
          expect(entry, `${attachment.name} is in the manifest`).toBeDefined();
          expect(entry!.name).toBe(attachment.name);
          expect(entry!.mime).toBe(attachment.mime);
          expect(entry!.size).toBe(attachment.size);

          const file = path.join(FILES_DIR, entry!.file);
          expect(existsSync(file), `${entry!.file} exists`).toBe(true);
          const bytes = readFileSync(file);
          expect(sha256(bytes), `${entry!.file} matches its address`).toBe(attachment.id);
          expect(bytes.byteLength).toBe(attachment.size);
          expect(chatAttachmentMime(attachment.name, attachment.mime), attachment.name).toBe(
            attachment.mime,
          );
        }
      }
    }
  });

  it("keeps the board's own attached thread intact", () => {
    const santos = threads.find((thread) => thread.subject === "Santos family");
    expect(santos).toBeDefined();
    const names = santos!.messages.flatMap((message) => message.attachments.map((a) => a.name));
    expect(names).toEqual(["application-santos.pdf", "id-front.jpg", "schedule.xlsx"]);
    expect(santos!.messages[0].body).toContain("signed application");
  });

  it("states no amount or currency anywhere in the seed", () => {
    const raw = JSON.stringify(threads);
    expect(raw).not.toMatch(/₱|PHP|\bamount\b|\bprice\b/i);
  });
});
