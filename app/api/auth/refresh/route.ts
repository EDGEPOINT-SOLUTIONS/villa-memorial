import { NextResponse, type NextRequest } from "next/server";
import {
  ApiError,
  authLiveModeEnabled,
  refresh as liveRefresh,
} from "@/lib/api-client/identity-access";
import { refresh as fixtureRefresh } from "@/lib/api-client/fixture-auth";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

/**
 * BFF: POST /api/auth/refresh — rotates the refresh token and re-issues the
 * access cookie. Called by the app shell when the access token nears expiry.
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  try {
    const result = authLiveModeEnabled()
      ? await liveRefresh(refreshToken)
      : await fixtureRefresh(refreshToken);

    const res = NextResponse.json({ ok: true });
    const secure = process.env.SECURE_COOKIES === "1";
    res.cookies.set(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: result.expiresIn,
    });
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const clear = NextResponse.json({ error: err.message }, { status: 401 });
      const secure = process.env.SECURE_COOKIES === "1";
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, "im_u"]) {
        clear.cookies.set(name, "", {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: 0,
        });
      }
      return clear;
    }
    return NextResponse.json({ error: "refresh failed" }, { status: 502 });
  }
}
