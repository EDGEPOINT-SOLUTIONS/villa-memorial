"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Generates Villa's Service Contract for this case and files it in the repository.
 *
 * The browser sends an intent, not content: the clause text, the parties and the priced
 * lines are assembled server-side in `/api/documents/generate` from records the session is
 * authorised to read. A legal artifact whose wording the client could set would be a
 * forgery surface.
 *
 * v1 prints; it does not sign. There is no e-signature pipeline and no PDF — the artifact
 * is HTML for the browser to print, and the signature rules are where the pen goes.
 */
export function GenerateContractForm({ caseId }: { caseId: string }) {
  const router = useRouter();
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
        body: JSON.stringify({ kind: "service_contract", case_id: caseId }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not generate the contract.";
        setError(message);
        return;
      }
      const doc = payload as { id: string; document_number: string };
      setGenerated(doc);
      router.refresh();
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
          Open the contract
        </a>{" "}
        to review and print it for signature.
      </Alert>
    );
  }

  return (
    <div className="stack">
      <p className="text-sm text-muted">
        Builds the contract from this case and its linked order, under the terms revision in
        force today. The intake header prints when staff have captured it; what no shape on
        the case record holds yet — the guarantee deductions, which belong to the dev-owned
        sub-ledger — is omitted rather than guessed.
      </p>
      {error ? <Alert tone="danger" title="Generation failed">{error}</Alert> : null}
      <div>
        <Button type="button" size="sm" onClick={generate} disabled={pending}>
          {pending ? "Generating…" : "Generate service contract"}
        </Button>
      </div>
    </div>
  );
}
