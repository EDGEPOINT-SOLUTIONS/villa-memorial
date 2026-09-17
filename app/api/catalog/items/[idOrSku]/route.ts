import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getAdminCatalogItem, updateCatalogItem } from "@/lib/api-client/commerce";
import { requireCatalogScope, readJsonBody } from "../../_guard";

/**
 * BFF one catalogue item.
 *
 * GET   /api/catalog/items/:idOrSku — the ADMIN record (published or not) for a
 *       `catalog:read` session. Unpublished items stay invisible to the public
 *       GET /api/catalog/items list.
 * PATCH /api/catalog/items/:idOrSku — staff edit (`catalog:write`): name,
 *       description, type, integer-centavo price, currency, photo, published
 *       state. Deactivating is `published: false` — items are never deleted.
 *       Unknown id/SKU → 404; validation failures → 422 with per-field
 *       messages; live mode → 503 (no write contract exists).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ idOrSku: string }> },
) {
  const auth = await requireCatalogScope(["catalog:read"]);
  if (!auth.ok) return auth.response;

  const { idOrSku } = await params;
  try {
    const item = await getAdminCatalogItem(decodeURIComponent(idOrSku));
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the item could not be read" }, { status: 502 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ idOrSku: string }> },
) {
  const auth = await requireCatalogScope(["catalog:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { idOrSku } = await params;
  try {
    const item = await updateCatalogItem(decodeURIComponent(idOrSku), body);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "the item could not be saved" }, { status: 502 });
  }
}
