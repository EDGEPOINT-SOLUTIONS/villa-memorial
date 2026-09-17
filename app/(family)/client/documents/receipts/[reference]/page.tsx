import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  buildFamilyReceiptPaper,
  familyPapers,
  familyReceiptFileStem,
  familyReceiptHasCopy,
} from "@/lib/family/family-documents";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { Answer, PrimaryAction, QuietLink, Section } from "@/components/family/family-ui";

export const metadata = { title: "Your official receipt — Villa Memorial" };

/**
 * One official receipt as the family's own copy.
 *
 * The record is the source: the receipt number, the date received, the amount and what
 * it covers are printed exactly as recorded through the shared paper grammar
 * (`PaperSheet` + the same .docx/.pdf exports as every other paper in the repo).
 * A record that does not carry the number, date and amount has NO copy to open — this
 * route answers 404 rather than assembling a receipt nobody issued.
 */
export default async function ClientReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await requirePortalSessionOrRedirect("family");
  const { reference } = await params;
  const snapshot = await getFamilySnapshot();
  const { receipts } = familyPapers(snapshot.recent_documents);
  const decoded = decodeURIComponent(reference);
  const receipt = receipts.find(
    (entry) =>
      entry.reference === decoded || (entry.reference ? encodeURIComponent(entry.reference) === reference : false),
  );
  if (!receipt) {
    notFound();
  }

  // A receipt the app cannot faithfully render (missing number, date or amount)
  // has no copy to show — 404 rather than a half-receipt.
  const paper = familyReceiptHasCopy(receipt) ? buildFamilyReceiptPaper(receipt) : null;
  if (!paper) {
    notFound();
  }
  const filename = familyReceiptFileStem(receipt);

  return (
    <>
      <Answer
        kicker="Your papers"
        headline={`Official receipt ${receipt.reference}`}
        sub="This is your family's own copy — open it, print it or download it whenever you need it. You never have to ask us for it."
        actions={
          <>
            <PrimaryAction href="/client/documents" label="Back to your papers" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />
      <Section
        title="Your receipt"
        sub="Exactly as it is recorded on your family's account. Print it, or download it as Word or PDF."
      >
        <PaperExportActions blocks={paper.blocks} filename={filename} />
        <PaperSheet blocks={paper.blocks} />
      </Section>
    </>
  );
}
