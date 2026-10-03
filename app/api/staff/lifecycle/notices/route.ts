import { NextResponse } from "next/server";
import { markNoticeSent } from "@/lib/api-client/lifecycle";
import { errorResponse, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/lifecycle/notices — the office hands one notice off.
 *
 * No email/SMS service is connected, so this records the hand-off the office made
 * (the app itself claims nothing as delivered). It is what turns a scheduled
 * notice's state from "Ready to send" to "Sent".
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const send = await markNoticeSent(body, auth.actor);
    return NextResponse.json({ send }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the notice could not be recorded");
  }
}
