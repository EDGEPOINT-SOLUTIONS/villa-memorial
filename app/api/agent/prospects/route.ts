import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getAgentProspect } from "@/lib/api-client/agent";
import { recordProspectCapture } from "@/lib/api-client/agent-store";
import { readLeadCapture } from "@/lib/agent/lead-capture";
import { readJsonBody, requireAgentSession } from "../_guard";

/**
 * BFF: POST /api/agent/prospects — capture a lead in the field.
 *
 * WHAT IT IS. The write behind `/agent/new`. A lead captured at the door must
 * reach the pipeline the agent works from, or the capture is only a note. It is
 * recorded in the DEMO pipeline journal (`agent-store.ts`) — the same fold every
 * agent surface reads — with the signed-in agent's own name. It is demo-local by
 * construction and never claims a crm-families contract: `lib/api-client/agent.ts`
 * has no live branch and `live-mode.ts` keeps the agent surface at state "none".
 *
 * WHAT STAYS OUT OF THE HANDLER. The validation is the pure reading in
 * `lib/agent/lead-capture.ts` (one reading, shared with the form, so a field
 * error is the same sentence in both places); the write is the store's. This
 * file refuses an unauthenticated session, a body it cannot read and an invalid
 * capture — the same thin posture as the stage route (web/AGENTS.md rule 1).
 */
export async function POST(request: Request) {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const verdict = readLeadCapture(body);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error: Object.values(verdict.errors)[0] ?? "The lead could not be saved.",
        fieldErrors: verdict.errors,
      },
      { status: 422 },
    );
  }

  try {
    const capture = await recordProspectCapture({
      capture: {
        id: `prospect-${randomUUID()}`,
        ...verdict.value,
        captured_by: auth.session.displayName,
      },
    });
    const created = await getAgentProspect(capture.id);
    return NextResponse.json({ prospect: created?.prospect ?? null }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the lead could not be saved" }, { status: 502 });
  }
}
