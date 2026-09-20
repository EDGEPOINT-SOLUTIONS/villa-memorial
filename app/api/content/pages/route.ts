import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { listPageDocuments, savePageDocument } from "@/lib/api-client/content-pages";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: the content-pages write path.
 *
 *   GET  /api/content/pages         — every page document (the editor's read)
 *   POST /api/content/pages         — save one: { key, document }
 *
 * No content/CMS service exists upstream (the contract ask travels with the
 * Phase 0+1 PR), so this route is the app-authored CMS seam — the same posture
 * as /api/landing/content for the home/FAQ document. The scope check is UX
 * (readable 403 instead of a broken page); the store's validator is the shape
 * authority, and it resolves price bindings against the LIVE catalogue + pricing
 * stores so a withdrawn SKU or renamed rate table can never be saved as if wired.
 * `catalog:write` is reused provisionally — no new scope is invented.
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
  return NextResponse.json({ documents: await listPageDocuments() });
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
  const key = typeof record.key === "string" ? record.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "The save must name the page document." }, { status: 422 });
  }

  try {
    const document = await savePageDocument(key, record.document ?? record, gate.claims.sub);
    return NextResponse.json({ ok: true, document });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "save failed" }, { status: 502 });
  }
}
