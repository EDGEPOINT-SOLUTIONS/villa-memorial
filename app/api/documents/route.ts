import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { uploadDocument } from "@/lib/api-client/documents";
import type { DocumentType } from "@/lib/api-client/documents";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

const DOCUMENT_TYPES: ReadonlyArray<DocumentType> = [
  "receipt",
  "contract",
  "certificate",
  "permit",
  "authorization",
  "other",
];

/**
 * BFF: POST /api/documents — files an uploaded document (scope `documents:write`).
 *
 * The browser sends the document's METADATA, never a file body: `documents-api-v1`
 * has no object store, so there is nowhere to keep a binary. The row is real (title,
 * type, the case or order it belongs to, who filed it); the artifact is the dev-owned
 * gap the page names. The scope check is UX, not security — the documents service
 * re-checks on the token (web/AGENTS.md rule 3).
 */
export async function POST(request: NextRequest) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["documents:write"])) {
    return NextResponse.json({ error: "documents:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const fields = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;

  const title = typeof fields.title === "string" ? fields.title.trim() : "";
  const type = fields.document_type;
  if (!title) {
    return NextResponse.json({ error: "A document title is required." }, { status: 422 });
  }
  if (typeof type !== "string" || !DOCUMENT_TYPES.includes(type as DocumentType)) {
    return NextResponse.json({ error: "Choose a document type." }, { status: 422 });
  }

  try {
    const document = await uploadDocument({
      title,
      document_type: type as DocumentType,
      related_case_number:
        typeof fields.related_case_number === "string" ? fields.related_case_number : null,
      related_order_number:
        typeof fields.related_order_number === "string" ? fields.related_order_number : null,
      uploaded_by: claims.sub,
    });
    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the document could not be filed" }, { status: 502 });
  }
}
