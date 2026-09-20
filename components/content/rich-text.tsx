import type { ReactNode } from "react";
import type { RichTextDoc, RichTextSpan } from "@/lib/content-catalog";
import { richTextIsEmpty } from "@/lib/richtext";

/**
 * Rich text → semantic HTML (the public half of the typed node tree).
 *
 * A stored description renders from its NODES, never through
 * `dangerouslySetInnerHTML`: a heading is an `<h2>`/`<h3>`, a list is a real
 * `<ul>`/`<ol>`, and a link's `href` is the one the validator already restricted
 * to `/`, `#`, `https://`, `mailto:` or `tel:`. The page owns the `h1`, so the
 * editor will never offer one.
 *
 * Nothing here is styled inline: the `.rich-text` block in styles/components.css
 * owns the reading rhythm, and the four `--color-text-*` roles own the ink.
 */
function Spans({ spans }: { spans: readonly RichTextSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        let node: ReactNode = span.text;
        if (span.marks?.includes("italic")) node = <em>{node}</em>;
        if (span.marks?.includes("bold")) node = <strong>{node}</strong>;
        if (span.href) node = <a href={span.href}>{node}</a>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}

export function RichText({ doc, className }: { doc: RichTextDoc | null | undefined; className?: string }) {
  if (richTextIsEmpty(doc)) return null;
  const nodes = doc!.nodes;
  return (
    <div className={className ? `rich-text ${className}` : "rich-text"}>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "heading":
            return node.level === 3 ? (
              <h3 key={index}>{node.text}</h3>
            ) : (
              <h2 key={index}>{node.text}</h2>
            );
          case "paragraph":
            return (
              <p key={index}>
                <Spans spans={node.spans} />
              </p>
            );
          case "bulletList":
            return (
              <ul key={index}>
                {node.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Spans spans={item} />
                  </li>
                ))}
              </ul>
            );
          case "orderedList":
            return (
              <ol key={index}>
                {node.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Spans spans={item} />
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
