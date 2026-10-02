import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAgentProspect } from "@/lib/api-client/agent";
import { listOfficeAgentNames } from "@/lib/api-client/agent-roster";
import { recordProspectAssignment, recordProspectCapture } from "@/lib/api-client/agent-store";
import { readProspectAssignment, readProspectIntake } from "@/lib/crm/prospect-actions";
import { errorResponse, firstError, readJsonBody, requireStaffScope } from "../_guard";

/**
 * BFF: POST /api/staff/prospects — the office adds a prospect.
 *
 * WHAT IT IS. The write behind the Prospects screen's "Add a prospect" form. The
 * person is recorded on the SAME durable demo journal the agent portal folds
 * (`lib/api-client/agent-store.ts`), so a prospect the office types reaches the
 * agent pipeline, the board and the funnel exactly like a lead captured in the
 * field. An assignment given at creation is recorded as its own event so the
 * assigned agent gets the durable notice.
 *
 * DEMO-LOCAL, NEVER LIVE. No frozen contract names a customer-records write and
 * `lib/api-client/crm.ts` refuses live mode with a named 503, so this route serves
 * fixture mode only. It never claims a CRM contract.
 *
 * RULES STAY OUT OF THE HANDLER. The intake reading is the pure
 * `lib/crm/prospect-actions.ts`; the write is the store's. This file reads a body,
 * asks for a verdict and maps the outcome to a status code.
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const verdict = readProspectIntake(record);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: firstError(verdict.errors, "The prospect could not be saved."), fieldErrors: verdict.errors },
      { status: 422 },
    );
  }

  try {
    const capture = await recordProspectCapture({
      capture: { id: `prospect-${randomUUID()}`, ...verdict.value, captured_by: auth.actor },
    });

    // An assignee chosen at creation is recorded and validated like any other
    // assignment; an invalid one is refused rather than silently dropped.
    let assignment = record.agent;
    if (typeof assignment === "string" && assignment.trim().length > 0) {
      const names = await listOfficeAgentNames();
      const assigned = readProspectAssignment({
        agent: assignment,
        note: typeof record.assignNote === "string" ? record.assignNote : "",
        agents: names,
      });
      if (!assigned.ok) {
        return NextResponse.json(
          { error: firstError(assigned.errors, "The prospect was saved but could not be assigned."), fieldErrors: assigned.errors },
          { status: 422 },
        );
      }
      await recordProspectAssignment({
        prospectId: capture.id,
        agent: assigned.agent,
        by: auth.actor,
        note: assigned.note,
      });
      assignment = assigned.agent;
    }

    const created = await getAgentProspect(capture.id);
    return NextResponse.json({ prospect: created?.prospect ?? null }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the prospect could not be saved");
  }
}
