import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseAccessTokenClaims, ACCESS_COOKIE } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import { paperToPdfBuffer } from "@/lib/export/pdf";
import type { PaperBlock } from "@/lib/export/types";

/**
 * BFF: POST /api/export/paper-pdf — renders the staff's current paper document to a real
 * PDF file from the same PaperBlocks the on-screen sheet and the .docx export use.
 *
 * The browser sends the assembled blocks (the document content it is displaying); the
 * route is a pure renderer — it adds no data, computes no money and reaches no service.
 * Gated on a signed-in staff session with property read (the same floor as the screens
 * that show the purchase document).
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
  const raw = (body ?? {}) as { blocks?: unknown; filename?: unknown };
  const blocks = sanitizeBlocks(raw.blocks);
  if (!blocks) {
    return NextResponse.json({ error: "malformed document blocks" }, { status: 400 });
  }

  try {
    const buffer = await paperToPdfBuffer(blocks);
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
  } catch {
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
        const head = Array.isArray(block.head)
          ? block.head
              .slice(0, columns)
              .map((h): PaperHeadSanitized | null => {
                if (typeof h === "string") return { text: h.slice(0, 200), span: 1 };
                if (typeof h !== "object" || h === null) return null;
                const entry = h as Record<string, unknown>;
                if (typeof entry.text !== "string") return null;
                const span =
                  typeof entry.span === "number" && Number.isFinite(entry.span)
                    ? Math.min(Math.max(Math.floor(entry.span) || 1, 1), columns)
                    : 1;
                return { text: entry.text.slice(0, 200), span };
              })
              .filter((h): h is PaperHeadSanitized => h !== null)
          : undefined;
        const rowsRaw = Array.isArray(block.rows) ? block.rows.slice(0, MAX_TABLE_ROWS) : null;
        if (!rowsRaw) return null;
        const rows: PaperCellSanitized[][] = [];
        for (const rowRaw of rowsRaw) {
          if (!Array.isArray(rowRaw)) return null;
          const row: PaperCellSanitized[] = [];
          for (const cellRaw of rowRaw) {
            if (typeof cellRaw !== "object" || cellRaw === null) return null;
            const cell = cellRaw as Record<string, unknown>;
            if (typeof cell.label !== "undefined" && typeof cell.label !== "string") return null;
            if (typeof cell.value !== "string") return null;
            row.push({
              ...(typeof cell.label === "string" && cell.label !== ""
                ? { label: cell.label.slice(0, 200) }
                : {}),
              value: cell.value.slice(0, MAX_BLOCK_TEXT),
              ...(typeof cell.span === "number" ? { span: Math.min(Math.max(Math.floor(cell.span) || 1, 1), columns) } : {}),
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
          ...(typeof block.emphasizeFirstCell === "boolean"
            ? { emphasizeFirstCell: block.emphasizeFirstCell }
            : {}),
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
