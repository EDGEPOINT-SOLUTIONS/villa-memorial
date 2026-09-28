import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { updatePickup } from "@/lib/api-client/burials-store";
import { parsePickupUpdate } from "@/lib/burial-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: PATCH /api/schedule/burials/:id/pickup — set or move one burial's light pickup
 * (client minute 2026-09-21, item 2: the pickup's `scheduled → in_progress → done` lifecycle),
 * scope `scheduling:write`.
 *
 * Rules-free (web/AGENTS.md rule 1): the shape check is `parsePickupUpdate`
 * (`lib/burial-admin.ts`) and the record is written by the durable store. Live mode 503s.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const parsed = parsePickupUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, fieldErrors: parsed.fieldErrors },
      { status: 422 },
    );
  }

  const { id } = await params;
  try {
    const burial = await updatePickup({
      burialId: id,
      state: parsed.value.state,
      time: parsed.value.time,
      crew: parsed.value.crew,
      note: parsed.value.note,
      actor: auth.actor,
    });
    return NextResponse.json({ burial });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the pickup could not be saved" }, { status: 502 });
  }
}
