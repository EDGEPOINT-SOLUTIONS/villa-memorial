"use client";

import { useState } from "react";
import { StatusChip } from "@/components/kit/status-chip";
import { PapersDialog } from "@/components/family/papers-dialog";
import type { FamilyPaperPopupItem } from "@/lib/family/family-documents";

/**
 * The dashboard's Papers box — a compact table plus the popup it opens.
 *
 * The box lists the first five papers (Paper · Type · Date · State) with a
 * “Read” action per row that opens the popup at that paper; the whole box opens
 * it from the foot. It is a client component only because the popup is
 * interactive; the rows and their states are computed on the server and passed
 * in, so no data is fetched in the browser.
 */
export function PapersTable({ items }: { items: FamilyPaperPopupItem[] }) {
  const [open, setOpen] = useState(false);
  const [initialKey, setInitialKey] = useState<string | undefined>(undefined);

  return (
    <>
      {items.length === 0 ? (
        <p className="dash-empty">
          No papers have been issued yet. Call us and we will get you what you need.
        </p>
      ) : (
        <table className="table dash-table">
          <caption className="visually-hidden">Your papers</caption>
          <thead>
            <tr>
              <th scope="col">Paper</th>
              <th scope="col">Type</th>
              <th scope="col">Date</th>
              <th scope="col">State</th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 5).map((item) => (
              <tr key={item.key}>
                <th scope="row">{item.title}</th>
                <td data-label="Type">{item.typeLabel}</td>
                <td data-label="Date">{item.dateLabel}</td>
                <td data-label="State">
                  <StatusChip tone={item.tone}>{item.statusLabel}</StatusChip>
                </td>
                <td className="dash-table__action" data-label="Open">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setInitialKey(item.key);
                      setOpen(true);
                    }}
                  >
                    Read
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        className="btn btn--secondary btn--sm dash-panel__open"
        onClick={() => {
          setInitialKey(undefined);
          setOpen(true);
        }}
      >
        Open your papers
      </button>

      <PapersDialog
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        initialKey={initialKey}
      />
    </>
  );
}
