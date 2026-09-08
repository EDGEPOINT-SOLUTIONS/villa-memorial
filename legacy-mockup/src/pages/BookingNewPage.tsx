// New booking — Module H (chapel / vehicle / staff). Mirrors the demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { SCHEDULE } from "../lib/data";

export function BookingNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [resource, setResource] = useState("Main Chapel");
  const [kind, setKind] = useState("Chapel");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const ref = `bk-${SCHEDULE.length + 1}`;

  const kinds: Record<string, string[]> = {
    Chapel: ["Main Chapel", "Chapel B"],
    Vehicle: ["Van 1", "Van 2"],
    Staff: ["Embalming Bay"],
  };

  function onKindChange(k: string) {
    setKind(k);
    const opts = kinds[k] ?? [];
    setResource(opts[0] ?? "");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) {
      toast("Please add a title and date.", "danger");
      return;
    }
    setDone(true);
    toast(`Booking created · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/schedule">Schedule</Link>} title={done ? "Booking created" : "New booking"} />

      {done ? (
        <Card title="Booking created">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{resource}</strong> is booked for {title} on {date} at {time || "—"}. The real
              engine would check availability and flag clashes before saving.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/schedule")}>Back to schedule</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Add a booking">
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Type">
                <Select value={kind} onChange={(e) => onKindChange(e.target.value)}>
                  <option>Chapel</option>
                  <option>Vehicle</option>
                  <option>Staff</option>
                </Select>
              </Field>
              <Field label="Resource">
                <Select value={resource} onChange={(e) => setResource(e.target.value)}>
                  {(kinds[kind] ?? []).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Title">
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Viewing — Dela Cruz" />
              </Field>
              <Field label="Date">
                <Input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Time">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/schedule")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Create booking
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
