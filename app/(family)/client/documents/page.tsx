import { FileText, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDocumentView } from "@/lib/family/family-view";
import { familyPapers } from "@/lib/family/family-documents";
import { OwnedPaperRow, RequestPaperRow } from "@/components/family/family-papers";
import {
  Answer,
  PrimaryAction,
  QuietLink,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Papers — Villa Funeraria" };

/**
 * Papers — the family's “My Documents” screen (PRD screen-inventory),
 * compressed to the family reading budget (2026-09-21): one-sentence hero, the
 * two owned papers, and the honest gap in the ONE shared `WhatThisShows`
 * disclosure.
 *
 * THE CAPTAIN'S RULE THIS PAGE CARRIES (2026-09-17): the service contract and
 * every official receipt BELONG to the family. They are always on this page,
 * labelled as the family's own, with a real view when the record can produce
 * one and the honest “getting it ready for this page” state when it cannot —
 * never a request button, never “ask us for a copy”. The request path stays for
 * the other paper types (certificates, permits and the rest), unchanged.
 *
 * Real today: what the family snapshot records, in the family's words. Nothing
 * is invented — a receipt's date, amount and coverage print only when the record
 * carries them.
 */
export default async function ClientDocumentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const documents = snapshot.recent_documents.map((doc) =>
    familyDocumentView(doc.title, doc.status),
  );
  const waiting = documents.filter((doc) => doc.tone === "warning" || doc.tone === "danger");
  const { contract, receipts, requestable } = familyPapers(snapshot.recent_documents);
  const hasPapers = snapshot.recent_documents.length > 0;
  const ownedCount = (contract ? 1 : 0) + receipts.length;

  return (
    <>
      <Answer
        kicker="Papers"
        headline={
          hasPapers
            ? "Your papers are ready. Nothing is waiting on you."
            : "No papers have been issued yet."
        }
        sub={
          hasPapers
            ? `${
                snapshot.recent_documents.length === 1
                  ? "One paper is"
                  : `${countWord(snapshot.recent_documents.length)} papers are`
              } here for your family today.`
            : "Call us if you need something today."
        }
        chips={
          hasPapers ? (
            <>
              {ownedCount > 0 ? (
                <PortalChip>
                  {ownedCount === 1 ? "One paper that is yours" : `${countWord(ownedCount)} papers that are yours`}
                </PortalChip>
              ) : null}
              {waiting.length > 0 ? (
                <PortalChip>
                  {waiting.length === 1 ? "One paper" : `${countWord(waiting.length)} papers`} being
                  checked
                </PortalChip>
              ) : null}
            </>
          ) : null
        }
        actions={
          <>
            <PrimaryAction href="#papers" label="See your papers" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label={`Call ${FAMILY_HELP.phone}`}
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      {hasPapers ? (
        <>
          <Section
            id="papers"
            title="Your service contract"
            sub="Your family’s own copy — always here."
          >
            {contract ? (
              <Rows>
                <OwnedPaperRow paper={contract} />
              </Rows>
            ) : (
              <p className="ag-sub">
                No service contract is recorded here yet. Call us and we will find your copy.
              </p>
            )}
          </Section>

          <Section
            id="receipts"
            title="Your official receipts"
            sub="Every payment gets one, and it stays here."
          >
            {receipts.length > 0 ? (
              <Rows>
                {receipts.map((receipt) => (
                  <OwnedPaperRow key={receipt.reference ?? receipt.title} paper={receipt} />
                ))}
              </Rows>
            ) : null}
            <p className="ag-sub">
              {receipts.length > 0
                ? "If you have paid and no receipt shows here, call us and we will give you one today."
                : "None listed yet. Call us and we will give you any receipt today."}
            </p>
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Ask us about a payment"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </Section>

          <Section
            id="other-papers"
            title="Other papers we look after"
            sub="Certificates, permits and the rest."
          >
            {requestable.length > 0 ? (
              <Rows>
                {requestable.map((paper) => (
                  <RequestPaperRow key={paper.title} paper={paper} />
                ))}
              </Rows>
            ) : (
              <p className="ag-sub">
                The death certificate, the burial permit and your lot documents join this page as the
                arrangement goes on.
              </p>
            )}
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Ask us for a paper"
              icon={<FileText size={20} aria-hidden="true" />}
            />
          </Section>

          <Section
            title="If a bank, SSS or an insurer asks"
            sub="We prepare a certified copy, usually the same day."
          >
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Ask for a certified copy"
              icon={<Phone size={20} aria-hidden="true" />}
            />
          </Section>
        </>
      ) : (
        <Section id="papers" title="Your papers" sub="Every paper your family holds.">
          <p className="ag-sub">
            Nothing has been issued yet. Call us if you need a paper today.
          </p>
        </Section>
      )}

      <WhatThisShows>
        The death certificate, the burial permit and your lot documents arrive here when the records
        are connected. Call {FAMILY_HELP.phone}.
      </WhatThisShows>
    </>
  );
}
