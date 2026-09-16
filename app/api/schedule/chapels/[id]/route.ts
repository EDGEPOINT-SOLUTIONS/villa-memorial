import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { saveChapel } from "@/lib/api-client/chapel-admin";
import { parseChapelDraft } from "@/lib/chapel-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: PATCH /api/schedule/chapels/:id — change a chapel's name, class,
 * capacity, active flag or notes (scope `scheduling:write`). The id in the path
 * wins over any id in the body, so a stale form can never edit another chapel.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const parsed = parseChapelDraft({ ...(body as Record<string, unknown>), id: undefined });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });

  const { id } = await params;
  try {
    return NextResponse.json({ chapel: await saveChapel({ ...parsed.value, id }) });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the chapel could not be saved" }, { status: 502 });
  }
}
