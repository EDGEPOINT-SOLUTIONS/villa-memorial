/**
 * Durable fixture-mode store for the agent acquisition pipeline — the demo
 * journal of stage moves the prospect record writes and every agent surface folds.
 *
 * WHY A FILE STORE. The pipeline used to be read-only: the record drew the
 * recorded `stage_history` and the move controls were designed but disabled,
 * because no crm-families write contract names a stage endpoint. The captain
 * asked (2026-10-01) to make the step-by-step acquisition work in the demo, so
 * the demo needs somewhere for a move to survive a restart and reach the office's
 * screens. This is that place — and it is demo-local by construction, exactly the
 * way the enquiry capture queue is: a local journal folded onto the recorded
 * fixture, never a claim of a live contract.
 *
 * THE REPO'S PATTERN, NOT A NEW ONE. Identical in shape to `inquiry-store.ts` and
 * the commerce stores:
 *   - append-only journal on disk; every read folds it, oldest first;
 *   - the whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d
 *     over the store path, so a crash or a concurrent reader never sees a half
 *     file;
 *   - mutations run through ONE in-process promise chain (`createJournalLock`),
 *     so two moves at once cannot interleave a read-modify-write;
 *   - path: `AGENT_STORE_PATH` when set (tests), else `.data/agent-pipeline.json`
 *     under the app's cwd (gitignored).
 *
 * WHAT IS *NOT* HERE. The record shape is the pipeline's own `StageMoveEvent`
 * (`lib/agent/acquisition.ts`), and the legality of a move (forward-only, a note
 * present) is a pure reading in `lib/agent/stage-move.ts` — the store owns only
 * persistence, the id-less event and the timestamp.
 *
 * LIVE MODE. No frozen contract names a crm-families stage-write endpoint, so
 * `lib/api-client/agent.ts` never claims live mode (`live-mode.ts` state "none").
 * This store serves fixture mode only; there is no flag that can route a real
 * customer's stage change into a local file.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import type { StageMoveEvent } from "@/lib/agent/acquisition";

export function agentPipelineStorePath(): string {
  return journalPath("AGENT_STORE_PATH", "agent-pipeline.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed agent pipeline store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader for one persisted move; extra keys are ignored. */
function toStageMoveEvent(raw: unknown): StageMoveEvent {
  if (typeof raw !== "object" || raw === null) malformed("move row");
  const r = raw as Record<string, unknown>;
  return {
    prospect_id: requiredString(r.prospect_id, "move prospect_id"),
    stage: requiredString(r.stage, "move stage"),
    at: requiredString(r.at, "move timestamp"),
    by: requiredString(r.by, "move author"),
    note: requiredString(r.note, "move note"),
  };
}

export async function listStageMoveEvents(): Promise<StageMoveEvent[]> {
  const events = await readJournalEvents(agentPipelineStorePath(), "agent pipeline");
  return events.map(toStageMoveEvent);
}

/** Append one move and return it. Serialized with every other write to this store. */
const withStoreLock = createJournalLock();

export function recordStageMove(args: {
  prospectId: string;
  stage: string;
  by: string;
  note: string;
  now?: Date;
}): Promise<StageMoveEvent> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await listStageMoveEvents();
    const event: StageMoveEvent = {
      prospect_id: args.prospectId,
      stage: args.stage,
      at: now.toISOString(),
      by: args.by,
      note: args.note,
    };
    await writeJournalEvents(agentPipelineStorePath(), "agent pipeline", [...events, event]);
    return event;
  });
}
