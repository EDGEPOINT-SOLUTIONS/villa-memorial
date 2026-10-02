import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { buildGeneralPriceList } from "@/lib/general-price-list";
import { PrintListButton } from "@/components/villa/price-index-nav";

export const metadata: Metadata = pageMetadata({
  title: "General price list — Villa Funeraria",
  description:
    "Villa Funeraria's General Price List — professional services, facilities, transportation, the 24 casket models, the Villa Memorial Plan, the park lots and the cash assistance, effective 2026.",
  path: "/general-price-list",
});

// Reads the pricing store and the contact record per request — an office edit
// must be what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The General Price List (captain, 2026-10-02, inbox 004): a dedicated public
 * page built from Villa's recorded 2026 data, in the reference General Price
 * List's order — professional services · facilities & equipment ·
 * transportation · merchandise · plans and lots · cash assistance · branches.
 *
 * Every figure is a live read (`lib/general-price-list.ts`): the plan rates and
 * lot families come from the pricing store; the 24 caskets, the cash assistance
 * and the branches are the client's recorded 2026 material. The funeral
 * services keep the client's "quoted, not listed" rule, so they are itemised
 * with an explicit "Quoted" and no invented amount.
 *
 * The Download action asks the existing paper-PDF route for the same document
 * (`/api/export/paper-pdf?document=general-price-list`), which builds it from
 * the SAME `buildGeneralPriceListPaper` — so the page and the PDF cannot drift.
 */
export default async function GeneralPriceListPage() {
  const [pricing, content] = await Promise.all([loadPricingDocument(), listLandingContent()]);
  const gpl = buildGeneralPriceList(pricing, content.contact);
  const { contact } = content;

  return (
    <div className="gpl-page container--catalogue">
      <header className="gpl-head">
        <p className="gpl-head__kicker">General price list</p>
        <h1 className="gpl-head__title">Villa Funeraria — General Price List</h1>
        <p className="gpl-head__lead">
          {gpl.effective} · every published 2026 amount in one list.
        </p>
        <div className="gpl-head__actions">
          <a
            className="btn btn--primary btn--lg"
            href="/api/export/paper-pdf?document=general-price-list"
          >
            Download the PDF
          </a>
          <PrintListButton className="btn btn--secondary btn--lg">
            Print this list
          </PrintListButton>
          <Link className="btn btn--secondary btn--lg" href="/price-list">
            The 2026 price index
          </Link>
        </div>
        <p className="gpl-head__provenance">
          Served by Funeraria Villa &amp; ZC-Arcega Funeral Homes, underwritten by Villa Agency
          Insurance Services. {contact.phoneDisplay} · {contact.officeAddress}
        </p>
      </header>

      {gpl.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="gpl-band"
          aria-labelledby={`${section.id}-title`}
        >
          <p className="gpl-band__kicker">{section.kicker}</p>
          <h2 id={`${section.id}-title`} className="gpl-band__title">
            {section.title}
          </h2>
          {section.lead ? <p className="gpl-band__lead">{section.lead}</p> : null}

          {section.tables?.map((t, index) => (
            <div className="gpl-table-block" key={t.caption ?? index}>
              {t.caption ? <h3 className="gpl-table__caption">{t.caption}</h3> : null}
              <div className="table-wrapper" tabIndex={0}>
                <table className="table gpl-table">
                  <thead>
                    <tr>
                      {t.head.map((cell, column) => (
                        <th key={column} scope="col">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, column) => (
                          <td key={column}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {section.lines ? (
            <dl className="gpl-lines">
              {section.lines.map((item, index) => (
                <div className="gpl-line" key={index}>
                  <dt className="gpl-line__label">
                    {item.label}
                    {item.detail ? <span className="gpl-line__detail"> — {item.detail}</span> : null}
                  </dt>
                  {item.amount ? <dd className="gpl-line__amount">{item.amount}</dd> : null}
                </div>
              ))}
            </dl>
          ) : null}

          {section.note ? <p className="gpl-band__note">{section.note}</p> : null}
        </section>
      ))}
    </div>
  );
}
