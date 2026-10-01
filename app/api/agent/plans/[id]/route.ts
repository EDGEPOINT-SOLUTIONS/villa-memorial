import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { removePlan, updatePlan } from "@/lib/api-client/agent-plan-store";
import { readPlanPatch } from "@/lib/agent/agent-plans";
import { readJsonBody, requireAgentSession } from "../../_guard";

/**
 * BFF: PATCH /api/agent/plans/:id (edit · mark done) and DELETE /api/agent/plans/:id.
 *
 * The rest of the planner write path behind `app/api/agent/plans/route.ts`:
 * changing what a plan says, its time, its day or its done state, and removing it.
 * Both record in the DEMO planner journal and both are read back by the same fold
 * the calendar and the sign-in notice use, so no surface can disagree.
 *
 * The handler stays thin: the shape of an edit is the pure `readPlanPatch` reading
 * and the merge is `applyPlanPatch`, both in `lib/agent/agent-plans.ts`; the store
 * owns the append. It refuses an unauthenticated session, a session outside the
 * agent portal, an unreadable body and an edit that changes nothing.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const verdict = readPlanPatch(body);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: Object.values(verdict.errors)[0], fieldErrors: verdict.errors },
      { status: 422 },
    );
  }

  try {
    const plan = await updatePlan({ id, patch: verdict.value });
    if (!plan) {
      return NextResponse.json({ error: "no such plan" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the plan could not be changed" }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAgentSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const removed = await removePlan({ id });
    if (!removed) {
      return NextResponse.json({ error: "no such plan" }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the plan could not be removed" }, { status: 502 });
  }
}
