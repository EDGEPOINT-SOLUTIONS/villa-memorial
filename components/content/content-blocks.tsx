import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import type { ContentBlock } from "@/lib/content-catalog";
import { publicMediaUrl } from "@/lib/media-url";

/**
 * Content blocks → the public page (Phase 1 of the content-catalogue plan).
 *
 * Renders the shared block vocabulary with the storefront's existing grammar:
 * sections in the page's cards, tables through `.table-wrapper`, galleries as
 * the 4:3 figure family, notes through the design-system Alert, links as the
 * hero chips. No new visual language.
 *
 * MONEY IS NEVER IN THE BLOCK: a price block's amount arrives through `priceOf`
 * (resolved from the catalogue/storefront record by the page) or through
 * `matrixOf` (the pricing store's own table component). A block whose binding
 * does not resolve renders its heading and note only — the validator refuses
 * such a save, so this is a read-safety fallback, never a normal state.
 */
export function ContentBlocks({
  blocks,
  priceOf,
  matrixOf,
  mediaBaseUrl = null,
}: {
  blocks: ContentBlock[];
  priceOf: (sku: string) => string | null;
  matrixOf?: (ref: string) => ReactNode | null;
  /** The optional CDN/origin prefix for stored media (lib/media-url.ts). Passed
   * down from the server so a client hydration cannot disagree with the SSR URL. */
  mediaBaseUrl?: string | null;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="stack-4">
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          priceOf={priceOf}
          matrixOf={matrixOf}
          mediaBaseUrl={mediaBaseUrl}
        />
      ))}
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card__body stack-3">
        {heading ? <h2 className="section-title">{heading}</h2> : null}
        {children}
      </div>
    </section>
  );
}

function Block({
  block,
  priceOf,
  matrixOf,
  mediaBaseUrl,
}: {
  block: ContentBlock;
  priceOf: (sku: string) => string | null;
  matrixOf?: (ref: string) => ReactNode | null;
  mediaBaseUrl: string | null;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <Section heading={block.heading}>
          {block.body
            .filter((line) => line.trim().length > 0)
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
        </Section>
      );
    case "bullets":
      return (
        <Section heading={block.heading}>
          <ul className="rate-facts">
            {block.items
              .filter((item) => item.trim().length > 0)
              .map((item, index) => (
                <li key={index}>{item}</li>
              ))}
          </ul>
        </Section>
      );
    case "checklist": {
      const list = (
        <ul className="stack-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {block.items.map((item) => (
            <li key={item.id}>
              <span aria-hidden="true" style={{ marginRight: "var(--space-2)" }}>
                {item.checked ? "✓" : "○"}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      );
      if (block.mode === "dropdown" && block.heading) {
        return (
          <details className="sv-disclosure">
            <summary>{block.heading}</summary>
            <div className="sv-disclosure__body">{list}</div>
          </details>
        );
      }
      return <Section heading={block.heading}>{list}</Section>;
    }
    case "steps":
      return (
        <Section heading={block.heading}>
          <ol className="sv-steps">
            {block.steps.map((step) => (
              <li key={step.id}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>
      );
    case "gallery":
      return (
        <Section heading={block.heading}>
          <div className="landing__grid">
            {block.images.map((image) => (
              <figure key={image.id} className="tribute-figure">
                {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
                <img src={publicMediaUrl(image.src, mediaBaseUrl)} alt={image.alt} loading="lazy" />
                <figcaption>
                  {image.caption ? <span>{image.caption}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      );
    case "table":
      return (
        <Section heading={block.heading}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              {block.caption ? <caption>{block.caption}</caption> : null}
              <thead>
                <tr>
                  {block.columns.map((column, index) => (
                    <th key={index} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {block.columns.map((_, cellIndex) => (
                      <td key={cellIndex}>{row[cellIndex] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      );
    case "priceTable": {
      const amount = block.binding.kind === "sku" ? priceOf(block.binding.sku) : null;
      const matrix = block.binding.kind === "matrix" ? matrixOf?.(block.binding.ref) ?? null : null;
      return (
        <Section heading={block.heading}>
          {amount ? <p className="detail-sticky__price">{amount}</p> : null}
          {matrix}
          {block.note ? <p className="text-sm text-muted">{block.note}</p> : null}
        </Section>
      );
    }
    case "priceList":
      return (
        <Section heading={block.heading}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.label || row.sku}</th>
                    <td>{priceOf(row.sku) ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note ? <p className="text-sm text-muted">{block.note}</p> : null}
        </Section>
      );
    case "note":
      return (
        <Alert tone={block.tone === "attention" ? "warning" : "info"} title={block.heading || undefined}>
          {block.text}
        </Alert>
      );
    case "links":
      return (
        <Section heading={block.heading}>
          <nav className="hero-chips" aria-label={block.heading || "Related pages"}>
            {block.items.map((item) => (
              <Link key={item.id} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </Section>
      );
  }
}
