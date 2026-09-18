"use client";

/**
 * TaskChecklist — the ops board's task rows, with the ONE write the board was missing:
 * a task's status. Owner: `app/(staff)/staff/cases/[id]/page.tsx`.
 *
 * Plain and quick on purpose (staff work this screen under time pressure): one native
 * <select> per row — keyboard-operable, and the phone's own picker on touch — no dialog,
 * no save button. The status set is the frozen contract's (`pending` · `in_progress` ·
 * `done`); the row that is mid-write disables just its own control.
 *
 * Honesty: a change is shown while it is in flight, and a REFUSED change is reverted to
 * what the server actually holds, with the server's own message above the table (never a
 * green tick for a write that did not happen). Every outcome re-reads the case through
 * `router.refresh()`, so the screen ends on server truth rather than on our guess.
 *
 * A task with no id (an upstream payload that omits the contract's additive
 * `tasks[].id`) cannot be addressed by the write endpoint at all, so its row keeps the
 * status badge and says why instead of offering a control that could only fail.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client/api-error";
import type { Case } from "@/lib/api-client/operations";
import { setTaskStatus } from "@/lib/operations/board-api";
import {
  CASE_TASK_STATUSES,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  type CaseTask,
  type CaseTaskStatus,
} from "@/lib/operations/case-board";

export function TaskChecklist({ kase, canWrite }: { kase: Case; canWrite: boolean }) {
  const router = useRouter();
  const selectId = useId();
  const [overrides, setOverrides] = useState<Record<string, CaseTaskStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // A render that came from the server is the authority again: drop every local guess,
  // so a change this screen never made (or one that was refused elsewhere) shows up.
  useEffect(() => {
    setOverrides({});
  }, [kase]);

  const settingsOf = (task: CaseTask) => overrides[task.id] ?? task.status;
  const done = kase.tasks.filter((task) => settingsOf(task) === "done").length;
  const readOnlyTask = kase.tasks.some((task) => task.id === "");

  async function setStatus(task: CaseTask, status: CaseTaskStatus) {
    setError(null);
    setNotice(null);
    setOverrides((prev) => ({ ...prev, [task.id]: status }));
    setSavingId(task.id);
    const revert = () =>
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    try {
      await setTaskStatus(kase.case_number, task.id, status);
      setNotice(`${task.title} — ${TASK_STATUS_LABEL[status].toLowerCase()}.`);
      router.refresh();
    } catch (err) {
      // Refused, not applied: the row goes back to what the server holds and the
      // server's own words explain why. A failure is never shown as a success.
      setError(err instanceof ApiError ? err.message : "The task was not changed.");
      revert();
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card header={<h3>Tasks ({done}/{kase.tasks.length} done)</h3>}>
      {error ? (
        <Alert tone="danger" title="The task was not changed">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      {kase.tasks.length === 0 ? (
        <p className="text-sm text-muted">No tasks recorded.</p>
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table ops-tasks">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {kase.tasks.map((task, idx) => {
                const status = settingsOf(task);
                const editable = canWrite && task.id !== "";
                return (
                  <tr key={task.id || `${idx}-${task.title}`}>
                    <th scope="row" className="ops-task__name">
                      {task.title}
                    </th>
                    <td>
                      {editable ? (
                        <select
                          id={`${selectId}-${idx}`}
                          className="ops-task__select"
                          value={status}
                          disabled={savingId === task.id}
                          aria-label={`${task.title} — status`}
                          onChange={(event) =>
                            void setStatus(task, event.target.value as CaseTaskStatus)
                          }
                        >
                          {CASE_TASK_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {TASK_STATUS_LABEL[value]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={TASK_STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Badge>
                      )}
                      {savingId === task.id ? (
                        <span className="ops-task__saving" role="status">
                          Saving…
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canWrite ? null : (
        <p className="text-sm text-muted ops-task__reason">
          Changing a task needs <code>cases:write</code>.
        </p>
      )}
      {canWrite && readOnlyTask ? (
        <p className="text-sm text-muted ops-task__reason">
          A task without an id cannot be addressed by the service, so its row stays read-only.
        </p>
      ) : null}
    </Card>
  );
}
