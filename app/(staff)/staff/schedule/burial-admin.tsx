"use client";

/**
 * The burial calendar's WRITE surface (client minutes 2026-09-21, item 2: "record and manage
 * burial schedules"). Rendered only for a `scheduling:write` session (the page passes
 * `canWrite`); posting without that scope is refused by the route anyway.
 *
 * Two things it does, both named by the audit as missing:
 *   · record a burial (and optionally its light pickup), through `POST /api/schedule/burials`;
 *   · move a pickup through `scheduled → in_progress → done` (or set a first one), through
 *     `PATCH /api/schedule/burials/:id/pickup`.
 *
 * It holds no rules: the browser's field checks and the server's are the same functions in
 * `lib/burial-admin.ts`. A refusal shows the server's own sentence and changes nothing.
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  LIGHT_PICKUP_STATES,
  LIGHT_PICKUP_STATE_LABEL,
  LIGHT_PICKUP_STATE_TONE,
  formatParkTime,
  isTimeOfDay,
  type BurialEntry,
  type LightPickupState,
} from "@/lib/burial-calendar";

type Draft = {
  date: string;
  time: string;
  case_number: string;
  deceased_name: string;
  lot_number: string;
  section: string;
  coordinator: string;
  note: string;
  pickup_time: string;
  pickup_crew: string;
};

function emptyDraft(date: string, caseNumber = ""): Draft {
  return {
    date,
    time: "09:00",
    case_number: caseNumber,
    deceased_name: "",
    lot_number: "",
    section: "",
    coordinator: "",
    note: "",
    pickup_time: "",
    pickup_crew: "",
  };
}

async function postJson(url: string, body: unknown, method: "POST" | "PATCH"): Promise<{
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const payload = (await res.json().catch(() => null)) as
      | { error?: string; fieldErrors?: Record<string, string> }
      | null;
    return {
      ok: false,
      error: payload?.error ?? "That could not be saved.",
      fieldErrors: payload?.fieldErrors,
    };
  } catch {
    return { ok: false, error: "Could not reach the scheduling service." };
  }
}

export function BurialAdmin({
  burials,
  defaultDate,
}: {
  burials: BurialEntry[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultDate));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  const base = useId();

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setDone(null);
    setSaving(true);
    const result = await postJson("/api/schedule/burials", draft, "POST");
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "That could not be saved.");
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setDone(`${draft.deceased_name} recorded.`);
    setDraft(emptyDraft(draft.date));
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="burial-admin stack-4">
      <div className="row row--space row--wrap">
        <div>
          <h3 className="mb-0">Record a burial</h3>
          <p className="text-sm text-muted mb-0">
            Add a burial to the sheet. A light pickup can be set with it or added later.
          </p>
        </div>
        <Button
          type="button"
          variant={open ? "secondary" : "primary"}
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Add a burial"}
        </Button>
      </div>

      {done ? (
        <Alert tone="success" title={done} />
      ) : null}
      {error ? (
        <Alert tone="danger" title="The burial was not recorded">
          {error}
        </Alert>
      ) : null}

      {open ? (
        <form className="stack-4" onSubmit={submit} noValidate>
          <div className="field-grid">
            <Field label="Burial date" htmlFor={`${base}-date`} error={fieldErrors.date}>
              <input
                id={`${base}-date`}
                type="date"
                value={draft.date}
                onChange={(e) => change("date", e.target.value)}
              />
            </Field>
            <Field
              label="Burial time"
              htmlFor={`${base}-time`}
              hint="24-hour, park time"
              error={fieldErrors.time}
            >
              <input
                id={`${base}-time`}
                type="time"
                value={draft.time}
                onChange={(e) => change("time", e.target.value)}
              />
            </Field>
            <Field label="Case number" htmlFor={`${base}-case`} error={fieldErrors.case_number}>
              <input
                id={`${base}-case`}
                value={draft.case_number}
                onChange={(e) => change("case_number", e.target.value)}
              />
            </Field>
            <Field label="Name" htmlFor={`${base}-name`} error={fieldErrors.deceased_name}>
              <input
                id={`${base}-name`}
                value={draft.deceased_name}
                onChange={(e) => change("deceased_name", e.target.value)}
              />
            </Field>
            <Field label="Lot number" htmlFor={`${base}-lot`} error={fieldErrors.lot_number}>
              <input
                id={`${base}-lot`}
                value={draft.lot_number}
                onChange={(e) => change("lot_number", e.target.value)}
              />
            </Field>
            <Field label="Section" htmlFor={`${base}-section`} error={fieldErrors.section}>
              <input
                id={`${base}-section`}
                value={draft.section}
                onChange={(e) => change("section", e.target.value)}
              />
            </Field>
            <Field label="Coordinator" htmlFor={`${base}-coord`} error={fieldErrors.coordinator}>
              <input
                id={`${base}-coord`}
                value={draft.coordinator}
                onChange={(e) => change("coordinator", e.target.value)}
              />
            </Field>
          </div>

          <fieldset className="stack-3">
            <legend className="text-sm">Light pickup (optional)</legend>
            <div className="field-grid">
              <Field
                label="Pickup time"
                htmlFor={`${base}-ptime`}
                hint="24-hour, park time"
                error={fieldErrors["light_pickup.time"]}
              >
                <input
                  id={`${base}-ptime`}
                  type="time"
                  value={draft.pickup_time}
                  onChange={(e) => change("pickup_time", e.target.value)}
                />
              </Field>
              <Field
                label="Crew"
                htmlFor={`${base}-pcrew`}
                error={fieldErrors["light_pickup.crew"]}
              >
                <input
                  id={`${base}-pcrew`}
                  value={draft.pickup_crew}
                  onChange={(e) => change("pickup_crew", e.target.value)}
                />
              </Field>
            </div>
          </fieldset>

          <Field label="Note" htmlFor={`${base}-note`} hint="Optional" error={fieldErrors.note}>
            <input
              id={`${base}-note`}
              value={draft.note}
              onChange={(e) => change("note", e.target.value)}
            />
          </Field>

          <div className="capture-actions">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record this burial"}
            </Button>
          </div>
        </form>
      ) : null}

      <PickupControls burials={burials} />
    </div>
  );
}

/** One row per burial: move the pickup through its lifecycle, or set a first one. */
function PickupControls({ burials }: { burials: BurialEntry[] }) {
  if (burials.length === 0) {
    return (
      <p className="text-sm text-muted mb-0">
        Light pickups appear here once a burial is recorded.
      </p>
    );
  }
  return (
    <div className="stack-3">
      <h3 className="mb-0">Light pickups</h3>
      <ul className="burial-pickup-admin">
        {burials.map((entry) => (
          <li key={entry.id} className="burial-pickup-admin__row">
            <PickupRow entry={entry} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickupRow({ entry }: { entry: BurialEntry }) {
  const router = useRouter();
  const base = useId();
  const [time, setTime] = useState(entry.light_pickup?.time ?? "");
  const [crew, setCrew] = useState(entry.light_pickup?.crew ?? "");
  const [state, setState] = useState<LightPickupState>(
    entry.light_pickup?.state ?? "scheduled",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!entry.light_pickup && (!isTimeOfDay(time) || !crew.trim())) {
      setError("Set the pickup time and crew first.");
      return;
    }
    setSaving(true);
    const result = await postJson(
      `/api/schedule/burials/${encodeURIComponent(entry.id)}/pickup`,
      {
        state,
        ...(time ? { time } : {}),
        ...(crew ? { crew } : {}),
      },
      "PATCH",
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "That could not be saved.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="burial-pickup-admin__form" onSubmit={save}>
      <div className="burial-pickup-admin__who">
        <strong>{entry.deceased_name}</strong>
        <span className="text-sm text-muted">
          {entry.lot_number} · Section {entry.section}
        </span>
        {entry.light_pickup ? (
          <Badge tone={LIGHT_PICKUP_STATE_TONE[entry.light_pickup.state]}>
            {LIGHT_PICKUP_STATE_LABEL[entry.light_pickup.state]}
          </Badge>
        ) : (
          <Badge tone="neutral">No pickup</Badge>
        )}
      </div>
      <div className="field-grid">
        {!entry.light_pickup ? (
          <>
            <Field label="Pickup time" htmlFor={`${base}-t`} hint="24-hour">
              <input
                id={`${base}-t`}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
            <Field label="Crew" htmlFor={`${base}-c`}>
              <input id={`${base}-c`} value={crew} onChange={(e) => setCrew(e.target.value)} />
            </Field>
          </>
        ) : (
          <p className="text-sm text-muted mb-0">
            Lights {formatParkTime(entry.light_pickup.time)} · {entry.light_pickup.crew}
          </p>
        )}
        <Field label="State" htmlFor={`${base}-s`}>
          <select
            id={`${base}-s`}
            value={state}
            onChange={(e) => setState(e.target.value as LightPickupState)}
          >
            {LIGHT_PICKUP_STATES.map((option) => (
              <option key={option} value={option}>
                {LIGHT_PICKUP_STATE_LABEL[option]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="row row--wrap">
        <Button type="submit" size="sm" variant="secondary" disabled={saving}>
          {saving ? "Saving…" : entry.light_pickup ? "Save pickup" : "Add pickup"}
        </Button>
        {error ? <span className="text-sm burial-pickup-admin__error">{error}</span> : null}
      </div>
    </form>
  );
}
