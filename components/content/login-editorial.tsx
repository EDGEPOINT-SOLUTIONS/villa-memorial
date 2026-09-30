import Link from "next/link";
import { libraryThumb, libraryThumbSet } from "@/lib/media";
import { publicMediaUrl } from "@/lib/media-url";
import type { ContentBlock, ContentImage, PageDocument } from "@/lib/content-catalog";

/**
 * The sign-in page's editorial panel — the office's own words.
 *
 * The panel is the LEFT half of `/login`: a greeting (the document's hero) and
 * the office's announcements — its news, promotions, events and member
 * invitations (the document's `notice` blocks, with the editorial block palette
 * the page's editor curates through `EDITORIAL_BLOCK_TYPES`).
 *
 * EVERY WORD AND PHOTOGRAPH COMES FROM THE DOCUMENT. Nothing here is typed in:
 * the greeting is `hero.eyebrow` / `hero.headline` / `hero.lead`, each notice is
 * a `notice` block, and the view renders nothing a field leaves empty — an empty
 * document removes the panel rather than leaving a dark hole beside the form.
 *
 * The grammar is the home's: a display-serif greeting at the page-title step
 * (weight 500, never bold), a kicker in the micro step, hairline-separated
 * entries (not a grid of equal boxes), and whole photographs at a sensible size.
 * It is a server component so the document is read before the panel is handed
 * to the client sign-in card as a slot.
 */

/** True when the document carries anything the panel prints — no empty shell. */
export function hasEditorialContent(document: PageDocument): boolean {
  const { eyebrow, headline, lead, image } = document.hero;
  return Boolean(eyebrow || headline || lead || image) || document.blocks.length > 0;
}

export function LoginEditorial({
  document,
  mediaBaseUrl = null,
}: {
  document: PageDocument;
  mediaBaseUrl?: string | null;
}) {
  const { eyebrow, headline, lead, image } = document.hero;
  const hasGreeting = Boolean(eyebrow || headline || lead || image);
  const blocks = document.blocks;
  if (!hasGreeting && blocks.length === 0) return null;

  return (
    <aside className="signin-editorial" aria-label="From the office">
      {hasGreeting ? (
        <div className="signin-editorial__greeting">
          {eyebrow ? <p className="signin-editorial__eyebrow">{eyebrow}</p> : null}
          {headline ? <p className="signin-editorial__title">{headline}</p> : null}
          {lead ? <p className="signin-editorial__lead">{lead}</p> : null}
        </div>
      ) : null}

      {image ? (
        <EditorialPhoto
          image={{ id: "hero", src: image, alt: "", caption: null, sample: false }}
          mediaBaseUrl={mediaBaseUrl}
          className="signin-editorial__photo"
        />
      ) : null}

      {blocks.length > 0 ? (
        <ul className="signin-editorial__list">
          {blocks.map((block) => (
            <EditorialEntry key={block.id} block={block} mediaBaseUrl={mediaBaseUrl} />
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

function EditorialEntry({ block, mediaBaseUrl }: { block: ContentBlock; mediaBaseUrl: string | null }) {
  switch (block.type) {
    case "notice":
      return (
        <li className="signin-editorial__entry">
          {block.category ? <p className="signin-editorial__category">{block.category}</p> : null}
          {block.heading ? <h3 className="signin-editorial__entry-title">{block.heading}</h3> : null}
          {block.text ? <p className="signin-editorial__text">{block.text}</p> : null}
          {block.image ? (
            <EditorialPhoto image={block.image} mediaBaseUrl={mediaBaseUrl} className="signin-editorial__entry-photo" />
          ) : null}
          {block.href && block.linkLabel ? (
            <Link className="signin-editorial__link" href={block.href}>
              {block.linkLabel}
            </Link>
          ) : null}
        </li>
      );
    case "paragraph":
      return (
        <li className="signin-editorial__entry">
          {block.heading ? <h3 className="signin-editorial__entry-title">{block.heading}</h3> : null}
          {block.body
            .filter((line) => line.trim().length > 0)
            .map((line, index) => (
              <p className="signin-editorial__text" key={index}>
                {line}
              </p>
            ))}
        </li>
      );
    case "bullets":
      return (
        <li className="signin-editorial__entry">
          {block.heading ? <h3 className="signin-editorial__entry-title">{block.heading}</h3> : null}
          <ul className="signin-editorial__bullets">
            {block.items
              .filter((item) => item.trim().length > 0)
              .map((item, index) => (
                <li key={index}>{item}</li>
              ))}
          </ul>
        </li>
      );
    case "links":
      return (
        <li className="signin-editorial__entry">
          {block.heading ? <h3 className="signin-editorial__entry-title">{block.heading}</h3> : null}
          <ul className="signin-editorial__bullets">
            {block.items.map((item) => (
              <li key={item.id}>
                <Link className="signin-editorial__link" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      );
    case "note":
      return (
        <li className="signin-editorial__entry signin-editorial__entry--note">
          {block.heading ? <h3 className="signin-editorial__entry-title">{block.heading}</h3> : null}
          {block.text ? <p className="signin-editorial__text">{block.text}</p> : null}
        </li>
      );
    default:
      // The editor's palette is curated (EDITORIAL_BLOCK_TYPES); this is the
      // read-safety branch for a document hand-edited to carry another block.
      return block.heading ? (
        <li className="signin-editorial__entry">
          <h3 className="signin-editorial__entry-title">{block.heading}</h3>
        </li>
      ) : null;
  }
}

function EditorialPhoto({
  image,
  mediaBaseUrl,
  className,
}: {
  image: ContentImage;
  mediaBaseUrl: string | null;
  className: string;
}) {
  const src = libraryThumb(image.src, 640);
  const srcSet = libraryThumbSet(image.src);
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnail; a fixed-size CDN path, not an optimizable dynamic URL */}
      <img src={publicMediaUrl(src, mediaBaseUrl)} srcSet={srcSet} sizes="(max-width: 60rem) 92vw, 34rem" alt={image.alt} loading="lazy" />
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </figure>
  );
}
