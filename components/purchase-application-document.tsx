"use client";

/**
 * PurchaseApplicationDocument — the recorded application as the paper document (the
 * "generated agreement / paper document view" in fixture mode).
 *
 * Renders the SAME PaperBlocks the .docx / .pdf exports use, from the stored application
 * record (not the live documents service, which fixture mode cannot call — it answers 503
 * honestly when live). Print, Word and PDF all come from this one sheet.
 */
import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import type { PurchaseApplication } from "@/lib/contracts/purchase-application";
import { buyerFullName } from "@/lib/contracts/purchase-application";
import type { Lot } from "@/lib/api-client/property";
import { buildPurchasePaper, purchasePaperFromApplication } from "@/lib/contracts/purchase-paper";
import { paperFileStem } from "@/lib/export/types";

export function PurchaseApplicationDocument({
  application,
  lot,
  editHref,
}: {
  application: PurchaseApplication;
  lot: Pick<Lot, "lot_number" | "section" | "block" | "area_sqm">;
  editHref: string;
}) {
  const doc = useMemo(() => {
    try {
      const data = purchasePaperFromApplication(application, lot);
      return { ok: true as const, ...buildPurchasePaper(data) };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : "Could not assemble the paper document.",
      };
    }
  }, [application, lot]);

  const buyer = buyerFullName(application);
  const filename = useMemo(
    () => paperFileStem([`${doc.ok ? doc.title : "Purchase-Document"}-Lot-${lot.lot_number}`, buyer || undefined]),
    [doc, lot.lot_number, buyer],
  );

  return (
    <div className="stack paper-view">
      <div className="card paper-view__toolbar">
        <div className="paper-view__toolbar-row">
          <div className="paper-view__toolbar-head">
            <p className="page-header__eyebrow">Paper document · on file {application.application_date}</p>
            <h2 className="text-lg">{doc.ok ? doc.title : "Purchase document"}</h2>
            <p className="text-sm text-muted">
              {lot.lot_number}
              {buyer ? ` · ${buyer}` : ""} — what the buyer signs. Print for signature, or
              download as Word or PDF.
            </p>
          </div>
          <PaperExportActions blocks={doc.ok ? doc.blocks : []} filename={filename}>
            <a href={editHref} className="btn btn--secondary btn--sm">
              <Pencil size={15} aria-hidden="true" />
              Edit application
            </a>
          </PaperExportActions>
        </div>
        </div>

      {doc.ok ? (
        <PaperSheet blocks={doc.blocks} />
      ) : (
        <Alert tone="danger" title="Could not assemble the paper document">
          {doc.message}
        </Alert>
      )}
    </div>
  );
}
