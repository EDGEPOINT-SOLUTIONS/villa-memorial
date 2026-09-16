import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  FolderOpen,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { buildFamilyNeeds, familyDocumentView } from "@/lib/family/family-view";
import {
  FamilyDocRow,
  FamilyHero,
  FamilyMoney,
  FamilyNeeds,
  FamilyQuickActions,
  FamilySection,
} from "@/components/family/family-ui";

export const metadata = { title: "Home — Villa Memorial" };

/** Initials for the portrait frame — the respectful default when no photo exists. */
function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Family Home — the approved design's "what needs me now" page
 * (docs/08-delivery/family-portal-design, page 2).
 *
 * Blocks render in the design's order. Blocks whose data does not exist yet
 * (the funeral schedule, case progress, the memorial) say so plainly instead of
 * showing invented detail — the design's own rule.
 */
export default async function ClientDashboardPage() {
  await requirePortalSessionOrRedirect("family");

  let snapshot;
  try {
    snapshot = await getFamilySnapshot();
  } catch {
    return (
      <>
        <header className="page-header">
          <div>
            <p className="page-header__eyebrow">Family portal</p>
            <h1>Home</h1>
          </div>
        </header>
        <section className="page-section">
          <ErrorState message="Your family summary is unavailable right now." />
          <p className="fp-note mt-4">
            If you need anything at all, call us on {FAMILY_HELP.phone} — {FAMILY_HELP.hours}.
          </p>
        </section>
      </>
    );
  }

  const { family, loved_one, plan_summary, balance, balance_cents, recent_documents } = snapshot;
  const needs = buildFamilyNeeds(snapshot);
  const documents = recent_documents.map((doc) => familyDocumentView(doc.title, doc.status));
  const firstName = family.display_name.split(" ")[0];

  return (
    <div className="fp-page">
      <FamilyHero
        eyebrow="Your family's arrangement"
        title={loved_one.name}
        dates={loved_one.life_dates}
        lead={`We are with your family through this, ${firstName}. Everything about your arrangement, and everything that needs you, is on this page.`}
        chips={[plan_summary.plan_name, `Next due ${plan_summary.next_due}`]}
        aside={
          <>
            <p className="fp-money__label">What needs you now</p>
            <p className="fp-hero__nextline">
              {needs.length > 0 ? needs[0].title : "Nothing right now"}
            </p>
            <p className="fp-note">
              {needs.length > 0 ? needs[0].detail : "We will tell you the moment anything changes."}
            </p>
          </>
        }
      />

      <FamilySection
        title="What needs you now"
        sub="We put the most important thing first. If you only read one part of this page, read this."
      >
        <FamilyNeeds needs={needs} />
        <p className="fp-note mt-4">
          The funeral schedule, the case progress and the memorial are still being wired up — they
          appear here as soon as they exist. Until then, call us with any question:{" "}
          {FAMILY_HELP.phone}.
        </p>
      </FamilySection>

      <FamilySection
        title="Reach us in a tap"
        sub="Every action a family actually takes, one tap from home."
      >
        <FamilyQuickActions
          items={[
            {
              label: "Call us",
              note: FAMILY_HELP.hours,
              href: FAMILY_HELP.phoneHref,
              icon: <Phone size={20} aria-hidden="true" />,
            },
            {
              label: "Send a message",
              note: "we reply in a few hours",
              href: "/client/support",
              icon: <MessageCircle size={20} aria-hidden="true" />,
            },
            {
              label: "How to pay",
              note: "GCash, bank, or at the office",
              href: "/client/payments",
              icon: <CreditCard size={20} aria-hidden="true" />,
            },
            {
              label: "Ask for a visit",
              note: "we come to you",
              href: "/client/appointments",
              icon: <CalendarDays size={20} aria-hidden="true" />,
            },
            {
              label: "See our papers",
              note: "receipts and contracts",
              href: "/client/documents",
              icon: <FolderOpen size={20} aria-hidden="true" />,
            },
            {
              label: "Find the park",
              note: "map and directions",
              href: "/map",
              icon: <MapPin size={20} aria-hidden="true" />,
            },
          ]}
        />
      </FamilySection>

      <FamilySection
        title="Money and papers"
        sub="What is left, what is done, and what we need from you — in one place."
      >
        <div className="fp-grid-3">
          <FamilyMoney
            label="Plan total"
            value={balance.total}
            note={plan_summary.plan_name}
          />
          <FamilyMoney label="Paid so far" value={balance.paid} note="Thank you." tone="ok" />
          <FamilyMoney
            label="Still open"
            value={balance.remaining}
            note={`Next due ${plan_summary.next_due}`}
            tone={balance_cents && balance_cents.remaining > 0 ? "due" : undefined}
          />
        </div>

        <div className="fp-split mt-4">
          <Card header={<h3 className="fp-h3">Latest papers</h3>}>
            {documents.length === 0 ? (
              <p className="fp-note">
                No papers have been issued yet. They will appear here the moment they are ready.
              </p>
            ) : (
              documents.map((doc) => (
                <FamilyDocRow
                  key={doc.title}
                  title={doc.title}
                  meta={doc.note}
                  status={doc.status}
                  tone={doc.tone}
                  href="/client/documents"
                />
              ))
            )}
          </Card>
          <Card header={<h3 className="fp-h3">Papers we still need from you</h3>}>
            <p className="fp-note">
              Nothing is waiting on you right now. If a document is missing we will name it here,
              say when we need it by, and give you one way to send it — a photo on your phone is
              enough.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/documents">
              Open documents
            </Link>
          </Card>
        </div>
      </FamilySection>

      <FamilySection
        title="Remembering"
        sub="The relationship does not end at the interment — this is the part families come back for."
      >
        <Card>
          <div className="fp-split">
            <div>
              <div className="row row--wrap fp-memorial-heading">
                <span className="fp-portrait" aria-hidden="true">
                  <span className="fp-portrait__monogram">{monogram(loved_one.name)}</span>
                </span>
                <div>
                  <p className="fp-memorial__label">In loving memory</p>
                  <p className="fp-memorial__name">{loved_one.name}</p>
                  <p className="fp-memorial__dates">{loved_one.life_dates}</p>
                </div>
              </div>
              <p className="fp-note mt-3">
                A photograph is never required — we use his initials until your family decides. A
                memorial page your family keeps, with tributes you approve and visibility you
                control, is designed and not switched on yet.
              </p>
            </div>
            <div>
              <p className="fp-h3">What will be here</p>
              <ul className="fp-bullets">
                <li>Their page, with the story and photos your family chooses</li>
                <li>Tributes from family and friends, published only after your approval</li>
                <li>Remembrance dates — birthday, anniversary, All Souls&rsquo; — that you can switch off</li>
              </ul>
              <Link className="btn btn--secondary btn--sm mt-4" href="/client/memorials">
                See what is planned
              </Link>
            </div>
          </div>
        </Card>
      </FamilySection>

      <FamilySection title="If something is wrong">
        <Card>
          <div className="row row--wrap">
            <Badge tone="info">Always reachable</Badge>
            <p className="fp-note">
              Call {FAMILY_HELP.phone} ({FAMILY_HELP.hours}) — or {FAMILY_HELP.secondPhone} for
              plan questions with Villa Agency on {FAMILY_HELP.agencyPhone}.
            </p>
          </div>
        </Card>
      </FamilySection>
    </div>
  );
}
