import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getAgentProspect } from "@/lib/api-client/agent";
import { recordStageMove } from "@/lib/api-client/agent-store";
import { readStageMove } from "@/lib/agent/stage-move";
import { readJsonBody, requireAgentSession } from "../../../_guard";

/**
 * BFF: POST /api/agent/prospects/:id/stage — move a prospect one step forward.
 *
 * WHAT IT IS. The write behind the lead record's step-by-step acquisition (captain,
 * 2026-10-01). It records a move in the DEMO pipeline journal — `agent-store.ts`,
 * the same fold every agent surface reads — with the signed-in agent's name and
 * the note the agent typed. It is demo-local by construction and never claims a
 * crm-families contract: `lib/api-client/agent.ts` has no live branch and
 * `live-mode.ts` keeps the agent surface at state "none".
 *
 * WHAT STAYS OUT OF THE HANDLER. The legality of a move (a known forward stage
 * and a note present) is the pure reading in `lib/agent/stage-move.ts`; the write
 * is the store's. This file only refuses an unauthenticated session, a record the
 * agent does not own, and an unreadable body — the same thin posture as the
 * enquiries and cases routes (web/AGENTS.md rule 1).
 *
 * OWNERSHIP. An agent may move only a prospect they own; staff may correct any
 * record. Hiding the control is UX, so the check happens here too.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const found = await getAgentProspect(id);
  if (!found) {
    return NextResponse.json({ error: "no such lead" }, { status: 404 });
  }
  if (auth.portal === "agent" && found.prospect.owner !== auth.session.displayName) {
    return NextResponse.json({ error: "this lead belongs to another agent" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const verdict = readStageMove({
    currentStage: found.prospect.stage,
    stage: record.stage,
    note: record.note,
  });
  if (!verdict.ok) {
    return NextResponse.json(
      { error: Object.values(verdict.errors)[0], fieldErrors: verdict.errors },
      { status: 422 },
    );
  }

  try {
    const event = await recordStageMove({
      prospectId: id,
      stage: verdict.stage,
      by: auth.session.displayName,
      note: verdict.note,
    });
    const updated = await getAgentProspect(id);
    return NextResponse.json({ event, prospect: updated?.prospect ?? null }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the stage could not be moved" }, { status: 502 });
  }
}
