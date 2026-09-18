import { NextResponse } from "next/server";
import { setCaseStage } from "@/lib/api-client/operations";
import { isCaseStage } from "@/lib/operations/case-board";
import { errorResponse, readJsonBody, requireCasesScope } from "../../_guard";

/**
 * BFF: POST /api/cases/:number/stage — advances (or corrects) a case's stage.
 *
 * Thin proxy over funeral-cases `POST /cases/api/v1/cases/:number/stage`
 * (case-events-v1, scope `cases:write`), which appends that stage's task template and
 * emits `case.stage_changed`. The stage enum is validated here only so a malformed
 * request never leaves the app; the service stays the authority on whether a move is
 * allowed. Fixture mode goes through the in-process case store.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const auth = await requireCasesScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  const stage =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).stage : undefined;
  if (!isCaseStage(stage)) {
    return NextResponse.json({ error: "unknown case stage" }, { status: 422 });
  }

  const { number } = await params;
  try {
    return NextResponse.json(await setCaseStage(number, stage));
  } catch (err) {
    return errorResponse(err, "the stage could not be changed");
  }
}
