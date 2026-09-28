import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall, ShieldCheck } from "lucide-react";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  MEMORIAL_FIND_HREF,
  MEMORIAL_NEVER_SHOWN,
  MEMORIAL_PROMISES,
  MEMORIAL_SERVICE_NOTE,
} from "@/lib/memorials";
import { pageMetadata } from "@/lib/seo";
import { VisibilityChoices } from "../visibility-choices";

export const metadata: Metadata = pageMetadata({
  title: "Find my loved one — Villa Funeraria",
  description:
    "A family's path to finding someone at Villa Memorial Park: what the office needs, how a memorial is created or changed, and the privacy rules that protect every family.",
  path: MEMORIAL_FIND_HREF,
});

export const dynamic = "force-dynamic";

/**
 * Find My Loved One — /memorials/find (screen-inventory "Find My Loved One",
 * F-04).
 *
 * THE GENTLER PATH. The public search is for anyone; this page is for the
 * person who is looking for their own. It says how the office looks, what to
 * have ready when calling, and how a memorial is created or changed — and it
 * repeats the privacy floor in the family's own terms, so nobody is promised
 * access the product will not give.
 *
 * Public-minimal identity pass (lane 4, Phase 0 contract): the six stacked
 * sections collapse to hero → steps → what to have ready → the family's
 * decision, with the promises and the three choices behind the shared
 * disclosure. Nothing here invents a process: the steps are what the office can
 * actually do today (a person looks in the office's own record), the details
 * asked for are the ones a search needs, and the client's own public-search
 * checklist is still an open question (docs/07-client-villa/open-questions.md) —
 * the page says so instead of pretending a form exists.
 */
const STEPS = [
  {
    title: "Tell us their name",
    detail: "As it was written in the record — a middle name or a nickname helps.",
  },
  {
    title: "Tell us what you know",
    detail: "The years, the park or the family name — whatever you are sure of.",
  },
  {
    title: "We look in the office record",
    detail: "Not only the public search: the office keeps its own record of everyone.",
  },
  {
    title: "We tell you what we find",
    detail: "If a family kept a memorial private, we say so, and we do not share it.",
  },
] as const;

const READY = [
  "Their full name, as it may have been recorded.",
  "Their life dates, if you know them.",
  "The park or lot, if you know it.",
  "Your own name and the best number to reach you.",
] as const;

export default async function FindMyLovedOnePage() {
  const { contact } = await listLandingContent();

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
          <li aria-current="page">Find my loved one</li>
        </ol>
      </nav>

      <PublicHero
        variant="interior"
        id="find-title"
        eyebrow="Find my loved one"
        title="Find someone you love"
        lead="We will look for them with you."
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: "Search the memorials", href: "/memorials" }}
      />

      <section aria-labelledby="steps-title">
        <SectionHead
          id="steps-title"
          kicker="How it works"
          title="How the office looks for someone"
          lead="Four things happen when you call."
        />
        <ol className="mem-steps">
          {STEPS.map((step, index) => (
            <li className="mem-step" key={step.title}>
              <span className="mem-step__num" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3 className="mem-step__title">{step.title}</h3>
                <p className="mem-step__detail">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <PublicDisclosure summary="What to have ready">
          <ul className="mem-list mem-list--check">
            {READY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mem-service-note">
            These details make a search possible; the office will ask only for what it needs.
          </p>
        </PublicDisclosure>
      </section>

      <section aria-labelledby="ask-title">
        <SectionHead
          id="ask-title"
          kicker="Creating or changing a memorial"
          title="A family’s decision, never a default"
          lead="Nothing is published until the family says so."
        />
        <PublicDisclosure summary="How a memorial is created or changed">
          <div className="mem-ask__grid">
            <article className="mem-ask">
              <PhoneCall size={20} aria-hidden="true" />
              <h3>Ask for a memorial to be created</h3>
              <p>
                The office writes down what the family wants, and nothing is published until the
                family says so.
              </p>
            </article>
            <article className="mem-ask">
              <ShieldCheck size={20} aria-hidden="true" />
              <h3>Change or close one</h3>
              <p>
                The family who published it can change or close it at any time. Call the office and
                ask.
              </p>
            </article>
          </div>
          <VisibilityChoices title="The three choices a family makes" />
          <p className="mem-intro">And what no memorial will ever show:</p>
          <ul className="mem-list mem-list--never">
            {MEMORIAL_NEVER_SHOWN.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <ul className="mem-list mem-list--check">
            {MEMORIAL_PROMISES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </PublicDisclosure>
        <p className="mem-service-note">{MEMORIAL_SERVICE_NOTE}</p>
      </section>
    </div>
  );
}
