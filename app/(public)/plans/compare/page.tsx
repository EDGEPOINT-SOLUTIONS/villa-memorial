import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";

export const metadata = { title: "Compare packages — Villa Memorial" };

/**
 * Compare — REAL catalog data. The frozen catalog contract carries what it
 * carries (name, description, type, price); the table compares exactly those
 * fields and no invented ones (no fake "holders/term" claims).
 */
export default async function ComparePage() {
  let items;
  try {
    items = await listCatalogItems("package");
  } catch {
    return (
      <div className="stack-4">
        <h1>Compare packages</h1>
        <ErrorState message="Packages are unavailable right now. Please try again shortly." />
      </div>
    );
  }

  return (
    <>
      <section className="page-hero">
        <p className="eyebrow-label">Packages</p>
        <h1 className="page-hero__title">Compare packages side by side</h1>
        <p className="page-hero__lead">
          The details below come straight from the current catalogue.
        </p>
        <nav aria-label="Back to Villa Memorial Plan" style={{ marginTop: "var(--space-3)" }}>
  <Link href="/plans" className="back-link">
    ← Back to Villa Memorial Plan (All · Packages · Services · Add-ons)
  </Link>
</nav>
      </section>

      {items.length === 0 ? (
        <EmptyState title="No packages to compare yet" hint="Check back soon." />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Package</th>
                {items.map((item) => (
                  <th key={item.sku} scope="col">
                    <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price</th>
                {items.map((item) => (
                  <td key={item.sku}>
                    <strong>{item.display_price}</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Description</th>
                {items.map((item) => (
                  <td key={item.sku} className="text-sm">
                    {item.description ?? "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Category</th>
                {items.map((item) => (
                  <td key={item.sku} className="text-sm">
                    {item.item_type}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted">
        <Link href="/plans">Browse all plans &amp; services</Link> ·{" "}
        <Link href="/plans/senior-benefits">Senior citizen rates</Link>
      </p>
    </>
  );
}
