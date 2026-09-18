"use client";

/**
 * StageMove — the ops board's stage advance, with the confirmation a funeral case
 * deserves. Owner: `app/(staff)/staff/cases/[id]/page.tsx`.
 *
 * The settings are the frozen contract's, and the board invents no rule about which of
 * them are legal: forward moves to ANY later stage are allowed (stages can be skipped —
 * not every case has a viewing) and backward moves are allowed and audited, so the
 * select offers every stage but the one the case is already in and the dialog names the
 * target before anything is sent. funeral-cases stays the only authority on the move; a
 * refusal is shown verbatim and the screen re-reads what the server holds.
 *
 * The confirmation is a real modal: role/aria-modal/aria-labelledby, focus moves into
 * the panel on open and returns to the trigger on close, Escape closes, Tab is trapped,
 * and the backdrop is click-to-close.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client/api-error";
import type { Case } from "@/lib/api-client/operations";
import { moveCaseStage } from "@/lib/operations/board-api";
import {
  CASE_STAGES,
  STAGE_LABEL,
  isCaseStage,
  nextStage,
  stageIndex,
  type CaseStage,
} from "@/lib/operations/case-board";

export function StageMove({ kase, canWrite }: { kase: Case; canWrite: boolean }) {
  const router = useRouter();
  const titleId = useId();
  const selectId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const targets = CASE_STAGES.filter((stage) => stage !== kase.stage);
  const defaultTarget = nextStage(kase.stage) ?? CASE_STAGES[0];
  const [chosen, setChosen] = useState<CaseStage>(defaultTarget);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The stage the case is actually in decides what may be offered: after a move (or a
  // refresh that brought someone else's move) a stale choice falls back to the default
  // rather than rendering a target the case has already reached.
  const target = targets.includes(chosen) ? chosen : defaultTarget;
  const backward = stageIndex(target) < stageIndex(kase.stage);

  function closeConfirm() {
    setConfirming(false);
    setError(null);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!confirming) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setConfirming(false);
      setError(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusables = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  async function move() {
    setError(null);
    setPending(true);
    try {
      await moveCaseStage(kase.case_number, target);
      setNotice(`${kase.case_number} moved to ${STAGE_LABEL[target]}.`);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      // The dialog stays open on the server's own reason, and the case is re-read:
      // the screen never claims a move the service did not accept.
      setError(err instanceof ApiError ? err.message : "The stage was not changed.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card header={<h3>Stage progression</h3>}>
      <div className="row row--wrap">
        {CASE_STAGES.map((stage) => (
          <Badge
            key={stage}
            tone={
              stageIndex(stage) < stageIndex(kase.stage)
                ? "success"
                : stage === kase.stage
                  ? "info"
                  : "neutral"
            }
          >
            {stageIndex(stage) < stageIndex(kase.stage) ? "✓ " : ""}
            {STAGE_LABEL[stage]}
          </Badge>
        ))}
      </div>

      {notice ? (
        <div className="ops-move__result">
          <Alert tone="success" title={notice} />
        </div>
      ) : null}
      {error && !confirming ? (
        <div className="ops-move__result">
          <Alert tone="danger" title="The stage was not changed">
            {error}
          </Alert>
        </div>
      ) : null}

      {canWrite ? (
        <form
          className="ops-move"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice(null);
            setConfirming(true);
          }}
        >
          <label className="ops-move__label" htmlFor={selectId}>
            Move to
          </label>
          <select
            id={selectId}
            className="ops-move__select"
            value={target}
            disabled={pending}
            onChange={(event) => {
              const value = event.target.value;
              if (isCaseStage(value)) setChosen(value);
            }}
          >
            {targets.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABEL[stage]}
              </option>
            ))}
          </select>
          <button ref={triggerRef} type="submit" className="btn btn--primary btn--sm">
            Move case…
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted ops-move__reason">
          Moving a case needs <code>cases:write</code>.
        </p>
      )}

      {confirming ? (
        <div className="ops-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="ops-modal__backdrop" onClick={closeConfirm} />
          <div className="ops-modal__panel" ref={panelRef} tabIndex={-1} onKeyDown={trapFocus}>
            <header className="ops-modal__head">
              <div>
                <p className="ops-modal__eyebrow">Stage move</p>
                <h2 id={titleId}>
                  Move {kase.case_number} {backward ? "back " : ""}to {STAGE_LABEL[target]}?
                </h2>
              </div>
              <button
                type="button"
                className="quick-menu__close"
                aria-label="Close"
                onClick={closeConfirm}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="ops-modal__body">
              <p className="ops-modal__copy">
                {backward
                  ? `This records the move back to ${STAGE_LABEL[target]} and adds any of its tasks the case does not have.`
                  : `This records the move and adds the ${STAGE_LABEL[target]} tasks to the case.`}
              </p>
              {error ? (
                <Alert tone="danger" title="The stage was not changed">
                  {error}
                </Alert>
              ) : null}
              <div className="ops-modal__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={pending}
                  onClick={closeConfirm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={pending}
                  onClick={() => void move()}
                >
                  {pending ? "Moving…" : "Confirm move"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
