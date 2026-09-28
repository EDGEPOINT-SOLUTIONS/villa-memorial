import type { Metadata } from "next";
import Link from "next/link";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
import { ErrorState } from "@/components/ui/states";
import { listLandingContent, type ContactInfo } from "@/lib/api-client/landing";
import { findPublishedMemorial } from "@/lib/api-client/memorials";
import {
  MEMORIAL_FIND_HREF,
  MEMORIAL_SERVICE_NOTE,
  MEMORIAL_UNAVAILABLE_HINT,
  MEMORIAL_UNAVAILABLE_LEAD,
  MEMORIAL_UNAVAILABLE_TITLE,
  type PublishedMemorial,
} from "@/lib/memorials";
import { UNPUBLISHED_MEMORIAL_ROBOTS, pageMetadata } from "@/lib/seo";
import { MemorialProfile } from "./memorial-profile";
import { VisibilityChoices } from "../visibility-choices";

type MemorialParams = { params: Promise<{ id: string }> };

/**
 * Digital Memorial Page — /memorials/[id] (screen-inventory "Digital Memorial
 * Page", F-04).
 *
 * ONE URL SHAPE, ONE UNIFORM ANSWER. A published memorial renders
 * `MemorialProfile`; an id that does not exist, and an id whose family has kept
 * the memorial private or family-only, render the SAME `UnavailableMemorial`
 * block built on the shared `PublicHero` + `SectionHead` + `PublicDisclosure`
 * grammar (public-minimal identity pass, lane 4). The page never confirms that
 * an unpublished person exists, and its head is noindex unless the family
 * published it — `app/robots.ts` cannot express "noindex only while
 * unpublished" because the same path serves both, so the page's own metadata
 * carries the rule.
 *
 * The store (`lib/api-client/memorials.ts`) only ever returns published records
 * — no fabricated memorial, no placeholder person, and no name that looks real
 * can reach this route while the digital-memorial service does not exist.
 */
export async function generateMetadata({ params }: MemorialParams): Promise<Metadata> {
  const { id } = await params;
  let memorial: PublishedMemorial | null = null;
  try {
    memorial = findPublishedMemorial(id);
  } catch {
    memorial = null;
  }
  if (!memorial) {
    // No name, no canonical claim and an explicit noindex. The title says what
    // the page is, never who it might have been about.
    return {
      title: "Memorial — Villa Funeraria",
      description:
        "A memorial appears here only when a family chooses to publish it. Private and family-only memorials are never shown.",
      robots: UNPUBLISHED_MEMORIAL_ROBOTS,
    };
  }
  return pageMetadata({
    title: `${memorial.name} — Villa Funeraria`,
    description: `Remembering ${memorial.name} (${memorial.life_dates.display}) — the memorial their family published at Villa Memorial Park, with where they rest.`,
    path: `/memorials/${encodeURIComponent(memorial.id)}`,
  });
}

export const dynamic = "force-dynamic";

export default async function MemorialPage({ params }: MemorialParams) {
  const { id } = await params;
  const { contact } = await listLandingContent();

  let memorial: PublishedMemorial | null = null;
  let readFailed = false;
  try {
    memorial = findPublishedMemorial(id);
  } catch {
    readFailed = true;
  }

  if (readFailed) {
    return (
      <div className="mem-page">
        <ErrorState message="This memorial could not be read just now. Call the office and a person will look for you." />
      </div>
    );
  }

  if (!memorial) {
    return (
      <div className="mem-page">
        {/* No id in the crumb: the page never echoes what it cannot confirm. */}
        <nav className="mem-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/memorials">Digital memorial search</Link>
            </li>
            <li aria-current="page">Memorial</li>
          </ol>
        </nav>
        <UnavailableMemorial contact={contact} />
      </div>
    );
  }

  return (
    <div className="mem-page">
      <nav className="mem-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/memorials">Digital memorial search</Link>
          </li>
          <li aria-current="page">{memorial.name}</li>
        </ol>
      </nav>
      <MemorialProfile memorial={memorial} contact={contact} />
    </div>
  );
}

/**
 * The uniform answer for an absent AND an unpublished memorial. It explains the
 * family's three choices without ever narrowing which one applies.
 */
function UnavailableMemorial({ contact }: { contact: ContactInfo }) {
  return (
    <>
      <PublicHero
        variant="interior"
        id="memorial-title"
        eyebrow="Digital memorial"
        title={MEMORIAL_UNAVAILABLE_TITLE}
        lead={MEMORIAL_UNAVAILABLE_LEAD}
        primary={{ label: "Find my loved one", href: MEMORIAL_FIND_HREF }}
        secondary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
      />
      <section aria-labelledby="memorial-why-title">
        <SectionHead
          id="memorial-why-title"
          kicker="Why a memorial may not appear"
          title="Why this memorial is not shown here"
          lead={MEMORIAL_UNAVAILABLE_HINT}
        />
        <PublicDisclosure summary="See the family’s three choices">
          <VisibilityChoices title="What a family can choose" />
        </PublicDisclosure>
        <p className="mem-service-note">{MEMORIAL_SERVICE_NOTE}</p>
      </section>
    </>
  );
}
