import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseAccessTokenClaims, ACCESS_COOKIE } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import { paperToPdfBuffer } from "@/lib/export/pdf";
import { paperProfileById } from "@/lib/export/paper-profile";
import { renderGeneralPriceListPdf } from "@/lib/general-price-list";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLandingContent } from "@/lib/api-client/landing";
import type { PaperBlock } from "@/lib/export/types";

/**
 * GET /api/export/paper-pdf?document=general-price-list — the PUBLIC General
 * Price List as a PDF.
 *
 * The price list is public data, so this branch is deliberately unsigned: it
 * builds the document server-side from the SAME `renderGeneralPriceListPdf`
 * the /general-price-list route serves, then hands the blocks to the paper
 * layer. It is a pure renderer — no data is added and no service is reached
 * beyond the public pricing store. Every other profile stays behind the staff
 * session in POST below.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("document") !== "general-price-list") {
    return NextResponse.json({ error: "unknown document" }, { status: 404 });
  }
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
        "content-disposition": 'attachment; filename="villa-general-price-list.pdf"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[paper-pdf] general price list render failed:", error);
    return NextResponse.json({ error: "pdf rendering failed" }, { status: 500 });
  }
}

/**
 * BFF: POST /api/export/paper-pdf — renders the staff's current paper document to a real
 * PDF file from the same PaperBlocks the on-screen sheet and the .docx export use.
 *
 * The browser sends the assembled blocks (the document content it is displaying) and the
 * profile id of the sheet it is showing; the route is a pure renderer — it adds no data,
 * computes no money and reaches no service. Gated on a signed-in staff session with
 * property read (the same floor as the screens that show the purchase document).
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["property:read", "documents:read", "cases:read"])) {
    return NextResponse.json(
      { error: "no document scope for this export" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const raw = (body ?? {}) as { blocks?: unknown; filename?: unknown; profile?: unknown };
  const blocks = sanitizeBlocks(raw.blocks);
  if (!blocks) {
    return NextResponse.json({ error: "malformed document blocks" }, { status: 400 });
  }
  const profile = paperProfileById(raw.profile);
  if (!profile) {
    return NextResponse.json(
      { error: "unknown paper profile — the sheet's profile must be declared" },
      { status: 400 },
    );
  }

  try {
    const buffer = await paperToPdfBuffer(blocks, profile);
    const filename =
      typeof raw.filename === "string" && /^[A-Za-z0-9-_. ]{1,120}$/.test(raw.filename)
        ? raw.filename.replace(/\.pdf$/i, "")
        : "document";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[paper-pdf] render failed:", error);
    return NextResponse.json({ error: "pdf rendering failed" }, { status: 500 });
  }
}

const MAX_BLOCK_TEXT = 20_000;
const MAX_TABLE_ROWS = 80;

/** Accept only the PaperBlock grammar — never forward unknown structures to the renderer. */
function sanitizeBlocks(raw: unknown): PaperBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PaperBlock[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const block = item as Record<string, unknown>;
    switch (block.kind) {
      case "line": {
        if (typeof block.text !== "string" || block.text.length > MAX_BLOCK_TEXT) return null;
        const align =
          block.align === "center" || block.align === "right" || block.align === "justify"
            ? block.align
            : undefined;
        out.push({
          kind: "line",
          text: block.text,
          ...(typeof block.bold === "boolean" ? { bold: block.bold } : {}),
          ...(typeof block.caps === "boolean" ? { caps: block.caps } : {}),
          ...(align ? { align } : {}),
          ...(typeof block.size === "number" && Number.isFinite(block.size) ? { size: block.size } : {}),
          ...(typeof block.spaceAfter === "number" && Number.isFinite(block.spaceAfter)
            ? { spaceAfter: block.spaceAfter }
            : {}),
        });
        break;
      }
      case "space": {
        out.push({ kind: "space", points: Math.min(Number(block.points) || 0, 200) });
        break;
      }
      case "pagebreak": {
        out.push({ kind: "pagebreak" });
        break;
      }
      case "table": {
        const columns = Math.min(Math.max(Math.floor(Number(block.columns)) || 2, 1), 12);
        // Head and body cells may only occupy the grid's declared columns. Each span is
        // clamped to the columns still unused so a malformed row (spans summing past the
        // width) is trimmed to the grid instead of drawing cells off the page margin.
        const head = (() => {
          if (!Array.isArray(block.head)) return undefined;
          const out: PaperHeadSanitized[] = [];
          let used = 0;
          for (const h of block.head) {
            if (used >= columns) break;
            if (typeof h === "string") {
              out.push({ text: h.slice(0, 200), span: 1 });
              used += 1;
              continue;
            }
            if (typeof h !== "object" || h === null) continue;
            const entry = h as Record<string, unknown>;
            if (typeof entry.text !== "string") continue;
            const span = Math.min(
              Math.max(
                typeof entry.span === "number" && Number.isFinite(entry.span)
                  ? Math.floor(entry.span)
                  : 1,
                1,
              ),
              columns - used,
            );
            out.push({ text: entry.text.slice(0, 200), span });
            used += span;
          }
          return out.length > 0 ? out : undefined;
        })();
        const rowsRaw = Array.isArray(block.rows) ? block.rows.slice(0, MAX_TABLE_ROWS) : null;
        if (!rowsRaw) return null;
        const rows: PaperCellSanitized[][] = [];
        for (const rowRaw of rowsRaw) {
          if (!Array.isArray(rowRaw)) return null;
          const row: PaperCellSanitized[] = [];
          let used = 0;
          for (const cellRaw of rowRaw) {
            if (used >= columns) break;
            if (typeof cellRaw !== "object" || cellRaw === null) return null;
            const cell = cellRaw as Record<string, unknown>;
            if (typeof cell.label !== "undefined" && typeof cell.label !== "string") return null;
            if (typeof cell.value !== "string") return null;
            const span =
              typeof cell.span === "number" && Number.isFinite(cell.span)
                ? Math.floor(cell.span)
                : 1;
            const fit = Math.min(Math.max(span, 1), columns - used);
            used += fit;
            row.push({
              ...(typeof cell.label === "string" && cell.label !== ""
                ? { label: cell.label.slice(0, 200) }
                : {}),
              value: cell.value.slice(0, MAX_BLOCK_TEXT),
              ...(typeof cell.span === "number" ? { span: fit } : {}),
            });
          }
          if (row.length > 0) rows.push(row);
        }
        if (rows.length === 0) return null;
        const widths =
          Array.isArray(block.widths) && block.widths.length === columns
            ? (block.widths as unknown[]).filter(
                (w): w is number => typeof w === "number" && Number.isFinite(w) && w > 0,
              )
            : [];
        if (widths.length > 0 && widths.length !== columns) return null;
        out.push({
          kind: "table",
          columns,
          rows: rows as PaperCellSanitized[][],
          ...(head ? { head } : {}),
          ...(widths.length === columns ? { widths } : {}),
        });
        break;
      }
      default:
        return null;
    }
  }
  return out;
}

type PaperHeadSanitized = {
  text: string;
  span: number;
};

type PaperCellSanitized = {
  label?: string;
  value: string;
  span?: number;
};
