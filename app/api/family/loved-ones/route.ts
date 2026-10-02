import { NextResponse } from "next/server";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { addLovedOne } from "@/lib/api-client/family-household-store";
import { readLovedOneIntake } from "@/lib/family/loved-one-intake";

/**
 * BFF: POST /api/family/loved-ones — add a loved one to the signed-in household.
 *
 * WHY IT EXISTS. The family portal starts clean (captain, 2026-10-02): the demo
 * household is removed, so the family adds the person the other screens are
 * about. The write goes through `lib/api-client/family-household-store.ts`, the
 * journal `getFamilyHousehold()` folds, so the person reaches every family
 * screen on the next read — the memorial switch, the visit calendar and the
 * request composer included.
 *
 * No business rule lives here (web/AGENTS.md rule 1): the validation is the pure
 * reading in `lib/family/loved-one-intake.ts` (shared with the form, so a field
 * error is the same sentence in both), the write is the store's, and this file
 * only refuses an unauthenticated session and an unreadable body.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await familySessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The details could not be read." }, { status: 400 });
  }

  const verdict = readLovedOneIntake(body);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error: Object.values(verdict.errors)[0] ?? "The loved one could not be saved.",
        fieldErrors: verdict.errors,
      },
      { status: 422 },
    );
  }

  try {
    const lovedOne = await addLovedOne({ name: verdict.name, life_dates: verdict.life_dates });
    return NextResponse.json({ person: lovedOne }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "We could not save that just now. Try again." },
      { status: 500 },
    );
  }
}
