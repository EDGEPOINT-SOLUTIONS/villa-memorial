/**
 * Family-paper rows — the two treatments a paper can get in the family portal.
 *
 *   OwnedPaperRow     — the family's service contract and every official receipt.
 *                       Plainly theirs: state “Yours”, the ownership sentence, a real
 *                       view when the record can produce one, or the honest “we are
 *                       getting it ready for this page” plus a person to call. There is
 *                       no request button on this row, ever.
 *   RequestPaperRow   — every other paper type (certificates, permits, applications):
 *                       the unchanged “Ask for a copy” path.
 *
 * Both are server-renderable and take a projected `FamilyDocument`; the words come from
 * `lib/family/family-documents.ts` so the pages and the tests read one source.
 */
import { FileText, ReceiptText } from "lucide-react";
import type { FamilyDocument } from "@/lib/api-client/family";
import { QuietAction, Row } from "@/components/family/family-ui";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  familyDocumentView,
  type FamilyDocumentView,
} from "@/lib/family/family-view";
import { familyReceiptHref, ownedPaperNote } from "@/lib/family/family-documents";

/** The family's own paper: theirs to keep, never something they request. */
export function OwnedPaperRow({ paper }: { paper: FamilyDocument }) {
  const receipt = paper.kind === "official_receipt";
  const href = receipt ? familyReceiptHref(paper) : null;
  return (
    <Row
      icon={receipt ? <ReceiptText size={22} aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}
      title={receipt && paper.reference ? `Official receipt ${paper.reference}` : paper.title}
      meta={ownedPaperNote(paper)}
      state="Yours"
      action={
        href ? (
          <QuietAction href={href} label={receipt ? "Open the receipt" : "Open your contract"} />
        ) : (
          <QuietAction href={FAMILY_HELP.phoneHref} label="Call if you need it today" />
        )
      }
    />
  );
}

/** A paper the family asks us for (certificates, permits and the rest). */
export function RequestPaperRow({
  paper,
  view,
}: {
  paper: FamilyDocument;
  /** Optional pre-computed view (pages that already mapped the family words). */
  view?: FamilyDocumentView;
}) {
  const doc = view ?? familyDocumentView(paper.title, paper.status);
  return (
    <Row
      icon={<FileText size={22} aria-hidden="true" />}
      title={doc.title}
      meta={doc.note}
      state={doc.status}
      wait={doc.tone === "warning" || doc.tone === "danger"}
      action={<QuietAction href={FAMILY_HELP.phoneHref} label="Ask for a copy" />}
    />
  );
}
