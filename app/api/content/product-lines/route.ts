import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { listProductLines, saveProductLine } from "@/lib/api-client/product-lines";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: the product-line write path (PDP variants P2).
 *
 *   GET  /api/content/product-lines     — every line (the selector's grouping)
 *   POST /api/content/product-lines     — save one: { id, line }
 *
 * No content/CMS service exists upstream, so this route is the app-authored seam
 * beside /api/content/entries. The handler is RULES-FREE: the store's
 * `validateProductLine` (against the LIVE catalogue SKUs) is the shape authority.
 * `catalog:write` is reused provisionally — no new scope is invented, matching
 * the content entry editor.
 */
async function requireCatalogWrite() {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) return { error: NextResponse.json({ error: "not signed in" }, { status: 401 }) } as const;
  if (!hasAnyScope(claims.scopes, ["catalog:write"])) {
    return { error: NextResponse.json({ error: "catalog:write required" }, { status: 403 }) } as const;
  }
  return { claims } as const;
}

export async function GET() {
  const gate = await requireCatalogWrite();
  if ("error" in gate) return gate.error;
  const lines = await listProductLines();
  return NextResponse.json({ lines });
}

export async function POST(request: NextRequest) {
  const gate = await requireCatalogWrite();
  if ("error" in gate) return gate.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "The save must name the product line." }, { status: 422 });
  }

  try {
    const line = await saveProductLine(id, record.line ?? record, gate.claims.sub);
    return NextResponse.json({ ok: true, line });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
