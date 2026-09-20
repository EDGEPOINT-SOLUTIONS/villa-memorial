/**
 * Rich text — the pure HTML half of the typed node tree (lib/content-catalog.ts
 * owns the model; this module only serialises it).
 *
 * The PUBLIC renderer is React (`components/content/rich-text.tsx`), so a stored
 * description is never turned into HTML for a reader — a stored `href` can only
 * carry one of the safe schemes the validator accepts. This serializer exists for
 * the admin editor's `contenteditable` host and for paper/export consumers, where
 * a string is needed. It escapes every text character, so a title containing
 * `<script>` can never become markup.
 */
import type { RichTextDoc, RichTextSpan } from "@/lib/content-catalog";

/** The same safe destination vocabulary the model validator enforces. */
const HREF_PATTERN = /^(?:\/|#|https?:\/\/|mailto:|tel:)/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function spanHtml(span: RichTextSpan): string {
  let html = escapeHtml(span.text);
  if (span.marks?.includes("italic")) html = `<em>${html}</em>`;
  if (span.marks?.includes("bold")) html = `<strong>${html}</strong>`;
  if (span.href && HREF_PATTERN.test(span.href)) {
    html = `<a href="${escapeHtml(span.href)}">${html}</a>`;
  }
  return html;
}

function spansHtml(spans: readonly RichTextSpan[]): string {
  return spans.map(spanHtml).join("");
}

/** One node → its semantic HTML. */
function nodeHtml(node: RichTextDoc["nodes"][number]): string {
  switch (node.type) {
    case "heading":
      return `<h${node.level}>${escapeHtml(node.text)}</h${node.level}>`;
    case "paragraph":
      return `<p>${spansHtml(node.spans)}</p>`;
    case "bulletList":
      return `<ul>${node.items.map((item) => `<li>${spansHtml(item)}</li>`).join("")}</ul>`;
    case "orderedList":
      return `<ol>${node.items.map((item) => `<li>${spansHtml(item)}</li>`).join("")}</ol>`;
  }
}

/** The editor host's initial HTML. An empty document serialises to "". */
export function richTextToHtml(doc: RichTextDoc | null | undefined): string {
  if (!doc) return "";
  return doc.nodes.map(nodeHtml).join("");
}

/** Whether a document carries any actual copy (the same test the validator runs). */
export function richTextIsEmpty(doc: RichTextDoc | null | undefined): boolean {
  if (!doc) return true;
  return !doc.nodes.some((node) => {
    if (node.type === "heading") return node.text.trim().length > 0;
    const items = node.type === "paragraph" ? [node.spans] : node.items;
    return items.some((spans) => spans.some((span) => span.text.trim().length > 0));
  });
}
