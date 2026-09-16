import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { saveChapel } from "@/lib/api-client/chapel-admin";
import { parseChapelDraft } from "@/lib/chapel-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: POST /api/schedule/chapels — add a chapel to the park's books
 * (scope `scheduling:write`).
 *
 * No rules here: the draft is validated by lib/chapel-admin.ts and persisted
 * (with its durable-store semantics) by lib/api-client/chapel-admin.ts. Live mode
 * answers 503 — booking-events-v1 has no resource write endpoint — see that
 * module's header.
 */
export async function POST(request: Request) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const parsed = parseChapelDraft(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });
  if (parsed.value.id) {
    return NextResponse.json(
      { error: "POST adds a chapel; use PATCH to change one." },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json({ chapel: await saveChapel(parsed.value) }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the chapel could not be saved" }, { status: 502 });
  }
}
