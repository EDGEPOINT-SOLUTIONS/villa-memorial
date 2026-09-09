import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { listLandingContent, saveLandingContent } from "@/lib/api-client/landing";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/landing/content — persist the full Landing Page document.
 *
 * Landing content is a front-end CMS seam (approved in the Lavish villa-landing-plan):
 * no upstream content service exists yet, so this route IS the write path, gated the
 * same way every BFF write is gated — the scope check here is UX only, turning a
 * would-be 403 into a readable message; the store's validator is the authority on the
 * document shape (rails capped at 5 per side, known kinds, empty lists legal).
 * `catalog:write` is reused provisionally (same precedent as Store & content) until a
 * marketing-content contract freezes its own scope — no new scope is invented here.
 *
 * GET is a convenience read for the editor's "what the page currently shows".
 */
export async function GET() {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["catalog:write"])) {
    return NextResponse.json({ error: "catalog:write required" }, { status: 403 });
  }
  return NextResponse.json(await listLandingContent());
}

export async function POST(request: NextRequest) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["catalog:write"])) {
    return NextResponse.json({ error: "catalog:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const saved = await saveLandingContent(body);
    return NextResponse.json({ ok: true, content: saved });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
