import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { crmLiveModeEnabled } from "@/lib/api-client/crm";
import { receiveInquiry } from "@/lib/api-client/inquiry-store";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { familyAskInquiryInput, readFamilyAskSubmission } from "@/lib/family/ask";

/**
 * BFF: POST /api/family/inquiries — a signed-in family asks about a PLAN or a LOT.
 *
 * WHY IT EXISTS (captain, 2026-10-02). A plan or lot inquiry must belong to a
 * family account so the family can see it in their own portal. The public
 * `POST /api/inquiries` stays for services and products (no account needed); this
 * route is the account-scoped sibling: it refuses without a family session and
 * stamps the row with the session's user id, so the family portal's own read
 * (`listFixtureInquiriesForUser`) and the office board read the SAME durable
 * store — one record, one source.
 *
 * STILL A DUMB BFF (web/AGENTS.md rule 1): the reading of what is being asked is
 * the pure `lib/family/ask.ts`, shared with the gate page that renders the
 * confirmation; persistence is the store's. This file only refuses an
 * unauthenticated session and an unreadable body.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await familySessionOrNull();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to your family account to ask about a plan or a lot." },
      { status: 401 },
    );
  }

  if (crmLiveModeEnabled()) {
    // No crm-families write contract is frozen; never file a real request locally.
    return NextResponse.json({ error: "CRM_NOT_WIRED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The inquiry could not be read." }, { status: 400 });
  }

  const verdict = readFamilyAskSubmission(body);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error: Object.values(verdict.errors)[0] ?? "The inquiry could not be recorded.",
        fieldErrors: verdict.errors,
      },
      { status: 422 },
    );
  }

  try {
    const inquiry = await receiveInquiry({
      intake: familyAskInquiryInput(verdict.ask, {
        full_name: session.displayName,
        email: session.email,
        phone: "",
      }),
      user_id: session.userId,
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "The inquiry could not be recorded." }, { status: 502 });
  }
}
