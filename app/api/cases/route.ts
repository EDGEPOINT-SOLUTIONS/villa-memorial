import { NextResponse } from "next/server";
import { createCase } from "@/lib/api-client/operations";
import { intakeFromForm } from "@/lib/contracts/intake-input";
import { errorResponse, readJsonBody, requireCasesScope } from "./_guard";

/**
 * BFF: POST /api/cases — opens a case at the counter, with no order in front of it.
 *
 * The scope check is UX, not security: funeral-cases re-checks `cases:write` on the token
 * and remains the only authority (web/AGENTS.md rule 3).
 */
export async function POST(request: Request) {
  const auth = await requireCasesScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await createCase(intakeFromForm(body)), { status: 201 });
  } catch (err) {
    return errorResponse(err, "could not open the case");
  }
}
