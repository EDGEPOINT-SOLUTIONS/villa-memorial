import { NextResponse } from "next/server";
import { renderGeneralPriceListPdf } from "@/lib/general-price-list";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLandingContent } from "@/lib/api-client/landing";

/**
 * GET /general-price-list — the LITERAL PDF (captain, 2026-10-02).
 *
 * The dedicated public General Price List is the document itself, not a coded
 * HTML rendition of it. This route handler builds the same sheet the staff
 * export carries (`renderGeneralPriceListPdf` → the recorded 2026 figures) and
 * answers `application/pdf`, so the browser's own viewer opens the price list.
 * It replaced `page.tsx`: there is no screen left to drift from the paper.
 *
 * `inline` (not `attachment`) is deliberate — the URL IS the page now, so a
 * visitor following the footer or `/price-list` link should SEE the price list,
 * not be handed a download. The explicit-download branch stays at
 * `GET /api/export/paper-pdf?document=general-price-list`.
 *
 * A rendering or store failure answers an honest 500 (a short plain
 * explanation), never a broken viewer or a bare framework error.
 */
export const dynamic = "force-dynamic";

const FILENAME = "villa-general-price-list.pdf";

const ERROR_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>General Price List unavailable — Villa Funeraria</title>
  </head>
  <body>
    <h1>General Price List unavailable</h1>
    <p>The price list could not be built just now. Please try again, or contact the park office.</p>
  </body>
</html>`;

export async function GET() {
  try {
    const [pricing, content] = await Promise.all([
      loadPricingDocument(),
      listLandingContent(),
    ]);
    const buffer = await renderGeneralPriceListPdf(pricing, content.contact);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${FILENAME}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[general-price-list] pdf render failed:", error);
    return new NextResponse(ERROR_HTML, {
      status: 500,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
