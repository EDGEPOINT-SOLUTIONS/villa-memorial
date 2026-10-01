"use client";

/**
 * MoveForwardForm — the lead record's step-by-step acquisition control.
 *
 * Owner: `app/(agent)/agent/prospects/[id]/page.tsx`. The page draws the steps and
 * the current step's purpose; this component is the one real action that moves the
 * person to the next step. It sends the target stage and the agent's note to
 * `POST /api/agent/prospects/:id/stage` (the demo-local journal) and re-reads the
 * record on success, so the stage, the history, the board, the clients and the
 * funnel all move together.
 *
 * It invents no rule: the target is the page's `nextStage` (the PRD line from
 * `lib/agent/agent-view.ts`) and the server's own refusal is shown verbatim. When
 * the person is Sold there is no next step and the form becomes the conversion
 * confirmation linking to the client the fold just produced.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ApiError } from "@/lib/api-client/api-error";

export function MoveForwardForm({
  prospectId,
  nextStage,
  nextLabel,
  action,
  clientId,
}: {
  prospectId: string;
  nextStage: string | null;
  nextLabel: string;
  action: string;
  clientId: string | null;
}) {
  const router = useRouter();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!nextStage) {
    return (
      <div className="ag-move ag-move--done">
        <p className="ag-move__done-title">Sold — this family is now a client.</p>
        <p className="ag-move__done-body">
          The sale became a client record — the dashboard, the pipeline and your book now read the
          same move.
        </p>
        <div className="ag-actions">
          {clientId ? (
            <Link className="btn btn--primary" href={`/agent/clients/${clientId}`}>
              Open the client record
            </Link>
          ) : null}
          <Link className="btn btn--secondary" href="/agent/clients">
            See your clients
          </Link>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const response = await fetch(`/api/agent/prospects/${prospectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage, note }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new ApiError(body?.error ?? "The move was not recorded.", response.status);
      }
      setNote("");
      setNotice(`Moved to ${nextLabel}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The move was not recorded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="ag-move" onSubmit={submit}>
      <label className="ag-field__label" htmlFor={noteId}>
        What happened
      </label>
      <p className="ag-field__hint">Kept with your name and the time.</p>
      <textarea
        id={noteId}
        className="ag-move__note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder="e.g. Spoke about the options; sending the sheet today."
        disabled={pending}
      />
      {error ? (
        <p className="ag-move__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="ag-move__notice" role="status">
          {notice}
        </p>
      ) : null}
      <div className="ag-move__actions">
        <button className="btn btn--primary ag-btn-xl" type="submit" disabled={pending}>
          {pending ? "Recording…" : action}
        </button>
        <span className="ag-move__target">Moves to {nextLabel}</span>
      </div>
    </form>
  );
}
