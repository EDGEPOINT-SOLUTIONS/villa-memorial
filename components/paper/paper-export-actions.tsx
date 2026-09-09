"use client";

/**
 * PaperExportActions — Word (.docx), PDF and Print for a rendered paper document.
 *
 * The .docx is built in the browser from the SAME PaperBlocks the on-screen sheet
 * renders (lib/export/docx.ts); the .pdf is assembled server-side by the export BFF
 * route from the same blocks. Both downloads carry the staff-entered values — no money
 * is derived anywhere (finance is dev domain) and blanks print as honest em dashes.
 */
import { useState, type ReactNode } from "react";
import { FileDown, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { PaperBlock } from "@/lib/export/types";

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function PaperExportActions({
  blocks,
  filename,
  children,
}: {
  blocks: PaperBlock[];
  /** Filename stem without extension — the safe name is computed by the caller. */
  filename: string;
  /** Extra context buttons rendered before the exports (e.g. "Back to editing"). */
  children?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);

  async function downloadWord() {
    setError(null);
    setBusy("docx");
    try {
      const { paperToDocxBlob } = await import("@/lib/export/docx");
      const blob = await paperToDocxBlob(blocks);
      download(blob, `${filename}.docx`);
    } catch {
      setError("Word export failed — please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setError(null);
    setBusy("pdf");
    try {
      const res = await fetch("/api/export/paper-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) {
        throw new Error(`pdf export failed (${res.status})`);
      }
      const blob = await res.blob();
      download(blob, `${filename}.pdf`);
    } catch {
      setError("PDF export failed — please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error ? (
        <Alert tone="danger" title="Export failed">
          {error}
        </Alert>
      ) : null}
      <div className="btn-group paper-export-actions">
        {children}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          title="Print this document (save as PDF from the print dialog if you like)"
        >
          <Printer size={16} aria-hidden="true" />
          Print
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={downloadWord}
          disabled={busy !== null}
          title="Download as a Microsoft Word (.docx) document"
        >
          <FileDown size={16} aria-hidden="true" />
          {busy === "docx" ? "Building Word file…" : "Word (.docx)"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={downloadPdf}
          disabled={busy !== null}
          title="Download as a PDF"
        >
          <FileText size={16} aria-hidden="true" />
          {busy === "pdf" ? "Building PDF…" : "PDF"}
        </Button>
      </div>
    </div>
  );
}
