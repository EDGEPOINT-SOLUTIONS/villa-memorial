import { FileText, Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyDocumentView } from "@/lib/family/family-view";
import {
  Answer,
  Note,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Papers — Villa Memorial" };

/**
 * Papers — the family's “My Documents” screen (PRD screen-inventory), on the
 * shared portal kit. Real today: the papers the snapshot records, in family
 * words, with one decision per row (here as one action per row). The full
 * repository is not wired and says so in one calm note.
 */
export default async function ClientDocumentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const documents = snapshot.recent_documents.map((doc) =>
    familyDocumentView(doc.title, doc.status),
  );
  const waiting = documents.filter((doc) => doc.tone === "warning" || doc.tone === "danger");

  return (
    <>
      <Answer
        kicker="Papers"
        headline={
          documents.length > 0
            ? "Your papers are ready. Nothing is waiting on you."
            : "No papers have been issued yet."
        }
        sub={
          documents.length > 0
            ? `${
                documents.length === 1 ? "One paper is" : `${countWord(documents.length)} papers are`
              } here for your family today. The rest arrive as the arrangement goes on — we will add them without you having to ask.`
            : "They appear here the moment they are ready. If you need something now, call us and we will find it for you."
        }
        chips={
          documents.length > 0 ? (
            <>
              <PortalChip>
                {documents.length === 1 ? "One paper" : `${countWord(documents.length)} papers`} ready
              </PortalChip>
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

      <Section
        id="papers"
        title="Your papers"
        sub="Every paper your family holds, and what happens next with each one."
      >
        {documents.length > 0 ? (
          <Rows>
            {documents.map((doc) => (
              <Row
                key={doc.title}
                icon={<FileText size={22} aria-hidden="true" />}
                title={doc.title}
                meta={doc.note}
                state={doc.status}
                wait={doc.tone === "warning" || doc.tone === "danger"}
                action={
                  <QuietAction href={FAMILY_HELP.phoneHref} label="Ask for a copy" />
                }
              />
            ))}
          </Rows>
        ) : (
          <p className="ag-sub">
            Nothing has been issued yet. Call us if you need a paper today and we will find it for
            you.
          </p>
        )}
      </Section>

      <Section
        title="If a bank, SSS or an insurer asks for a copy"
        sub="Call us and we will prepare a certified copy, usually the same day. You do not need to come to the office for it."
      >
        <QuietLink
          href={FAMILY_HELP.phoneHref}
          label="Ask for a certified copy"
          icon={<Phone size={20} aria-hidden="true" />}
        />
      </Section>

      <Note>
        <p>
          <strong>The full list is not on this page yet.</strong> The death certificate, the burial
          permit and your lot documents arrive here when the family records service is switched on.
          Until then, call us and we will find any paper for you.
        </p>
      </Note>
    </>
  );
}
