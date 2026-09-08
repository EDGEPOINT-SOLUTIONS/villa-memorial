import { NextResponse, type NextRequest } from "next/server";
import {
  ApiError,
  authLiveModeEnabled,
  login as liveLogin,
} from "@/lib/api-client/identity-access";
import {
  login as fixtureLogin,
} from "@/lib/api-client/fixture-auth";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";
import { portalHomeFor } from "@/lib/auth/destination";

/** Base64url-decode the JWT payload (no verification needed for routing: the
 * token was just issued/validated by the auth path; scopes decide the door). */
function scopesFromToken(token: string): string[] {
  try {
    const part = token.split(".")[1];
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(
      normalized + "=".repeat((4 - (normalized.length % 4)) % 4),
      "base64",
    ).toString("utf8");
    const claims = JSON.parse(json) as { scopes?: unknown };
    return Array.isArray(claims.scopes)
      ? claims.scopes.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * BFF: POST /api/auth/login  {email, password}
 * Proxies to identity-access (live) or recorded fixtures, then sets httpOnly
 * session cookies. Tokens never reach browser JS. No business logic here —
 * the BFF stays dumb (web/AGENTS.md rule 1).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? String((body as { email: string }).email).trim().toLowerCase()
      : "";
  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? String((body as { password: string }).password)
      : "";

  if (!email || !password) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const result = authLiveModeEnabled()
      ? await liveLogin(email, password)
      : await fixtureLogin(email, password);

    const res = NextResponse.json({
      user: {
        email: result.user.email,
        display_name: result.user.display_name,
      },
      // The account's own portal — scopes decide, not the door the user walked in
      // through. One sign-in, right place.
      redirectTo: portalHomeFor(scopesFromToken(result.accessToken)),
    });

    const secure = process.env.SECURE_COOKIES === "1";
    res.cookies.set(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: result.expiresIn,
    });
    // Refresh outlives the access token; rotation handled by /api/auth/refresh.
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    // Non-sensitive user view (display data only — no tokens/scopes).
    res.cookies.set("im_u", Buffer.from(JSON.stringify(result.user)).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      const status = err.status === 401 ? 401 : err.status >= 500 ? 502 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: "login failed" }, { status: 502 });
  }
}
