import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { addChapelBlock } from "@/lib/api-client/chapel-admin";
import { parseChapelBlockDraft } from "@/lib/chapel-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: POST /api/schedule/chapels/:id/blocks — close a date range for one chapel
 * (maintenance / private use), scope `scheduling:write`.
 *
 * This is the write the CUSTOMER booking step reads back through
 * /api/chapel/schedule: the reserved dates leave availability as soon as this
 * answers 201. The range rules and the overlap refusal live in
 * lib/chapel-admin.ts; the durable store keeps them (lib/api-client/chapel-store.ts).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { id } = await params;
  const parsed = parseChapelBlockDraft({
    ...(body as Record<string, unknown>),
    resource_id: id,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });

  try {
    return NextResponse.json({ block: await addChapelBlock(parsed.value, auth.actor) }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the closure could not be saved" }, { status: 502 });
  }
}
