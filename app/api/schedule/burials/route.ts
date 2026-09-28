import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { scheduleBurial } from "@/lib/api-client/burials-store";
import { parseBurialDraft } from "@/lib/burial-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: POST /api/schedule/burials — record a burial (client minute 2026-09-21, item 2:
 * "record and manage burial schedules"), scope `scheduling:write`.
 *
 * The handler stays rules-free (web/AGENTS.md rule 1): validation is `parseBurialDraft`
 * (`lib/burial-admin.ts`, the same reading the browser form runs) and persistence is the
 * durable store (`lib/api-client/burials-store.ts`). No contract names a burial-schedule
 * record, so live mode answers 503 rather than filing a burial into a local file.
 */
export async function POST(request: Request) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const parsed = parseBurialDraft(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, fieldErrors: parsed.fieldErrors },
      { status: 422 },
    );
  }

  try {
    const burial = await scheduleBurial({ draft: parsed.value, actor: auth.actor });
    return NextResponse.json({ burial }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the burial could not be recorded" }, { status: 502 });
  }
}
