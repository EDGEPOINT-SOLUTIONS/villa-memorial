import { NextResponse } from "next/server";
import { updateCaseIntake } from "@/lib/api-client/operations";
import { intakeFromForm } from "@/lib/contracts/intake-input";
import { errorResponse, readJsonBody, requireCasesScope } from "../_guard";

/**
 * BFF: PATCH /api/cases/:number — completes or corrects intake on an existing case.
 *
 * Addressed by case_number, which is how funeral-cases addresses cases (a capability
 * token, not a record id).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const auth = await requireCasesScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { number } = await params;
  try {
    return NextResponse.json(await updateCaseIntake(number, intakeFromForm(body)));
  } catch (err) {
    return errorResponse(err, "could not save intake");
  }
}
