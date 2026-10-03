import { NextResponse } from "next/server";
import { saveNoticeTemplate } from "@/lib/api-client/lifecycle";
import { errorResponse, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/lifecycle/templates — the office writes a modular notice.
 *
 * A template is a rule (`label` · `days_before` · `message`); the app schedules
 * one notice per open installment per active template. An `id` edits the template
 * in place, which is how a notice is paused (active: false) without deleting it.
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const template = await saveNoticeTemplate(body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the notice could not be saved");
  }
}
