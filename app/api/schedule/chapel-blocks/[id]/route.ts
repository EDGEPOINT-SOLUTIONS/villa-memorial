import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { removeChapelBlock } from "@/lib/api-client/chapel-admin";
import { requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: DELETE /api/schedule/chapel-blocks/:id — re-open a closed range
 * (scope `scheduling:write`). The dates are bookable again from the storefront
 * the moment this answers 200; an unknown id is a 404, never a silent success.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await removeChapelBlock(id);
    return NextResponse.json({ removed: id });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the closure could not be removed" }, { status: 502 });
  }
}
