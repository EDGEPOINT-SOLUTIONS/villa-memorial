/**
 * Shared session gate for the agent BFF routes (app/api/agent/**).
 *
 * WHAT IT GUARDS. The agent portal's signed-in session — the same cookie session
 * `requirePortalSessionOrRedirect` reads on the pages — and nothing more. The
 * agent persona (lib/fixtures/auth/personas.json) holds `tenancy:modules:read`,
 * `catalog:read`, `orders:read`, `orders:write`, `property:read`; there is no
 * `crm:*` token in the frozen vocabulary (rbac-scopes-v1) and this file does NOT
 * invent one. The demo store is fixture-mode only, so the guard is the portal
 * membership plus, at the call site, the record's ownership.
 *
 * The check is UX, not security, exactly like the staff guards: a real write
 * endpoint would re-check the agent's scopes at the service boundary.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";
import { portalForSession, type Portal } from "@/lib/auth/destination";
import type { Session } from "@/lib/auth/types";

export type AgentAuth =
  | { ok: true; session: Session; portal: Portal }
  | { ok: false; response: NextResponse };

function readUserCookie(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Resolve the agent-portal session for a route, or the response to return. */
export async function requireAgentSession(): Promise<AgentAuth> {
  const jar = await cookies();
  const session = buildSession(
    jar.get(ACCESS_COOKIE)?.value,
    readUserCookie(jar.get("im_u")?.value),
  );
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "not signed in" }, { status: 401 }) };
  }
  const portal = portalForSession(session);
  if (portal !== "agent" && portal !== "staff") {
    return {
      ok: false,
      response: NextResponse.json({ error: "the agent portal is not open to this session" }, { status: 403 }),
    };
  }
  return { ok: true, session, portal };
}

/** Read a JSON body, or null when the request is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}
