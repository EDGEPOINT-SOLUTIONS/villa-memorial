/**
 * Shared session/scope gate for the staff Catalogue BFF routes
 * (app/api/catalog/**) — the same check the Schedule routes use: a parsable
 * access cookie and AT LEAST ONE of the required scopes. The check is UX, not
 * security: the store re-checks its own rules and the future catalog-pricing
 * write endpoint remains the only authority (web/AGENTS.md rule 1) once one
 * freezes. The records these routes write are app-side
 * (lib/api-client/catalog-store.ts) because no contract names a catalogue
 * write endpoint yet.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims, type JwtClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

export type CatalogAuth =
  | { ok: true; claims: JwtClaims; actor: string }
  | { ok: false; response: NextResponse };

/** Resolve the staff session for a catalogue route, or the response to return. */
export async function requireCatalogScope(required: string[]): Promise<CatalogAuth> {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return { ok: false, response: NextResponse.json({ error: "not signed in" }, { status: 401 }) };
  }
  if (!hasAnyScope(claims.scopes, required)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${required.join(" or ")} required` }, { status: 403 }),
    };
  }
  return { ok: true, claims, actor: staffActorName(jar.get("im_u")?.value, claims) };
}

/** Read a JSON body, or null when the request is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}
