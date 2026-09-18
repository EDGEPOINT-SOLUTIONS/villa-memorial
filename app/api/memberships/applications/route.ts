import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import {
  MEMBERSHIP_ADMIN_NOT_WIRED,
  membershipLiveModeEnabled,
  recordMembershipApplication,
} from "@/lib/api-client/membership-applications";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/memberships/applications — record a Villa Memorial Plan membership
 * application (FORMS_PLAN gap 4 / F-18).
 *
 * HANDLER STAYS RULES-FREE (web/AGENTS.md rule 1): normalisation, validation, the rate read
 * from the pricing store and the durable write all live in
 * `lib/api-client/membership-applications.ts` / `lib/contracts/membership-application.ts`.
 * This route gates the session, reads the body and maps the outcome.
 *
 * SCOPE — PROVISIONAL, AND NAMED: `rbac-scopes-v1` has no membership/plan-holder scope, so
 * this reuses `catalog:write`, the scope the Commerce plan screens already gate on. The real
 * ask (a `plans:*`/`memberships:*` code in a future freeze) is recorded in the PR and on the
 * screen; no token outside the frozen vocabulary is invented. The check is UX — a live
 * service would re-check on its own boundary.
 *
 * LIVE MODE: no membership/COC contract exists (pre-need partner domain), so the client
 * answers 503 with the reason instead of pretending a partner integration.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["catalog:write"])) {
    return NextResponse.json({ error: "catalog:write required" }, { status: 403 });
  }
  if (membershipLiveModeEnabled()) {
    return NextResponse.json({ error: MEMBERSHIP_ADMIN_NOT_WIRED }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const application = await recordMembershipApplication(
      body,
      staffActorName(jar.get("im_u")?.value, claims),
    );
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "the membership application could not be recorded" },
      { status: 502 },
    );
  }
}

/** The screens read the store server-side; a capture write has nothing to return here. */
export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
