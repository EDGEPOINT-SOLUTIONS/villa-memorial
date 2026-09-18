"use client";

/**
 * The Operations board's lanes and its two writes — the browser side of `/staff/ops`.
 *
 * The two writes are the case screen's own (`lib/operations/board-api.ts` — the same
 * BFF routes, the same `case-events-v1` endpoints). Nothing here re-implements a
 * rule: a task tick and a confirmed stage move post, then the screen re-reads what the
 * server holds. A refused write shows the server's own words and changes nothing on
 * screen — never an optimistic success. The confirmation for a stage move is a real
 * modal (one, board-level, using the shared focus contract).
 *
 * The lanes arrive pre-built from `lib/operations/ops-board.ts` (server page): the wait
 * ages, the recorded flags and the lane order are the model's, not this view's.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { ApiError } from "@/lib/api-client/api-error";
import { moveCaseStage, setTaskStatus } from "@/lib/operations/board-api";
import {
  CASE_STAGES,
  STAGE_LABEL,
  STAGE_TONE,
  isCaseStage,
  nextStage,
  stageIndex,
  type CaseStage,
} from "@/lib/operations/case-board";
import type { OpsCard, OpsLane, OpsTaskRef } from "@/lib/operations/ops-board";

function OpsCardView({
  card,
  canWrite,
  savingTaskId,
  onCompleteTask,
  onRequestMove,
}: {
  card: OpsCard;
  canWrite: boolean;
  savingTaskId: string | null;
  onCompleteTask: (card: OpsCard, task: OpsTaskRef) => void;
  onRequestMove: (card: OpsCard, target: CaseStage) => void;
}) {
  const targets = CASE_STAGES.filter((stage) => stage !== card.stage);
  const defaultTarget = nextStage(card.stage) ?? CASE_STAGES[0];
  const [chosen, setChosen] = useState<CaseStage>(defaultTarget);
  const target = targets.includes(chosen) ? chosen : defaultTarget;
  const caseHref = `/staff/cases/${card.id}`;

  return (
    <li className={`ops-card${card.accent ? ` ops-card--${card.accent}` : ""}`}>
      <div className="ops-card__top">
        <Link href={caseHref} className="ops-card__ref">
          {card.caseNumber}
        </Link>
        <span className="ops-card__wait" title="Days since the last recorded change">
          {card.waitingLabel}
        </span>
      </div>

      <h3 className="ops-card__name">
        <Link href={caseHref}>{card.name}</Link>
      </h3>

      <div className="ops-card__badges">
        <Badge tone={STAGE_TONE[card.stage]}>{card.stageLabel}</Badge>
        {card.oldestInLane ? <span className="ops-card__oldest">Oldest in stage</span> : null}
        {card.flags.map((flag) => (
          <Badge key={flag.kind} tone={flag.tone}>
            {flag.label}
          </Badge>
        ))}
      </div>

      <p className="ops-card__family">
        {card.family ?? "Family not recorded"} · {card.coordinator}
      </p>

      <p className="ops-card__tasks">
        {card.tasksTotal === 0
          ? "No tasks recorded"
          : `${card.tasksDone}/${card.tasksTotal} tasks done`}
      </p>

      {card.openTasks.length > 0 ? (
        <ul className="ops-card__open">
          {card.openTasks.map((task, index) => (
            <li key={task.id || `${index}-${task.title}`}>
              {canWrite && task.id ? (
                <button
                  type="button"
                  className="ops-card__tick"
                  data-status={task.status}
                  disabled={savingTaskId === task.id}
                  onClick={() => onCompleteTask(card, task)}
                  aria-label={`Mark ${task.title} done`}
                >
                  <span className="ops-card__tick-box" aria-hidden="true" />
                  <span className="ops-card__tick-title">{task.title}</span>
                </button>
              ) : (
                <span className="ops-card__task" data-status={task.status}>
                  <span className="ops-card__task-dot" aria-hidden="true" />
                  {task.title}
                </span>
              )}
              {savingTaskId === task.id ? (
                <span className="ops-card__saving" role="status">
                  Saving…
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canWrite ? (
        <form
          className="ops-card__move"
          onSubmit={(event) => {
            event.preventDefault();
            onRequestMove(card, target);
          }}
        >
          <select
            className="ops-card__select"
            value={target}
            aria-label={`Move ${card.caseNumber} to another stage`}
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
          <button type="submit" className="btn btn--secondary btn--sm">
            Move
          </button>
        </form>
      ) : null}
    </li>
  );
}

export function OpsBoardView({
  lanes,
  canWrite,
}: {
  lanes: OpsLane[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ card: OpsCard; target: CaseStage } | null>(
    null,
  );
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  function closeMove() {
    if (moving) return;
    setPendingMove(null);
    setMoveError(null);
  }

  const { panelRef } = useModalFocus(Boolean(pendingMove), closeMove);

  async function completeTask(card: OpsCard, task: OpsTaskRef) {
    setTaskError(null);
    setNotice(null);
    setSavingTaskId(task.id);
    try {
      await setTaskStatus(card.caseNumber, task.id, "done");
      setNotice(`${task.title} — done.`);
      router.refresh();
    } catch (err) {
      // Refused, not applied: the card is re-read and the server's own words explain
      // why. A failure is never shown as a success.
      setTaskError(err instanceof ApiError ? err.message : "The task was not changed.");
      router.refresh();
    } finally {
      setSavingTaskId(null);
    }
  }

  async function confirmMove() {
    if (!pendingMove) return;
    setMoveError(null);
    setMoving(true);
    try {
      await moveCaseStage(pendingMove.card.caseNumber, pendingMove.target);
      setNotice(
        `${pendingMove.card.caseNumber} moved to ${STAGE_LABEL[pendingMove.target]}.`,
      );
      setPendingMove(null);
      router.refresh();
    } catch (err) {
      // The dialog stays open on the server's own reason, and the board is re-read:
      // the screen never claims a move the service did not accept.
      setMoveError(err instanceof ApiError ? err.message : "The stage was not changed.");
      router.refresh();
    } finally {
      setMoving(false);
    }
  }

  const backward =
    pendingMove !== null && stageIndex(pendingMove.target) < stageIndex(pendingMove.card.stage);

  return (
    <div className="ops-board-view">
      {taskError ? (
        <Alert tone="danger" title="The task was not changed">
          {taskError}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      <div
        className="ops-board"
        role="region"
        tabIndex={0}
        aria-label="Cases by stage"
      >
        {lanes.map((lane) => (
          <section key={lane.stage} className="ops-lane" data-stage={lane.stage}>
            <header className="ops-lane__head">
              <h2 className="ops-lane__title">{lane.label}</h2>
              <span className="ops-lane__count">{lane.cards.length}</span>
              {lane.oldestDays !== null ? (
                <span className="ops-lane__oldest">oldest {lane.oldestDays}d</span>
              ) : null}
            </header>
            {lane.cards.length === 0 ? (
              <p className="ops-lane__empty">No cases</p>
            ) : (
              <ol className="ops-lane__list">
                {lane.cards.map((card) => (
                  <OpsCardView
                    key={card.id}
                    card={card}
                    canWrite={canWrite}
                    savingTaskId={savingTaskId}
                    onCompleteTask={completeTask}
                    onRequestMove={(moved, target) => {
                      setMoveError(null);
                      setPendingMove({ card: moved, target });
                    }}
                  />
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      {pendingMove ? (
        <div className="ops-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="ops-modal__backdrop" onClick={closeMove} />
          <div className="ops-modal__panel" ref={panelRef} tabIndex={-1}>
            <header className="ops-modal__head">
              <div>
                <p className="ops-modal__eyebrow">Stage move</p>
                <h2 id={titleId}>
                  Move {pendingMove.card.caseNumber} {backward ? "back " : ""}to{" "}
                  {STAGE_LABEL[pendingMove.target]}?
                </h2>
              </div>
              <button
                type="button"
                className="quick-menu__close"
                aria-label="Close"
                onClick={closeMove}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="ops-modal__body">
              <p className="ops-modal__copy">
                {backward
                  ? `This records the move back to ${STAGE_LABEL[pendingMove.target]} and adds any of its tasks the case does not have.`
                  : `This records the move and adds the ${STAGE_LABEL[pendingMove.target]} tasks to the case.`}
              </p>
              {moveError ? (
                <Alert tone="danger" title="The stage was not changed">
                  {moveError}
                </Alert>
              ) : null}
              <div className="ops-modal__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={moving}
                  onClick={closeMove}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={moving}
                  onClick={() => void confirmMove()}
                >
                  {moving ? "Moving…" : "Confirm move"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
