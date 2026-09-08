"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Generates Villa's Purchase Agreement for a reserved or sold lot.
 *
 * As with the service contract, the browser sends an intent and the BFF assembles the
 * document from the lot record: the terms revision, the clauses and the property block are
 * never client-supplied. Which revision applies depends on today's date — Villa's 2026
 * papers refuse a refund the 2025 ones granted.
 */
export function GenerateAgreementForm({
  lotId,
  lotNumber,
  buyerName,
  hasApplication = false,
}: {
  lotId: string;
  lotNumber: string;
  buyerName: string;
  /** Whether a purchase application with the buyer's real figures has been captured. */
  hasApplication?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [generated, setGenerated] = useState<{ id: string; document_number: string } | null>(
    null,
  );

  async function generate() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "lot_purchase", lot_id: lotId }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not generate the agreement.";
        setError(message);
        return;
      }
      setGenerated(payload as { id: string; document_number: string });
    } catch {
      setError("Could not reach the documents service.");
    } finally {
      setPending(false);
    }
  }

  if (generated) {
    return (
      <Alert tone="success" title={`${generated.document_number} generated`}>
        Filed in the document repository.{" "}
        <a href={`/api/documents/${generated.id}/render`} target="_blank" rel="noreferrer">
          Open the agreement
        </a>{" "}
        to review and print it for signature.
      </Alert>
    );
  }

  return (
    <div className="stack">
      <p className="text-sm text-muted">
        {hasApplication ? (
          <>
            Builds the purchase agreement for <strong>{buyerName}</strong> over {lotNumber}{" "}
            under the terms revision in force today, printing the buyer&rsquo;s and
            financing&rsquo;s values from the captured purchase application — the
            classification, MCF, VAT, the total contract price, the mode of payment and the
            amortisation term.
          </>
        ) : (
          <>
            Builds the purchase agreement for <strong>{buyerName}</strong> over {lotNumber},
            under the terms revision in force today. The Maintenance Care Fund, VAT, the
            total contract price, the amortisation term and the mode of payment print as
            unrecorded until a purchase application names them — capture one on this lot
            first.
          </>
        )}
      </p>
      {error ? (
        <Alert tone="danger" title="Generation failed">
          {error}
        </Alert>
      ) : null}
      <div>
        <Button type="button" size="sm" onClick={generate} disabled={pending}>
          {pending ? "Generating…" : "Generate purchase agreement"}
        </Button>
      </div>
    </div>
  );
}
