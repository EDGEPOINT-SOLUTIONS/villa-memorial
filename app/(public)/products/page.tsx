import Link from "next/link";
import { COFFINS } from "@/lib/villa-pricing";

export const metadata = { title: "Coffins & caskets — Villa Memorial" };

/** Villa Memorial coffin options (Bronze · Silver · Gold) — real product info. */
export default function ProductsPage() {
  return (
    <div className="stack-4">
      <section className="page-hero">
        <p className="eyebrow-label">Coffins &amp; caskets</p>
        <h1 className="page-hero__title">Coffin options</h1>
        <p className="page-hero__lead">
          Choose the coffin that honours your loved one — from dignified Bronze to the
          sophisticated Gold. Availability and final pricing are confirmed by the park
          office.
        </p>
        <nav aria-label="Back to plans" style={{ marginTop: "var(--space-3)" }}>
  <Link href="/plans" className="back-link">
    ← Back to plans &amp; services (All · Packages · Services · Add-ons)
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

      <p className="text-sm text-muted">
        Every coffin tier is included in the{" "}
        <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>; senior
        citizens enjoy the <Link href="/plans/senior-benefits">senior plan</Link> with free
        flowers. For current pricing, <Link href="/contact">contact the park office</Link>.
      </p>
    </div>
  );
}
