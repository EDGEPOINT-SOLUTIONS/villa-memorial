import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { renderDocument } from "@/lib/api-client/documents";

/**
 * BFF: GET /api/documents/:id/render — serves a generated document's rendered artifact
 * to the signed-in staff browser. The gateway needs a bearer token the browser does not
 * hold (web/AGENTS.md rule 3), so the fetch happens here with the session cookie.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await renderDocument(id);
    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 502;
    return NextResponse.json(
      { error: status === 404 ? "no rendered artifact for this document" : "render failed" },
      { status },
    );
  }
}
