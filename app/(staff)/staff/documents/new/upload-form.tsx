"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Document, DocumentType } from "@/lib/api-client/documents";

const TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: "contract", label: "Contract" },
  { value: "receipt", label: "Receipt" },
  { value: "certificate", label: "Certificate" },
  { value: "permit", label: "Permit" },
  { value: "authorization", label: "Authorization" },
  { value: "other", label: "Other" },
];

/**
 * Files a document's metadata against the repository. There is no object store in
 * v1, so no file body is sent or kept — the row is real, the artifact is the gap the
 * page names. The office can still point the row at the case or order it belongs to.
 */
export function DocumentUploadForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    document_type: "contract" as DocumentType,
    related_case_number: "",
    related_order_number: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          document_type: form.document_type,
          related_case_number: form.related_case_number || null,
          related_order_number: form.related_order_number || null,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      if (!response.ok || typeof body.id !== "string") {
        setError(
          typeof body.error === "string" ? body.error : "The document could not be filed.",
        );
        return;
      }
      const document = body as unknown as Document;
      router.push(`/staff/documents/${document.id}`);
      router.refresh();
    } catch {
      setError("The document could not be filed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack-4" noValidate>
      {error ? (
        <Alert tone="danger" title="Could not file the document">
          {error}
        </Alert>
      ) : null}

      <div className="field-grid field-grid--2">
        <Field label="Title" htmlFor="doc-title" hint="What the paper is, in the office's words.">
          <input
            id="doc-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Type" htmlFor="doc-type">
          <select
            id="doc-type"
            value={form.document_type}
            onChange={(e) =>
              setForm({ ...form, document_type: e.target.value as DocumentType })
            }
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="field-grid field-grid--2">
        <Field label="Case number" htmlFor="doc-case" hint="Optional — the case it belongs to.">
          <input
            id="doc-case"
            placeholder="CASE-2026-0001"
            value={form.related_case_number}
            onChange={(e) => setForm({ ...form, related_case_number: e.target.value })}
          />
        </Field>
        <Field label="Order number" htmlFor="doc-order" hint="Optional — the order it belongs to.">
          <input
            id="doc-order"
            placeholder="ORD-2026-00001"
            value={form.related_order_number}
            onChange={(e) => setForm({ ...form, related_order_number: e.target.value })}
          />
        </Field>
      </div>

      <div className="capture-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Filing…" : "File the document"}
        </Button>
      </div>
    </form>
  );
}
