import { NextResponse } from "next/server";
import { getAgentProspect } from "@/lib/api-client/agent";
import { listOfficeAgentNames } from "@/lib/api-client/agent-roster";
import { recordProspectAssignment, recordStageMove } from "@/lib/api-client/agent-store";
import { readProspectAssignment, readProspectStateMove } from "@/lib/crm/prospect-actions";
import { errorResponse, firstError, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/prospects/:id — the office's two writes on one prospect.
 *
 *   · `{ action: "advance", state }` records an ordinary FORWARD stage move
 *     (`lib/crm/prospect-view.ts` maps the office's word to a pipeline rung), so
 *     the state appears in the agent's pipeline with no second write; and
 *   · `{ action: "assign", agent, note }` records an assignment on the same
 *     journal, which is what folds into the agent's `owner` and produces the
 *     durable notice in the agent's portal.
 *
 * Both are demo-local (`lib/api-client/agent-store.ts`); no CRM service exists to
 * call. The rules live in the pure `lib/crm/prospect-actions.ts`; this file reads
 * the body, asks for a verdict and persists through the store.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const found = await getAgentProspect(id);
  if (!found) {
    return NextResponse.json({ error: "no such prospect" }, { status: 404 });
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  try {
    if (record.action === "advance") {
      const verdict = readProspectStateMove({
        state: record.state,
        currentStage: found.prospect.stage,
      });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: firstError(verdict.errors, "The state could not be moved."), fieldErrors: verdict.errors },
          { status: 422 },
        );
      }
      await recordStageMove({
        prospectId: id,
        stage: verdict.stage,
        by: auth.actor,
        note: verdict.note,
      });
    } else if (record.action === "assign") {
      const verdict = readProspectAssignment({
        agent: record.agent,
        note: record.note,
        agents: await listOfficeAgentNames(),
      });
      if (!verdict.ok) {
        return NextResponse.json(
          { error: firstError(verdict.errors, "The prospect could not be assigned."), fieldErrors: verdict.errors },
          { status: 422 },
        );
      }
      await recordProspectAssignment({
        prospectId: id,
        agent: verdict.agent,
        by: auth.actor,
        note: verdict.note,
      });
    } else {
      return NextResponse.json({ error: 'action must be "advance" or "assign"' }, { status: 422 });
    }

    const updated = await getAgentProspect(id);
    return NextResponse.json({ prospect: updated?.prospect ?? null }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the prospect could not be saved");
  }
}
