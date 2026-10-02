/**
 * The chat BFF's session/viewer gate.
 *
 * Two jobs, one place:
 *   · `requireOfficeChat(scope)` — the Admin Inbox's own routes: a parsable access cookie
 *     and at least one of the required staff scopes (`cases:read` to read, `cases:write`
 *     to send, reused provisionally like the rest of the CRM seam because
 *     `rbac-scopes-v1` names no messaging code).
 *   · `chatViewerOrNull()` — resolve WHO is calling for the shared thread routes: the
 *     office, or the one family/agent participant. A participant's thread id is derived
 *     from their own session id (`lib/chat.ts#chatThreadIdFor`), which is what makes the
 *     ownership check possible at all.
 *
 * The check is UX, not the only authority: the store re-reads under its lock and a
 * participant can only ever address the thread its own id names. The routes stay
 * rule-free (web/AGENTS.md rule 1) — they parse the input and hand it to the store.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { portalForSession } from "@/lib/auth/destination";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import type { ChatViewer } from "@/lib/chat";

export type ChatCaller = { viewer: ChatViewer; actor: string };

/** The signed-in caller as a chat viewer, or null when signed out / not a chat surface. */
export async function chatViewerOrNull(): Promise<ChatCaller | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  let user: unknown = null;
  const rawUser = jar.get("im_u")?.value;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8"));
    } catch {
      user = null;
    }
  }
  const session = buildSession(token, user);
  if (!session) return null;

  const portal = portalForSession(session);
  if (portal === "staff") {
    return {
      viewer: { role: "office" },
      actor: staffActorName(rawUser, { sub: session.userId }),
    };
  }
  if (portal === "agent") {
    return { viewer: { role: "agent", agentId: session.userId }, actor: session.displayName };
  }
  return { viewer: { role: "family", userId: session.userId }, actor: session.displayName };
}

export type OfficeChatAuth =
  | { ok: true; viewer: ChatViewer; actor: string }
  | { ok: false; response: NextResponse };

/** The Admin Inbox routes: a staff session holding at least one of the required scopes. */
export async function requireOfficeChat(required: string[]): Promise<OfficeChatAuth> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  let user: unknown = null;
  const rawUser = jar.get("im_u")?.value;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8"));
    } catch {
      user = null;
    }
  }
  const session = buildSession(token, user);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "not signed in" }, { status: 401 }) };
  }
  if (portalForSession(session) !== "staff") {
    return {
      ok: false,
      response: NextResponse.json({ error: "the office Inbox is a staff surface" }, { status: 403 }),
    };
  }
  if (!hasAnyScope(session.scopes, required)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${required.join(" or ")} required` },
        { status: 403 },
      ),
    };
  }
  return {
    ok: true,
    viewer: { role: "office" },
    actor: staffActorName(rawUser, { sub: session.userId }),
  };
}

/** Map an ApiError onto the contract's `{ error }` shape; anything else is a 502. */
export function chatErrorResponse(err: unknown, fallback: string): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 502 });
}

/** The author side a viewer writes as. */
export function senderForViewer(viewer: ChatViewer): "office" | "participant" {
  return viewer.role === "office" ? "office" : "participant";
}
