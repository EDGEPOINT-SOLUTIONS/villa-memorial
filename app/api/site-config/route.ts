import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import {
  loadSiteConfig,
  resolveGoogleMapsKey,
  saveSiteConfig,
} from "@/lib/api-client/site-config";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: /api/site-config — the home editor's section 7 key field.
 *
 * SERVER-SIDE ONLY BY DESIGN. The public home reads the key in a server
 * component and builds the embed in that render, so the key never enters public
 * JavaScript. The editor is the ONE other reader, through this staff-gated
 * route; the landing content document never carries it.
 *
 * `catalog:write` is the provisional content scope the home editor already
 * gates on (the same precedent the landing content route records), so this adds
 * no new scope to the frozen vocabulary.
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
  const [state, stored] = await Promise.all([resolveGoogleMapsKey(), loadSiteConfig()]);
  return NextResponse.json({
    // The stored key is returned for the field the office edits (staff-only
    // route). The environment key is never echoed back — only its presence.
    storedKey: stored.googleMapsApiKey ?? "",
    source: state.source,
    mode: state.mode,
    updatedAt: stored.updated_at,
  });
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
    const actor = staffActorName(jar.get("im_u")?.value, claims);
    const saved = await saveSiteConfig(body, actor);
    const state = await resolveGoogleMapsKey();
    return NextResponse.json({
      ok: true,
      storedKey: saved.googleMapsApiKey ?? "",
      source: state.source,
      mode: state.mode,
      updatedAt: saved.updated_at,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
