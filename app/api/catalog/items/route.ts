import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { createCatalogItem, listCatalogItems } from "@/lib/api-client/commerce";
import { requireCatalogScope, readJsonBody } from "../_guard";

/**
 * BFF catalogue items.
 *
 * GET  /api/catalog/items — the PUBLISHED items the storefront sells, projected
 *      to the cart's rehydration fields (sku · name · item_type ·
 *      unit_price_cents · currency). The cart provider reads it so an item
 *      created in the staff admin — or a price an admin changed — survives a
 *      reload. Public on purpose: /plans, /services and /products already
 *      publish the same rows. No descriptions or photos ride along: a
 *      device-uploaded photo would otherwise weigh down every page load.
 * POST /api/catalog/items — staff create (`catalog:write`). The durable store
 *      validates field by field and answers 422 with one message per control;
 *      live mode has no catalogue write API, so the client answers 503
 *      (lib/api-client/commerce.ts ADMIN_CATALOG_NOT_WIRED) — never a fake
 *      write. No business rule lives in this handler (web/AGENTS.md rule 1).
 */
export async function GET() {
  try {
    const items = (await listCatalogItems()).map((item) => ({
      sku: item.sku,
      name: item.name,
      item_type: item.item_type,
      unit_price_cents: item.unit_price_cents,
      currency: item.currency,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the catalogue could not be read" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCatalogScope(["catalog:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const item = await createCatalogItem(body);
    return NextResponse.json({ item }, { status: 201 });
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
