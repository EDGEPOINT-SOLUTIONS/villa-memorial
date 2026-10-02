/**
 * The durable-journal mechanics, in one place.
 *
 * WHY THIS EXISTS. Eleven fixture-mode stores had grown the SAME file mechanics —
 * `journalPath`, an `ENOENT`-tolerant read, a JSON + shape check, a temp-file + fsync +
 * `rename(2)` write, and a one-writer promise chain — each copy pasted and each slightly
 * differently worded. Adding two more stores in Phase 2 of the client-minutes work (the
 * page documents and the landing content) would have made it thirteen. This module is
 * the mechanics; WHAT is journalled stays with each store, because each has its own
 * record shape and its own field-by-field reader, and that is the part that must not be
 * generalised.
 *
 * WHAT IS *NOT* HERE, deliberately:
 *   · no record shape, no validation, no id or reference allocation — a store owns its
 *     own vocabulary (`lib/api-client/inquiry-store.ts` is the pattern to copy);
 *   · no cross-store locking. `createJournalLock()` mints a lock PER STORE, so two stores
 *     never serialize against each other. Sharing one global queue would be a silent
 *     performance coupling between unrelated domains.
 *
 * SERVER ONLY. It imports `node:fs` and `node:path`; nothing here may reach a client
 * component. The env-var name is passed in so a store keeps owning its own switch (and
 * `tests/setup.ts` keeps owning the redirect that stops a dev `.data/` store leaking into
 * a test).
 *
 * THE SIBLING STORES PREDATE THIS FILE. Phase 2 left them carrying their own copies of these
 * mechanics; Phase 7 (2026-09-28) moved all eleven commerce/ops stores onto this module, so
 * this is now the ONLY implementation. `tests/unit/journal-single-source.test.ts` fails a
 * store that grows a `node:fs` import, a `writeQueue`, or a hand-rolled `JSON.parse(raw)`
 * back. History: `docs/08-delivery/phase2-design/README.md` and `phase7-design/`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * The journal file a store reads and writes: its own env var when set (tests point it
 * at a throwaway directory), otherwise `.data/<filename>` under the app's cwd.
 */
export function journalPath(envVar: string, filename: string): string {
  const configured = process.env[envVar]?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join(process.cwd(), ".data", filename);
}

/**
 * The events in a journal file, oldest first.
 *
 * A MISSING FILE IS AN EMPTY JOURNAL — that is the normal first-run state, not an error.
 * A file that exists but cannot be read, is not JSON, or does not carry the documented
 * `{ version: 1, events: [...] }` envelope is a 500 naming the store: the app refuses to
 * guess, because silently starting from the seed would discard every recorded edit.
 */
export async function readJournalEvents(
  storePath: string,
  label: string,
): Promise<unknown[]> {
  let raw: string;
  try {
    raw = await fs.readFile(storePath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new ApiError(`the ${label} store could not be read`, 500);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(`the ${label} store file is not valid JSON`, 500);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ApiError(`the ${label} store file has an unexpected shape`, 500);
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.version !== 1 || !Array.isArray(envelope.events)) {
    throw new ApiError(`the ${label} store file has an unexpected shape`, 500);
  }
  return envelope.events;
}

/**
 * Replace a journal file atomically.
 *
 * The whole journal is written to a sibling temp file, flushed, then `rename(2)`d over
 * the store path — so a crash or a concurrent reader sees either the old file or the new
 * one, never a half-written one. The temp file is removed on any failure.
 */
export async function writeJournalEvents(
  storePath: string,
  label: string,
  events: unknown[],
): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true }).catch(() => {
    throw new ApiError(`the ${label} store directory could not be created`, 500);
  });
  const temp = `${storePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  const payload = JSON.stringify({ version: 1, events }, null, 2) + "\n";
  try {
    const handle = await fs.open(temp, "w");
    try {
      await handle.writeFile(payload, "utf8");
      // Flush before the rename so a crash cannot leave the renamed file empty.
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temp, storePath);
  } catch {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw new ApiError(`the ${label} store could not be written`, 500);
  }
}

/**
 * One writer per store.
 *
 * The returned function chains every mutation onto the previous one, so a
 * read-modify-write cycle is never interleaved by another request in the server process
 * that owns the store. Each store mints its own lock — see the note above.
 */
export function createJournalLock(): <T>(task: () => Promise<T>) => Promise<T> {
  let queue: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/**
 * The journal FILES in a directory, sorted, without their suffix.
 *
 * The per-thread chat store keeps one journal per conversation and must enumerate them
 * to build the office Inbox. The directory read belongs here, with the rest of the file
 * mechanics, so a store never grows its own `node:fs` import (the rule this module's
 * header states; `tests/unit/journal-single-source.test.ts` enforces it). A missing
 * directory is the normal empty state, not an error.
 */
export async function listJournalFiles(dir: string, suffix = ".json"): Promise<string[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new ApiError("the store directory could not be read", 500);
  }
  return names
    .filter((name) => name.endsWith(suffix) && name.length > suffix.length)
    .map((name) => name.slice(0, -suffix.length))
    .sort();
}
