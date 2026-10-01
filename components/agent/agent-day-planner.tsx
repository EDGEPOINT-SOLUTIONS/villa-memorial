"use client";

/**
 * The agent's day-planner controls — the one write behind the day calendar.
 *
 * Owner: `components/agent/agent-calendar.tsx`, which renders a `PlanRow` for each
 * of the agent's plans in the selected day's detail and a `PlanComposer` under it.
 * Both talk to the demo planner route (`POST/PATCH/DELETE /api/agent/plans[/:id]`)
 * and re-read the page on success, so the grid marks, the day detail and the
 * sign-in notice all move together from the one journal.
 *
 * WHAT IT DOES NOT DO: it books nothing and promises nothing. A plan is the
 * agent's own note; the office's recorded appointments are read-only beside it.
 * The server's own refusal is shown verbatim, and the form sends only what the
 * pure reading in `lib/agent/agent-plans.ts` validates.
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client/api-error";
import {
  PLAN_NOTE_MAX,
  PLAN_TITLE_MAX,
  planTimeLabel,
  type AgentPlan,
} from "@/lib/agent/agent-plans";

async function send(url: string, method: string, body?: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(payload?.error ?? "The plan was not saved.", response.status);
  }
  return response.json().catch(() => null);
}

/** One planned item with its own edit · done · remove controls. */
export function PlanRow({ plan }: { plan: AgentPlan }) {
  const router = useRouter();
  const titleId = useId();
  const timeId = useId();
  const noteId = useId();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(plan.title);
  const [time, setTime] = useState(plan.time);
  const [note, setNote] = useState(plan.note);

  function openEdit() {
    setTitle(plan.title);
    setTime(plan.time);
    setNote(plan.note);
    setError(null);
    setEditing(true);
  }

  async function run(task: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await task();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The plan was not saved.");
    } finally {
      setPending(false);
    }
  }

  function toggleDone() {
    void run(() => send(`/api/agent/plans/${plan.id}`, "PATCH", { done: !plan.done }));
  }

  function remove() {
    void run(() => send(`/api/agent/plans/${plan.id}`, "DELETE"));
  }

  function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await send(`/api/agent/plans/${plan.id}`, "PATCH", { title, time, note });
      setEditing(false);
    });
  }

  return (
    <li className="fv-cal__event" data-tone="plan">
      <p className="fv-cal__event-who">Your plan</p>
      {editing ? (
        <form className="fv-cal__plan-form" onSubmit={saveEdit}>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={titleId}>
              What to do
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={PLAN_TITLE_MAX}
              required
              disabled={pending}
            />
          </div>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={timeId}>
              Time <span className="fv-cal__plan-optional">(optional)</span>
            </label>
            <input
              id={timeId}
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={noteId}>
              Note <span className="fv-cal__plan-optional">(optional)</span>
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={PLAN_NOTE_MAX}
              rows={2}
              disabled={pending}
            />
          </div>
          {error ? (
            <p className="fv-cal__plan-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="fv-cal__plan-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="fv-cal__event-title">
            {plan.title}
            {plan.done ? <span className="fv-cal__plan-done"> · done</span> : null}
          </p>
          {plan.time ? <p className="fv-cal__event-meta">{planTimeLabel(plan.time)}</p> : null}
          {plan.note ? <p className="fv-cal__event-note">{plan.note}</p> : null}
          <div className="fv-cal__plan-actions">
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={toggleDone}
              disabled={pending}
            >
              {plan.done ? "Mark not done" : "Mark done"}
            </button>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={openEdit}
              disabled={pending}
            >
              Edit
            </button>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={remove}
              disabled={pending}
            >
              Remove
            </button>
          </div>
        </>
      )}
      {!editing && error ? (
        <p className="fv-cal__plan-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** The “add a plan” control under the selected day's detail. */
export function PlanComposer({ day }: { day: string }) {
  const router = useRouter();
  const titleId = useId();
  const timeId = useId();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await send("/api/agent/plans", "POST", { day, title, time, note });
      setTitle("");
      setTime("");
      setNote("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The plan was not saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fv-cal__plan-add">
      <button
        className="btn btn--secondary btn--sm"
        type="button"
        onClick={() => {
          setError(null);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
      >
        {open ? "Close" : "Add a plan"}
      </button>
      <p className="fv-cal__plan-hint">
        A plan is your own note for the day. It never books a slot and never changes the office&rsquo;s
        appointments.
      </p>
      {open ? (
        <form className="fv-cal__plan-form" onSubmit={submit}>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={titleId}>
              What to do
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={PLAN_TITLE_MAX}
              required
              disabled={pending}
              placeholder="e.g. Call Lorna about the lawn lot"
            />
          </div>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={timeId}>
              Time <span className="fv-cal__plan-optional">(optional)</span>
            </label>
            <input
              id={timeId}
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="ag-field">
            <label className="ag-field__label" htmlFor={noteId}>
              Note <span className="fv-cal__plan-optional">(optional)</span>
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={PLAN_NOTE_MAX}
              rows={2}
              disabled={pending}
              placeholder="Anything to remember."
            />
          </div>
          {error ? (
            <p className="fv-cal__plan-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="fv-cal__plan-actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add to the day"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
