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
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Papers — Villa Funeraria" };

/**
 * Papers — the family's “My Documents” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30): the two owned papers and the
 * requestable ones in their own panels, with the honest gap in the ONE shared
 * disclosure.
 *
 * THE CAPTAIN'S RULE THIS PAGE CARRIES (2026-09-17): the service contract and
 * every official receipt BELONG to the family. They are always on this page,
 * labelled as the family's own, with a real view when the record can produce
 * one and the honest “getting it ready for this page” state when it cannot —
 * never a request button, never “ask us for a copy”. The request path stays for
 * the other paper types (certificates, permits and the rest), unchanged.
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
    <div className="dash">
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

      <div className="dash-grid">
        {hasPapers ? (
          <>
            <DashPanel
              id="papers"
              role="place"
              className="dash-span-12"
              label="Yours"
              title="Your service contract"
            >
              {contract ? (
                <Rows>
                  <OwnedPaperRow paper={contract} />
                </Rows>
              ) : (
                <p className="dash-empty">
                  No service contract is recorded here yet. Call us and we will find your copy.
                </p>
              )}
            </DashPanel>

            <DashPanel
              id="receipts"
              role="money"
              className="dash-span-12"
              label="Yours"
              title="Your official receipts"
              count={receipts.length > 0 ? countWord(receipts.length) : undefined}
            >
              {receipts.length > 0 ? (
                <Rows>
                  {receipts.map((receipt) => (
                    <OwnedPaperRow key={receipt.reference ?? receipt.title} paper={receipt} />
                  ))}
                </Rows>
              ) : null}
              <p className="dash-note">
                {receipts.length > 0
                  ? "If you have paid and no receipt shows here, call us and we will give you one today."
                  : "None listed yet. Call us and we will give you any receipt today."}
              </p>
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Ask us about a payment"
                icon={<Phone size={20} aria-hidden="true" />}
              />
            </DashPanel>

            <DashPanel
              id="other-papers"
              role="neutral"
              className="dash-span-12"
              label="Ask us"
              title="Other papers we look after"
            >
              {requestable.length > 0 ? (
                <Rows>
                  {requestable.map((paper) => (
                    <RequestPaperRow key={paper.title} paper={paper} />
                  ))}
                </Rows>
              ) : (
                <p className="dash-note">
                  The death certificate, the burial permit and your lot documents join this page as
                  the arrangement goes on.
                </p>
              )}
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Ask us for a paper"
                icon={<FileText size={20} aria-hidden="true" />}
              />
            </DashPanel>

            <DashPanel
              role="neutral"
              className="dash-span-12"
              label="Certified copies"
              title="If a bank, SSS or an insurer asks"
            >
              <p className="dash-state">We prepare a certified copy, usually the same day.</p>
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Ask for a certified copy"
                icon={<Phone size={20} aria-hidden="true" />}
              />
            </DashPanel>
          </>
        ) : (
          <DashPanel
            id="papers"
            role="place"
            className="dash-span-12"
            label="Papers"
            title="Your papers"
          >
            <p className="dash-empty">
              Nothing has been issued yet. Call us if you need a paper today.
            </p>
          </DashPanel>
        )}
      </div>

      <WhatThisShows>
        The death certificate, the burial permit and your lot documents arrive here when the records
        are connected. Call {FAMILY_HELP.phone}.
      </WhatThisShows>
    </div>
  );
}
