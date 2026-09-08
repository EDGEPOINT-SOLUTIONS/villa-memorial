import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, buildSession } from "@/lib/auth/session";

/**
 * BFF: GET /api/auth/session — safe session view for the UI.
 * Unknown/corrupt token shape → 200 with {session:null} (logged-out),
 * never a crash (web/AGENTS.md trap: defensive JWT handling).
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  // The user view rides alongside in a second non-sensitive payload cookie is
  // unnecessary — instead we re-derive display data from the login response
  // stored at sign-in time in `im_u` (base64 JSON of SafeUser).
  const rawUser = request.cookies.get("im_u")?.value;

  let user: unknown = null;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, "base64").toString("utf8"));
    } catch {
      user = null;
    }
  }

  const session = buildSession(accessToken, user);
  return NextResponse.json({ session });
}
