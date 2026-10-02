import Link from "next/link";
import { FileText, Layers } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { listFamilyInquiries } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { countWord, familyInstantDateLabel } from "@/lib/family/family-view";
import { Answer, CallAction, QuietLink, Row, Rows, WhatThisShows } from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";

export const metadata = { title: "Your inquiries — Villa Funeraria" };

/**
 * Your inquiries — the family's OWN plan & lot inquiries (captain, 2026-10-02).
 *
 * "after they logged in, all their inquiries will now be tracked in their family
 * portal." This page is that tracking: it reads the SAME durable store the office
 * board reads (`listFamilyInquiries` → the enquiry journal), filtered to the
 * signed-in account, so what the family sees and what the office sees are one
 * record, never two copies that can drift.
 *
 * Services and products are NOT here — those inquiries need no account and live
 * only with the office. The empty state starts the flow: browse the plans or the
 * lots, and the ones the family asks about land here.
 */
export default async function Page() {
  const session = await requirePortalSessionOrRedirect("family");
  const inquiries = await listFamilyInquiries(session.userId);

  return (
    <div className="dash">
      <Answer
        kicker="Inquiries"
        headline={
          inquiries.length > 0
            ? `${countWord(inquiries.length)} ${inquiries.length === 1 ? "inquiry is" : "inquiries are"} with the office.`
            : "You haven’t asked about a plan or a lot yet."
        }
        sub="Plans and lots you ask about are kept here."
        actions={
          <>
            <CallAction label={`Call ${FAMILY_HELP.phone}`} />
            <QuietLink href="/plans" label="Ask about a plan" />
            <QuietLink href="/map?tab=lots" label="Ask about a lot" />
          </>
        }
      />

      <div className="dash-grid">
        <DashPanel
          role="needs"
          className="dash-span-12"
          label="Inquiries"
          title="What you asked about"
          count={inquiries.length > 0 ? countWord(inquiries.length) : undefined}
        >
          {inquiries.length > 0 ? (
            <Rows>
              {inquiries.map((inquiry) => (
                <Row
                  key={inquiry.id}
                  icon={
                    inquiry.kind === "lot" ? (
                      <FileText size={22} aria-hidden="true" />
                    ) : (
                      <Layers size={22} aria-hidden="true" />
                    )
                  }
                  title={inquiry.title}
                  meta={`${inquiry.kind === "lot" ? "Lot" : "Plan"} · asked ${familyInstantDateLabel(inquiry.received_at)}${
                    inquiry.detail ? ` · ${inquiry.detail}` : ""
                  }`}
                  state={inquiry.status}
                  action={<QuietLink href={FAMILY_HELP.phoneHref} label="Call us" />}
                />
              ))}
            </Rows>
          ) : (
            <p className="dash-note">
              Nothing yet. Ask about a plan or a lot and it appears here.
            </p>
          )}
        </DashPanel>
      </div>

      <WhatThisShows>
        Your inquiries are read from the office&rsquo;s own record. Call {FAMILY_HELP.phone} any time
        to follow one up.
      </WhatThisShows>

      <p className="text-sm text-muted">
        Services and coffins need no account — ask from <Link href="/services">Services</Link> or{" "}
        <Link href="/products">Coffins &amp; caskets</Link>.
      </p>
    </div>
  );
}
