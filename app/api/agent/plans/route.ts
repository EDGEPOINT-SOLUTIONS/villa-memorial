import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { createPlan } from "@/lib/api-client/agent-plan-store";
import { listAgentPlans } from "@/lib/api-client/agent";
import { readPlanDraft } from "@/lib/agent/agent-plans";
import { readJsonBody, requireAgentSession } from "../_guard";

/**
 * BFF: GET /api/agent/plans, POST /api/agent/plans — the agent's own day planner.
 *
 * WHAT IT IS. The write behind the day calendar's planner (captain, 2026-10-02):
 * an agent picks a day and records what they plan to do on it, with an optional
 * time and note. It records into the DEMO planner journal
 * (`lib/api-client/agent-plan-store.ts`), the same fold the calendar and the
 * sign-in notice read, with the signed-in agent's name. It is demo-local by
 * construction and never claims a scheduling contract: `lib/api-client/agent.ts`
 * has no live branch and `live-mode.ts` keeps the agent surface at state "none".
 *
 * WHAT STAYS OUT OF THE HANDLER. The shape of a plan (a real day, a title, an
 * optional `HH:mm` time and note) is the pure reading in
 * `lib/agent/agent-plans.ts`; the write is the store's. This file only refuses an
 * unauthenticated session, a session outside the agent portal, and an unreadable
 * body — the same thin posture as the stage route (web/AGENTS.md rule 1).
 *
 * HONESTY. A plan is the agent's own note, not the office's diary and not a
 * booking. No handler here confirms a slot, promises a reminder, or touches the
 * office's recorded appointments.
 */
export async function GET() {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ plans: await listAgentPlans() });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the plans could not be read" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const verdict = readPlanDraft(body);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: Object.values(verdict.errors)[0], fieldErrors: verdict.errors },
      { status: 422 },
    );
  }

  try {
    const plan = await createPlan({ draft: verdict.value, by: auth.session.displayName });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the plan could not be saved" }, { status: 502 });
  }
}
