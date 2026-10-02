"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import type { Inquiry } from "@/lib/api-client/crm";
import { formatMinorUnits } from "@/lib/money";
import { InquiryCaptureForm, SOURCE_LABELS } from "./inquiry-capture";

type Tone = "info" | "warning" | "success" | "neutral";

/**
 * The office's enquiry workspace.
 *
 * 2026-09-27 — WHAT CHANGED AND WHY. This board used to merge, after hydration,
 * whatever the public forms had written into THIS BROWSER's localStorage. Two things
 * were wrong with that and both cost the office a customer:
 *   · a website enquiry from any other device never appeared here at all, and
 *   · the board's columns never rendered `message`, so the preferred date and the
 *     additional requirements a family typed were captured and then invisible.
 * Rows now arrive as `initialInquiries` from the server, which folds the durable
 * journal (`lib/api-client/inquiry-store.ts`) that `POST /api/inquiries` writes — and
 * the request's own words are rendered under its topic, where a coordinator reads them.
 *
 * 2026-10-02 — the capture form is now ONE component (`./inquiry-capture.tsx`) shared
 * with the dedicated `/staff/inquiries/new` page, so the two cannot say different
 * things. `Send to case` carries a finished enquiry into a case (the same route the
 * dedicated page uses); once carried, the row links to the case instead of a button.
 */
export function InquiryBoard({
  initialInquiries,
  statusTone,
  canCapture,
  linkedCases = {},
}: {
  initialInquiries: Inquiry[];
  statusTone: Record<string, Tone>;
  canCapture: boolean;
  /** Enquiry reference → the case it was carried into, when one exists. */
  linkedCases?: Record<string, string>;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [capturedCount, setCapturedCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [links, setLinks] = useState<Record<string, string>>(linkedCases);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter((i) =>
      [i.reference, i.person.full_name, i.person.phone, i.topic, i.message]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [inquiries, filter]);

  async function sendToCase(inquiry: Inquiry) {
    setCaseError(null);
    setSendingId(inquiry.id);
    try {
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(inquiry.id)}/to-case`,
        { method: "POST" },
      );
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      if (!response.ok || typeof body.id !== "string") {
        setCaseError(
          typeof body.error === "string" ? body.error : "The case could not be opened.",
        );
        return;
      }
      setLinks((prev) => ({ ...prev, [inquiry.reference]: body.id as string }));
      // Re-read the server so the "Sent to case" figure and the row's link agree.
      router.refresh();
    } catch {
      setCaseError("The case could not be opened — check your connection and try again.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="stack-4">
      {caseError ? (
        <Alert tone="danger" title="Could not open the case">
          {caseError}
        </Alert>
      ) : null}
      {capturedCount > 0 ? (
        <Alert tone="success" title="Inquiry recorded.">
          The enquiry is saved in the office&rsquo;s register and appears in the list
          below. Website requests arrive here the same way.
        </Alert>
      ) : null}

      <div className="row row--wrap">
        <input
          className="input"
          style={{ maxWidth: "22rem" }}
          type="search"
          placeholder="Filter by reference, name, topic…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter inquiries"
        />
        {canCapture ? (
          <Button onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen}>
            {formOpen ? "Close quick capture" : "Log an inquiry"}
          </Button>
        ) : null}
      </div>

      {canCapture && formOpen ? (
        <InquiryCaptureForm
          onCaptured={(inquiry) => {
            setInquiries((prev) => [inquiry, ...prev]);
            setCapturedCount((n) => n + 1);
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={filter ? "No inquiries match your filter" : "No inquiries logged yet"}
          hint={
            filter
              ? "Clear the filter to see all inquiries."
              : "Calls, walk-ins, and messages will appear here as front desk logs them."
          }
        />
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Person</th>
                <th scope="col">Topic</th>
                <th scope="col">Source</th>
                <th scope="col">Assigned</th>
                <th scope="col">Status</th>
                <th scope="col">Case</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td>
                    <code>{i.reference}</code>
                  </td>
                  <td>
                    <strong>{i.person.full_name}</strong>
                    <br />
                    <span className="text-sm text-muted">
                      {i.person.phone}
                      {i.person.email ? (
                        <>
                          <br />
                          {i.person.email}
                        </>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    {i.topic}
                    {i.lines && i.lines.length > 0 ? (
                      <ul className="inquiry-lines" aria-label="Structured quote lines">
                        {i.lines.map((line, index) => (
                          <li className="inquiry-line" key={`${line.sku}-${index}`}>
                            <span className="inquiry-line__head">
                              <strong>{line.name}</strong>
                              <code className="text-sm text-muted">{line.sku}</code>
                              {line.quantity > 1 ? (
                                <span className="text-sm text-muted">×{line.quantity}</span>
                              ) : null}
                            </span>
                            {line.pricingMode === "published" ? (
                              <span className="text-sm">
                                {line.unitPriceCents != null
                                  ? formatMinorUnits(line.unitPriceCents, line.currency ?? "PHP")
                                  : "published 2026 figure"}
                              </span>
                            ) : (
                              <Badge tone="warning">Needs pricing</Badge>
                            )}
                            {line.detail ? (
                              <span className="text-sm text-muted">{line.detail}</span>
                            ) : null}
                            {line.dateRange ? (
                              <span className="text-sm text-muted">{line.dateRange}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {i.message.trim() ? (
                      <p className="inquiry-board__message">{i.message}</p>
                    ) : null}
                  </td>
                  <td className="text-sm">
                    {SOURCE_LABELS.find((s) => s.value === i.source)?.label ?? i.source}
                  </td>
                  <td className="text-sm">{i.assigned_to}</td>
                  <td>
                    <Badge tone={statusTone[i.status] ?? "neutral"}>{i.status}</Badge>
                  </td>
                  <td className="text-sm">
                    {links[i.reference] ? (
                      <Link href={`/staff/cases/${links[i.reference]}`}>View case</Link>
                    ) : canCapture && (i.status === "converted" || i.status === "closed") ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={sendingId === i.id}
                        onClick={() => sendToCase(i)}
                      >
                        {sendingId === i.id ? "Opening…" : "Send to case"}
                      </Button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-sm">{new Date(i.received_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
