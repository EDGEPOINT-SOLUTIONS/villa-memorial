import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, PhoneCall, Search, ShieldCheck } from "lucide-react";
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
  title: "Find my loved one — Villa Memorial",
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
 * Nothing here invents a process: the steps are what the office can actually
 * do today (a person looks in the office's own record), the details asked for
 * are the ones a search needs, and the client's own public-search checklist is
 * still an open question (docs/07-client-villa/open-questions.md) — the page
 * says so instead of pretending a form exists.
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

      <section className="hero-premium mem-hero" aria-labelledby="find-title">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Find my loved one</p>
            <h1 className="hero-premium__title" id="find-title">
              Find someone you love
            </h1>
            {/* The page's one-line answer (reading budget, captain 2026-09-18). */}
            <p className="hero-premium__lead">We will look for them with you.</p>
            <div className="hero-premium__actions">
              <a className="btn btn--primary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
              <Link className="btn btn--secondary" href="/memorials">
                Search the memorials
              </Link>
            </div>
          </div>
          <div className="mem-hero__card">
            <HeartHandshake size={22} aria-hidden="true" />
            <h2 className="mem-hero__card-title">A person will help you</h2>
            <p className="mem-hero__card-line">
              The office answers at any hour, and you will speak to a person.
            </p>
          </div>
        </div>
      </section>

      <section className="mem-section" aria-labelledby="steps-title">
        <p className="mem-kicker">How it works</p>
        <h2 className="mem-section-title" id="steps-title">
          How the office looks for someone
        </h2>
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
      </section>

      <section className="mem-section" aria-labelledby="ready-title">
        <p className="mem-kicker">Before you call</p>
        <h2 className="mem-section-title" id="ready-title">
          What to have ready
        </h2>
        <ul className="mem-list mem-list--check">
          {READY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mem-service-note">
          These details make a search possible; the office will ask only for what it needs.
        </p>
      </section>

      <section className="mem-section" aria-labelledby="ask-title">
        <p className="mem-kicker">Creating or changing a memorial</p>
        <h2 className="mem-section-title" id="ask-title">
          A family&rsquo;s decision, never a default
        </h2>
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
        <p className="mem-service-note">{MEMORIAL_SERVICE_NOTE}</p>
      </section>

      <section className="mem-section" aria-labelledby="privacy-title">
        <p className="mem-kicker">Privacy</p>
        <h2 className="mem-section-title" id="privacy-title">
          What we promise every family
        </h2>
        <ul className="mem-list mem-list--check">
          {MEMORIAL_PROMISES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mem-intro">And what no memorial will ever show:</p>
        <ul className="mem-list mem-list--never">
          {MEMORIAL_NEVER_SHOWN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mem-service-note">
          The park&rsquo;s own public search rules are still being confirmed with the client. The
          promises above hold either way.
        </p>
      </section>

      <section className="mem-find" aria-labelledby="find-help-title">
        <div>
          <h2 className="mem-find__title" id="find-help-title">
            Talk to the office
          </h2>
          <p className="mem-find__line">Any hour, any day — a person will answer.</p>
        </div>
        <div className="mem-find__actions">
          <a className="btn btn--primary" href={contact.phoneHref}>
            Call {contact.phoneDisplay}
          </a>
          <Link className="btn btn--secondary" href="/memorials">
            <Search size={18} aria-hidden="true" />
            Search memorials
          </Link>
        </div>
      </section>
    </div>
  );
}
