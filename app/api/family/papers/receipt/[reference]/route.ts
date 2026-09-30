import { NextResponse } from "next/server";
import { familySessionOrNull } from "@/lib/auth/family-session";
import { getFamilySnapshot } from "@/lib/api-client/family";
import {
  buildFamilyReceiptPaper,
  familyPapers,
  familyReceiptFileStem,
  familyReceiptHasCopy,
} from "@/lib/family/family-documents";
import { paperToPdfBuffer } from "@/lib/export/pdf";

/**
 * BFF: the family's own receipt as a PDF — guarded, and rendered from the record.
 *
 *   GET /api/family/papers/receipt/<reference>?disposition=inline|attachment
 *
 * WHY IT EXISTS. The shared PDF renderer is reached today only by
 * `POST /api/export/paper-pdf`, which is STAFF-scoped (property/documents/cases
 * read). A customer session holds none of those scopes, so the family receipt
 * page's PDF button would 403 — a latent defect the Papers popup would have
 * exposed. This route is the honest fix: a family-scoped renderer that rebuilds
 * the receipt from the SNAPSHOT the signed-in family owns (never from
 * client-supplied blocks, which a stranger could forge), and serves it with a
 * private, no-store cache.
 *
 * The paper is the SAME shared receipt sheet the counter prints and the .docx
 * carries (`lib/contracts/official-receipt.ts`); a record that does not carry the
 * receipt's number, date and amount has no copy, and this route answers 404
 * rather than printing a half-receipt.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const session = await familySessionOrNull();
  if (!session) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { reference } = await params;
  const decoded = decodeURIComponent(reference);
  const snapshot = await getFamilySnapshot();
  const { receipts } = familyPapers(snapshot.recent_documents);
  const receipt = receipts.find((entry) => entry.reference === decoded);
  if (!receipt || !familyReceiptHasCopy(receipt)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const paper = buildFamilyReceiptPaper(receipt);
  let buffer: Buffer;
  try {
    buffer = await paperToPdfBuffer(paper.blocks, paper.profile);
  } catch {
    return NextResponse.json({ error: "pdf rendering failed" }, { status: 500 });
  }

  const disposition =
    new URL(request.url).searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";
  const filename = familyReceiptFileStem(receipt);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${disposition}; filename="${filename}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
