"use client";

/**
 * Rich-text editor — the zero-dependency toolbar over the typed node tree
 * (captain's Q5: no WYSIWYG library; report §7 section 1).
 *
 * The storage is ALWAYS a `RichTextDoc` node tree, never an HTML string. The
 * editing host is a `contenteditable` div seeded from `richTextToHtml`; every
 * change is parsed back through `parseEditorHtml`, which accepts only the tags
 * this product prints (`p`, `h2`, `h3`, `ul`, `ol`, `li`, `strong`/`b`,
 * `em`/`i`, `a`) and drops anything else. A pasted `<script>` or a stray `<table>`
 * therefore never survives a keystroke, and the public page re-renders from nodes.
 *
 * The toolbar is the captain's minimum: B · I · H2 · H3 · bullet list · numbered
 * list · link · paragraph. `document.execCommand` drives it — deprecated but
 * dependency-free and enough for a minimal office editor.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CONTENT_RICHTEXT_NODES_MAX,
  type RichTextDoc,
  type RichTextMark,
  type RichTextNode,
  type RichTextSpan,
} from "@/lib/content-catalog";
import { richTextToHtml } from "@/lib/richtext";

/** The same safe destination vocabulary the model validator enforces. */
const HREF_PATTERN = /^(?:\/|#|https?:\/\/|mailto:|tel:)/i;

function markedText(text: string, marks: RichTextMark[], href: string | undefined): RichTextSpan {
  const span: RichTextSpan = { text };
  const unique = [...new Set(marks)];
  if (unique.length > 0) span.marks = unique;
  if (href) span.href = href;
  return span;
}

function parseInline(node: Node, marks: RichTextMark[], href: string | undefined, out: RichTextSpan[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text) out.push(markedText(text, marks, href));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      out.push({ text: "\n" });
      continue;
    }
    const nextMarks: RichTextMark[] =
      tag === "strong" || tag === "b"
        ? [...marks, "bold"]
        : tag === "em" || tag === "i"
          ? [...marks, "italic"]
          : marks;
    const rawHref = tag === "a" ? el.getAttribute("href") : null;
    const nextHref = rawHref && HREF_PATTERN.test(rawHref) ? rawHref : href;
    parseInline(el, nextMarks, nextHref, out);
  }
}

/**
 * Parses editor HTML into the typed tree, keeping only the allowed tags. Runs in
 * the browser (the editor's own `onInput`); an environment without a DOM reads an
 * empty document rather than throwing.
 */
export function parseEditorHtml(html: string): RichTextDoc {
  if (typeof document === "undefined") return { nodes: [] };
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes: RichTextNode[] = [];

  const readBlock = (el: Element): void => {
    const tag = el.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3") {
      const text = (el.textContent ?? "").trim();
      if (text) nodes.push({ type: "heading", level: tag === "h2" ? 2 : 3, text });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const items: RichTextSpan[][] = [];
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== "li") continue;
        const spans: RichTextSpan[] = [];
        parseInline(li, [], undefined, spans);
        items.push(spans);
      }
      if (items.length > 0) nodes.push({ type: tag === "ul" ? "bulletList" : "orderedList", items });
      return;
    }
    const spans: RichTextSpan[] = [];
    parseInline(el, [], undefined, spans);
    if (spans.some((span) => span.text.trim().length > 0)) nodes.push({ type: "paragraph", spans });
  };

  for (const child of Array.from(template.content.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").trim();
      if (text) nodes.push({ type: "paragraph", spans: [{ text }] });
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) readBlock(child as Element);
  }
  return { nodes };
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="rte-btn"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  label = "Description",
  hint,
}: {
  value: RichTextDoc | null;
  onChange: (doc: RichTextDoc) => void;
  label?: string;
  hint?: string;
}) {
  const [initialHtml] = useState(() => richTextToHtml(value));
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastValue = useRef<RichTextDoc | null>(value ?? null);

  // Reseed only when the value changed OUTSIDE the editor (a loaded record or a
  // save response); typing sets `lastValue` itself, so the caret is never yanked.
  useEffect(() => {
    if (!hostRef.current) return;
    if (lastValue.current === value) return;
    hostRef.current.innerHTML = richTextToHtml(value);
    lastValue.current = value ?? null;
  }, [value]);

  function sync() {
    if (!hostRef.current) return;
    const parsed = parseEditorHtml(hostRef.current.innerHTML);
    lastValue.current = parsed;
    onChange(parsed);
  }

  function exec(command: string, argument?: string) {
    if (typeof document === "undefined" || typeof document.execCommand !== "function") return;
    document.execCommand(command, false, argument);
    sync();
  }

  function addLink() {
    if (typeof window === "undefined") return;
    const url = window.prompt("Link address (https://, /, mailto: or tel:)");
    if (url && HREF_PATTERN.test(url.trim())) exec("createLink", url.trim());
  }

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label={`${label} formatting`}>
        <ToolButton label="Bold" onClick={() => exec("bold")}>
          <strong>B</strong>
        </ToolButton>
        <ToolButton label="Italic" onClick={() => exec("italic")}>
          <em>I</em>
        </ToolButton>
        <ToolButton label="Heading 2" onClick={() => exec("formatBlock", "h2")}>
          H2
        </ToolButton>
        <ToolButton label="Heading 3" onClick={() => exec("formatBlock", "h3")}>
          H3
        </ToolButton>
        <ToolButton label="Paragraph" onClick={() => exec("formatBlock", "p")}>
          ¶
        </ToolButton>
        <ToolButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          • List
        </ToolButton>
        <ToolButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          1. List
        </ToolButton>
        <ToolButton label="Add link" onClick={addLink}>
          Link
        </ToolButton>
      </div>
      <div
        ref={hostRef}
        className="rte__host"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder="Write the description…"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={sync}
        onBlur={sync}
      />
      <p className="rte__hint">
        {hint ?? "Bold, italic, headings, lists and links only — the page prints these as real text, never HTML."}{" "}
        Up to {CONTENT_RICHTEXT_NODES_MAX} blocks.
      </p>
    </div>
  );
}
