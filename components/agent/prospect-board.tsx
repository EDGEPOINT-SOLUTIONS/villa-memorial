"use client";

/**
 * The prospect board — the wide-screen placement mode of `/agent/prospects`.
 *
 * THE CAPTAIN'S ASK (2026-10-02): "i want that kaban board mode for the prospects
 * for easy placements of stages per prospects if they are qualified, contacted,
 * ready to close etc". The workbench list stays the default; this is the mode
 * beside it. One column per PRD stage (`lib/agent/agent-view.ts`,
 * `PIPELINE_STAGES`) — no second vocabulary, no hidden empty column.
 *
 * PLACEMENT IS THE EXISTING WRITE, NOT A NEW ONE. A move does not write from
 * here: it asks for the note the record promises every move, then POSTs
 * `/api/agent/prospects/:id/stage` — the SAME route and store the lead record's
 * step-by-step acquisition uses. The server's refusal (backward move, missing
 * note, someone else's lead) is shown verbatim and changes nothing.
 *
 * KEYBOARD FIRST. Drag-and-drop is an enhancement, never the only way: every card
 * carries a Move button that opens the same dialog, so a keyboard (or a touch)
 * can place a card. `useModalFocus` owns the focus in/Tab trap/Escape/scroll lock,
 * the drop targets and ghost state are declared for pointer users, and every
 * control answers on `:focus-visible` through the global ring — a refused move
 * explains itself and leaves the board exactly as it was.
 *
 * EVERY MOVE CARRIES A NOTE. The dialog asks "What happened?" before it writes,
 * because `lib/agent/stage-move.ts` refuses a note-less move; the UI never hides
 * that rule with a silent drop.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ApiError } from "@/lib/api-client/api-error";
import type { Prospect } from "@/lib/api-client/agent";
import { money, StageChip } from "@/components/agent/agent-ui";
import { StatusChip } from "@/components/kit";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { boardColumns, canMoveTo, moveTargets } from "@/lib/agent/prospect-board";
import { nextStage, prospectUrgency, stageMeta } from "@/lib/agent/agent-view";

type DragState = { id: string; stage: string } | null;
type MoveState = { prospect: Prospect; stage: string } | null;

/**
 * The one move dialog. `stage` is the target a drop (or the card's Move button)
 * pre-selected; the select still offers every forward stage, so the move is the
 * agent's choice, not the drop's guess.
 */
