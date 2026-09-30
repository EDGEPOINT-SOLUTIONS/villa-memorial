"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { StatusChip } from "@/components/kit/status-chip";
import { EmptyState } from "@/components/kit/empty-state";
import type { FamilyPaperPopupItem } from "@/lib/family/family-documents";

/**
 * The Papers popup — the family's documents, each readable in place.
 *
 * THE READING SURFACE IS HTML FIRST. Every owned paper that can be faithfully
 * rendered opens the SAME on-screen `PaperSheet` the counter prints (accessible,
 * always works, identical to the .docx/PDF), with **Open PDF / Download / Print**
 * beside it. The PDF is the family's own guarded route
 * (`/api/family/papers/receipt/<ref>`, `private, no-store`), never a public path;
 * on a phone, where an inline PDF frame is unreliable, the frame is hidden and
 * the Open/Download actions remain (the HTML sheet stays the readable copy). A
 * record with no copy keeps the honest state and a person to call.
 *
 * The popup uses the repo's one modal contract (`useModalFocus`): focus in, Tab
 * trapped, Escape closes, body scroll locked, focus returned to the opener.
 */
export function PapersDialog({
  open,
  onClose,
  items,
  initialKey,
}: {
  open: boolean;
  onClose: () => void;
  items: FamilyPaperPopupItem[];
  initialKey?: string;
}) {
  const { panelRef } = useModalFocus<HTMLDivElement>(open, onClose);
  const [activeKey, setActiveKey] = useState<string>(initialKey ?? items[0]?.key ?? "");
  const [view, setView] = useState<"sheet" | "pdf">("sheet");

  useEffect(() => {
    if (!open) return;
    setActiveKey(initialKey ?? items[0]?.key ?? "");
    setView("sheet");
  }, [open, initialKey, items]);

  if (!open) return null;
  const active = items.find((item) => item.key === activeKey) ?? items[0] ?? null;

  return (
    <div
      className="papers-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Your papers"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="papers-dialog__bar">
        <div className="papers-dialog__heading">
          <h2 className="papers-dialog__title">Your papers</h2>
          <p className="papers-dialog__sub">
            Every paper your family holds, and what we still owe you.
          </p>
        </div>
        <button
          type="button"
          className="papers-dialog__close"
          aria-label="Close your papers"
          onClick={onClose}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No papers yet"
          hint="Nothing has been issued. Call us if you need a paper today and we will help."
          action={
            <a className="btn btn--secondary" href="tel:+639176178489">
              Call 0917 617 8489
            </a>
          }
        />
      ) : (
        <div className="papers-dialog__body">
          <ul className="papers-list" role="list">
            {items.map((item) => {
              const isActive = item.key === active?.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`papers-list__row${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => {
                      setActiveKey(item.key);
                      setView("sheet");
                    }}
                  >
                    <span className="papers-list__title">{item.title}</span>
                    <span className="papers-list__meta">
                      {item.typeLabel} · {item.dateLabel}
                    </span>
                    <StatusChip tone={item.tone}>{item.statusLabel}</StatusChip>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="papers-reader">
            {active?.paper ? (
              <>
                <div className="papers-reader__actions">
                  <div className="papers-reader__tabs" role="tablist" aria-label="How to read this paper">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === "sheet"}
                      className={`papers-reader__tab${view === "sheet" ? " is-active" : ""}`}
                      onClick={() => setView("sheet")}
                    >
                      <FileText size={15} aria-hidden="true" /> On screen
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === "pdf"}
                      className={`papers-reader__tab${view === "pdf" ? " is-active" : ""}`}
                      onClick={() => setView("pdf")}
                    >
                      PDF
                    </button>
                  </div>
                  <div className="papers-reader__buttons">
                    <a
                      className="btn btn--secondary btn--sm"
                      href={active.paper.pdfHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open PDF
                    </a>
                    <a
                      className="btn btn--secondary btn--sm"
                      href={`${active.paper.pdfHref}?disposition=attachment`}
                      download={`${active.paper.filename}.pdf`}
                    >
                      <Download size={15} aria-hidden="true" /> Download
                    </a>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => window.print()}
                    >
                      <Printer size={15} aria-hidden="true" /> Print
                    </button>
                  </div>
                </div>
                {view === "sheet" ? (
                  <div className="papers-reader__sheet">
                    <PaperSheet blocks={active.paper.blocks} profile={active.paper.profile} />
                  </div>
                ) : (
                  <div className="papers-reader__pdf">
                    <iframe
                      className="papers-reader__frame"
                      title={`${active.title} — PDF`}
                      src={active.paper.pdfHref}
                    />
                    <p className="papers-reader__fallback">
                      On a phone the PDF opens in your own file viewer.{" "}
                      <a href={active.paper.pdfHref} target="_blank" rel="noreferrer">
                        Open the PDF
                      </a>{" "}
                      or{" "}
                      <a
                        href={`${active.paper.pdfHref}?disposition=attachment`}
                        download={`${active.paper.filename}.pdf`}
                      >
                        download it
                      </a>
                      .
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="papers-reader__empty">
                <p className="papers-reader__state">
                  {active?.stateNote ?? "This paper is not ready to open here yet."}
                </p>
                {active?.requestHref ? (
                  <a className="btn btn--secondary" href={active.requestHref}>
                    {active.requestLabel ?? "Call us"}
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
