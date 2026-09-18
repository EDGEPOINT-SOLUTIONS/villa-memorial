import { NextResponse } from "next/server";
import { setCaseTaskStatus } from "@/lib/api-client/operations";
import { isCaseTaskStatus } from "@/lib/operations/case-board";
import { errorResponse, readJsonBody, requireCasesScope } from "../../../_guard";

/**
 * BFF: PATCH /api/cases/:number/tasks/:taskId — sets one task's status.
 *
 * Thin proxy over funeral-cases `PATCH /cases/api/v1/cases/:number/tasks/:id`
 * (case-events-v1, scope `cases:write`). The task is addressed by the id the case
 * carries, never by title or row position. Fixture mode goes through the in-process
 * case store, so the board is demonstrable without the platform.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ number: string; taskId: string }> },
) {
  const auth = await requireCasesScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  const status =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).status
      : undefined;
  if (!isCaseTaskStatus(status)) {
    return NextResponse.json({ error: "unknown task status" }, { status: 422 });
  }

  const { number, taskId } = await params;
  try {
    return NextResponse.json(await setCaseTaskStatus(number, taskId, status));
  } catch (err) {
    return errorResponse(err, "the task could not be updated");
  }
}