export function ProspectMoveDialog({
  prospect,
  stage,
  onClose,
}: {
  prospect: Prospect;
  stage: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const selectId = useId();
  const noteId = useId();
  const targets = moveTargets(prospect.stage);
  const [target, setTarget] = useState(stage);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { panelRef } = useModalFocus<HTMLDivElement>(true, onClose);

  const chosen = targets.find((t) => t.stage === target);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/agent/prospects/${prospect.id}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: target, note }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(body?.error ?? "The move was not recorded.", response.status);
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The move was not recorded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="pb-modal"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="pb-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <h2 className="pb-modal__title" id={titleId}>
          Move {prospect.name}
        </h2>
        <p className="pb-modal__sub">
          From {stageMeta(prospect.stage).label}. Every move is recorded with your name, the day and
          this note.
        </p>
        <form className="pb-move" onSubmit={submit}>
          <label className="ag-field__label" htmlFor={selectId}>
            Move to
          </label>
          <select
            id={selectId}
            className="pb-move__select"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            disabled={pending}
          >
            {targets.map((t) => (
              <option key={t.stage} value={t.stage}>
                {t.label}
              </option>
            ))}
          </select>

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
            required
            placeholder="e.g. Spoke about the options; sending the sheet today."
            disabled={pending}
          />

          {error ? (
            <p className="ag-move__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ag-move__actions">
            <button className="btn btn--primary" type="submit" disabled={pending}>
              {pending ? "Recording…" : `Move to ${chosen?.label ?? stageMeta(target).label}`}
            </button>
            <button className="btn btn--secondary" type="button" onClick={onClose} disabled={pending}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * One card: the same lead facts the list row shows (name · need · value · the next
 * action or state), plus the keyboard Move control. It is draggable on a wide
 * screen, but every fact and the move are reachable without a pointer.
 */
function ProspectCard({
  prospect,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  prospect: Prospect;
  dragging: boolean;
  onMove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const urgency = prospectUrgency(prospect);
  const targets = moveTargets(prospect.stage);
  const tel = `tel:${prospect.phone.replace(/\s/g, "")}`;

  return (
    <article
      className="pb-card"
      data-stage={prospect.stage}
      data-dragging={dragging ? "yes" : "no"}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", prospect.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="pb-card__top">
        <Link className="pb-card__name" href={`/agent/prospects/${prospect.id}`}>
          {prospect.name}
        </Link>
        <StageChip stage={prospect.stage} />
      </div>
      <p className="pb-card__want">{prospect.want}</p>
      <p className="pb-card__value">{money(prospect.possible_value_cents)}</p>
      <p className="pb-card__next">{prospect.next_action}</p>
      <p className="pb-card__state">
        <StatusChip tone={urgency.tone}>{urgency.label}</StatusChip>
      </p>
      <div className="pb-card__actions">
        <a className="btn btn--primary btn--sm" href={tel}>
          Call
        </a>
        <Link className="btn btn--ghost btn--sm" href={`/agent/prospects/${prospect.id}`}>
          Open
        </Link>
        {targets.length > 0 ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm pb-card__move"
            onClick={onMove}
            aria-label={`Move ${prospect.name} to another stage`}
          >
            Move
          </button>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The board itself. `prospects` is the page's already-filtered set, so the filter
 * chips keep working in board mode; the order inside a column is the caller's.
 */
export function ProspectBoard({ prospects }: { prospects: Prospect[] }) {
  const [dragging, setDragging] = useState<DragState>(null);
  const [over, setOver] = useState<string | null>(null);
  const [move, setMove] = useState<MoveState>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const columns = boardColumns(prospects);

  function handleDrop(event: React.DragEvent<HTMLDivElement>, stage: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragging?.id;
    setOver(null);
    setDragging(null);
    if (!id) return;
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect) return;
    if (prospect.stage === stage) return;
    if (!canMoveTo(prospect.stage, stage)) {
      setRefusal(
        `Only forward moves: ${prospect.name} is at ${stageMeta(prospect.stage).label}, so they cannot go back to ${stageMeta(stage).label}.`,
      );
      return;
    }
    setRefusal(null);
    setMove({ prospect, stage });
  }

  return (
    <div className="pb-board">
      <h2 className="visually-hidden">Pipeline board</h2>
      {refusal ? (
        <p className="pb-refusal" role="alert">
          {refusal}
        </p>
      ) : null}
      <div className="pb-columns" role="region" aria-label="Pipeline stages" tabIndex={0}>
        {columns.map((column) => (
          <section className="pb-column" key={column.stage} aria-label={`${column.label} (${column.count})`}>
            <header className="pb-column__head">
              <h3 className="pb-column__title">{column.label}</h3>
              <span className="pb-column__count">{column.count}</span>
            </header>
            <div
              className="pb-column__body"
              data-over={over === column.stage ? "yes" : "no"}
              data-valid={
                dragging && canMoveTo(dragging.stage, column.stage) && dragging.stage !== column.stage
                  ? "yes"
                  : "no"
              }
              onDragOver={(event) => {
                if (!dragging) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = canMoveTo(dragging.stage, column.stage) ? "move" : "none";
                setOver(column.stage);
              }}
              onDragLeave={() => setOver((current) => (current === column.stage ? null : current))}
              onDrop={(event) => handleDrop(event, column.stage)}
            >
              {column.prospects.length === 0 ? (
                <p className="pb-column__empty">No one here yet.</p>
              ) : (
                column.prospects.map((prospect) => (
                  <ProspectCard
                    key={prospect.id}
                    prospect={prospect}
                    dragging={dragging?.id === prospect.id}
                    onMove={() =>
                      setMove({ prospect, stage: nextStage(prospect.stage) ?? prospect.stage })
                    }
                    onDragStart={() => {
                      setDragging({ id: prospect.id, stage: prospect.stage });
                      setRefusal(null);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
      {move ? (
        <ProspectMoveDialog prospect={move.prospect} stage={move.stage} onClose={() => setMove(null)} />
      ) : null}
    </div>
  );
}
