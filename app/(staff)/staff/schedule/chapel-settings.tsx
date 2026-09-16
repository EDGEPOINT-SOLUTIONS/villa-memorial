"use client";

/**
 * Chapel settings (staff Schedule): how many chapels the park runs, what each is
 * called, the class it sells as, its capacity, whether it is on the storefront and
 * the office's notes.
 *
 * This is the PLACEHOLDER the client has not confirmed yet — the notice travels
 * with the screen (lib/chapel-admin.ts `CHAPEL_PLACEHOLDER_NOTICE`). Every edit
 * goes through /api/schedule/chapels (scope `scheduling:write`) into the same
 * durable store the customer booking dialog reads, so a change here changes what
 * a visitor sees on the next page load. Deactivating is the retirement tool: a
 * chapel on the books keeps its bookings and calendar, but leaves the storefront.
 */
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  CHAPEL_PLACEHOLDER_NOTICE,
  MAX_CHAPEL_NAME_LENGTH,
  MAX_CHAPEL_NOTES_LENGTH,
  type ChapelRecord,
} from "@/lib/chapel-admin";
import { CHAPEL_CLASS_LABEL, CHAPEL_CLASS_ORDER, type ChapelClass } from "@/lib/chapel-booking";

type FormState = {
  name: string;
  chapel_class: ChapelClass;
  capacity: string;
  active: boolean;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  chapel_class: "common",
  capacity: "0",
  active: true,
  notes: "",
};

function formOf(record: ChapelRecord): FormState {
  return {
    name: record.name,
    chapel_class: record.chapel_class,
    capacity: String(record.capacity),
    active: record.active,
    notes: record.notes,
  };
}

export function ChapelSettings({
  chapels,
  canWrite,
}: {
  chapels: ChapelRecord[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const nameId = useId();
  const classId = useId();
  const capacityId = useId();
  const notesId = useId();
  const activeId = useId();

  const [editing, setEditing] = useState<ChapelRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const activeCount = chapels.filter((c) => c.active).length;

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ ...EMPTY_FORM, chapel_class: "common" });
    setError(null);
    setNotice(null);
  }

  function openEdit(record: ChapelRecord) {
    setCreating(false);
    setEditing(record);
    setForm(formOf(record));
    setError(null);
    setNotice(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (form.name.trim().length < 2) {
      setError("Give the chapel a name (at least 2 characters).");
      return;
    }
    const capacity = Number(form.capacity);
    setPending(true);
    try {
      const res = await fetch(
        editing ? `/api/schedule/chapels/${encodeURIComponent(editing.id)}` : "/api/schedule/chapels",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            chapel_class: form.chapel_class,
            capacity,
            active: form.active,
            notes: form.notes.trim(),
          }),
        },
      );
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The chapel could not be saved.",
        );
        return;
      }
      setNotice(editing ? `${form.name.trim()} updated.` : `${form.name.trim()} added.`);
      closeForm();
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(record: ChapelRecord) {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/chapels/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: record.name,
          chapel_class: record.chapel_class,
          capacity: record.capacity,
          active: !record.active,
          notes: record.notes,
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The chapel could not be saved.",
        );
        return;
      }
      setNotice(
        record.active
          ? `${record.name} is off the storefront — customers can no longer book it.`
          : `${record.name} is back on the storefront.`,
      );
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  const showForm = canWrite && (creating || editing !== null);

  return (
    <div className="card">
      <div className="card__header row row--space">
        <h3>Chapels on the books</h3>
        <span className="text-sm text-muted">
          {chapels.length} configured · {activeCount} on the storefront
        </span>
      </div>
      <div className="card__body stack-4">
        <Alert tone="warning" title="Placeholder chapel list">
          {CHAPEL_PLACEHOLDER_NOTICE}
        </Alert>

        {notice ? <Alert tone="success" title={notice} /> : null}
        {error && !showForm ? (
          <Alert tone="danger" title="The change did not stick">
            {error}
          </Alert>
        ) : null}

        {chapels.length === 0 ? (
          <p className="text-sm text-muted">
            No chapel is on the park&rsquo;s books, so the storefront cannot take chapel bookings.
            Add the park&rsquo;s chapels below.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Chapel</th>
                  <th scope="col">Class</th>
                  <th scope="col">Capacity</th>
                  <th scope="col">Storefront</th>
                  <th scope="col">Notes</th>
                  {canWrite ? <th scope="col">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {chapels.map((chapel) => (
                  <tr key={chapel.id}>
                    <td>
                      <strong>{chapel.name}</strong>
                    </td>
                    <td className="text-sm">{CHAPEL_CLASS_LABEL[chapel.chapel_class]}</td>
                    <td className="text-sm">{chapel.capacity}</td>
                    <td>
                      <Badge tone={chapel.active ? "success" : "neutral"}>
                        {chapel.active ? "Bookable" : "Off"}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted">{chapel.notes || "—"}</td>
                    {canWrite ? (
                      <td>
                        <div className="row">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(chapel)}>
                            Edit
                          </Button>
                          <Button
                            variant={chapel.active ? "ghost" : "secondary"}
                            size="sm"
                            disabled={pending}
                            onClick={() => toggleActive(chapel)}
                          >
                            {chapel.active ? "Take off storefront" : "Put back"}
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canWrite && !showForm ? (
          <div>
            <Button size="sm" onClick={openCreate}>
              + Add chapel
            </Button>
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={submit} className="stack-3" noValidate>
            <h4>{editing ? `Edit ${editing.name}` : "Add a chapel"}</h4>
            <div className="field-grid field-grid--2">
              <Field
                label="Name"
                htmlFor={nameId}
                hint={`How the chapel appears to customers (max ${MAX_CHAPEL_NAME_LENGTH} characters).`}
              >
                <input
                  id={nameId}
                  type="text"
                  disabled={pending}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Chapel A"
                />
              </Field>
              <Field
                label="Class"
                htmlFor={classId}
                hint="The 2026 sheet prices common and private chapels separately."
              >
                <select
                  id={classId}
                  disabled={pending}
                  value={form.chapel_class}
                  onChange={(e) =>
                    setForm({ ...form, chapel_class: e.target.value as ChapelClass })
                  }
                >
                  {CHAPEL_CLASS_ORDER.map((cls) => (
                    <option key={cls} value={cls}>
                      {CHAPEL_CLASS_LABEL[cls]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-grid field-grid--2">
              <Field label="Capacity" htmlFor={capacityId} hint="Seats the chapel takes.">
                <input
                  id={capacityId}
                  type="number"
                  min={0}
                  max={10000}
                  disabled={pending}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </Field>
              <Field
                label="Notes"
                htmlFor={notesId}
                hint={`Office-only (max ${MAX_CHAPEL_NOTES_LENGTH} characters).`}
              >
                <input
                  id={notesId}
                  type="text"
                  disabled={pending}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
            <label className="row text-sm" htmlFor={activeId}>
              <input
                id={activeId}
                type="checkbox"
                disabled={pending}
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Bookable on the storefront
            </label>
            {error ? (
              <p className="field__error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="capture-actions">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save chapel" : "Add chapel"}
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={closeForm} disabled={pending}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
