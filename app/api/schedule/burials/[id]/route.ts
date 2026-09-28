import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { removeBurial, updateBurial } from "@/lib/api-client/burials-store";
import { parseBurialUpdate } from "@/lib/burial-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: the recorded burial itself (client minute 2026-09-21, item 2 — "record AND manage").
 *
 *  · `PATCH /api/schedule/burials/:id` — edit the burial's own fields (the light pickup has its
 *    own route, `/pickup`).
 *  · `DELETE /api/schedule/burials/:id` — take a mis-recorded burial off the sheet. Append-only
 *    in the store, so the journal keeps the audit trail.
 *
 * Both `scheduling:write`; handlers stay rules-free (the shape check is `lib/burial-admin.ts`
 * and the record is written by the durable store). Live mode answers the named 503.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const parsed = parseBurialUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, fieldErrors: parsed.fieldErrors },
      { status: 422 },
    );
  }

  const { id } = await params;
  try {
    const burial = await updateBurial({
      burialId: id,
      fields: parsed.value,
      actor: auth.actor,
    });
    return NextResponse.json({ burial });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the burial could not be saved" }, { status: 502 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await removeBurial({ burialId: id, actor: auth.actor });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the burial could not be removed" }, { status: 502 });
  }
}
