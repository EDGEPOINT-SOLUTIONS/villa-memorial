import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

/** BFF: POST /api/auth/logout — clears session cookies server-side. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const secure = process.env.SECURE_COOKIES === "1";
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, "im_u"]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}
