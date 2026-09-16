import Link from "next/link";
import { COFFINS, COFFIN_TIER_NOTE } from "@/lib/villa-pricing";
import { CasketCatalogue } from "@/components/villa/casket-catalogue";

export const metadata = { title: "Coffins & caskets — Villa Memorial" };

/**
 * Coffins & caskets — the client's full 2026 casket catalogue at published
 * prices. The tier photography block keeps the existing treatment (TYPES OF
 * COFFIN sheet); the two tables below it carry every model from the "For
 * package" table of 2026 price FV website A with its SRP, senior discount and
 * discounted price, plus PRICE LIST FOR 2026 III's per-family inclusions — see
 * components/villa/casket-catalogue.tsx and lib/villa-pricing.ts for provenance.
 */
export default function ProductsPage() {
  return (
    <div className="stack-4">
      <section className="page-hero">
        <p className="eyebrow-label">Coffins &amp; caskets</p>
        <h1 className="page-hero__title">Coffin options</h1>
        <p className="page-hero__lead">
          Choose the coffin that honours your loved one — from dignified Bronze to the
          sophisticated Gold. Every 2026 model is listed below with its published price:
          the SRP, the senior-citizen discount and the discounted price.
        </p>
        <nav aria-label="Back to Villa Memorial Plan" style={{ marginTop: "var(--space-3)" }}>
  <Link href="/plans" className="back-link">
    ← Back to Villa Memorial Plan (All · Packages · Services · Add-ons)
  </Link>
</nav>
      </section>

      <div className="landing__grid">
        {COFFINS.map((c) => (
          <article key={c.tier} className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photos */}
              <img src={c.photo} alt={c.tier + " casket"} loading="lazy" />
            </div>
            <div className="card__body">
              <h3>{c.tier}</h3>
              <p className="text-sm text-muted">{c.description}</p>
              <p className="text-sm">
                <strong>Lid:</strong> {c.lid}
              </p>
            </div>
          </article>
        ))}
      </div>

      <p className="text-sm text-muted">{COFFIN_TIER_NOTE}</p>

      <section className="stack-3" aria-labelledby="catalogue-title">
        <h2 className="section-title" id="catalogue-title">
          The 2026 casket catalogue — every model with its price
        </h2>
        <p className="text-sm text-muted">
          Regular SRP, the senior-citizen SRP the sheet reprints beside it, the
          senior-citizen discount and the discounted price for each casket. Senior
          citizens are 61–100 years old with no insurance benefit. The chapel columns are
          the package&rsquo;s own day rates; a family that does not take a package pays the
          chapel-use rates on the <Link href="/services">services page</Link>.
        </p>
        <CasketCatalogue />
      </section>

      <p className="text-sm text-muted">
        Every casket model above is included in the{" "}
        <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>; senior
        citizens enjoy the <Link href="/plans/senior-benefits">senior plan</Link> with free
        flowers. See the <Link href="/services">memorial service rates</Link> (embalming per
        day, retrieval, delivery, viewing equipment, coffin and interment) or{" "}
        <Link href="/lots/price-list-2026">the 2026 lot price list</Link>.
      </p>
    </div>
  );
}
