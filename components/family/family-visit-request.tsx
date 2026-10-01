"use client";

/**
 * Ask the office for a visit on ONE chosen day, about ONE loved one and their
 * lot (captain, 2026-09-30).
 *
 * The day comes from the calendar selection, the person and lot come from the
 * household's own records — nothing is typed free-hand — so the printed request
 * the office receives carries the exact link (person · lot · day). The block
 * shows the family the payload BEFORE they open it, exactly as the request
 * composer does.
 *
 * HONESTY: no availability service exists, so this block never shows a free
 * slot. It says plainly that the office confirms the day by phone, and the only
 * action is opening the printed request or calling.
 */
import { useState } from "react";
import Link from "next/link";
import { FileText, Phone } from "lucide-react";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyDayLabel } from "@/lib/family/family-view";
import { FAMILY_VISIT_KINDS } from "@/lib/family/family-calendar";

/** The person fields the request needs (the household's own shape). */
export type VisitRequestPerson = {
  id: string;
  name: string;
  life_dates: string;
  lot_number: string;
  lot_section: string;
  lot_plan: string;
  park: string;
};

export function FamilyVisitRequest({
  people,
  day,
  defaultPersonId,
}: {
  people: VisitRequestPerson[];
  /** The selected calendar day (`yyyy-mm-dd`). */
  day: string;
  defaultPersonId?: string;
}) {
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id ?? "");
  const [kindKey, setKindKey] = useState<string>(FAMILY_VISIT_KINDS[0]?.key ?? "home_visit");
  const [note, setNote] = useState("");

  const person = people.find((entry) => entry.id === personId) ?? people[0];
  const kind = FAMILY_VISIT_KINDS.find((entry) => entry.key === kindKey) ?? FAMILY_VISIT_KINDS[0];
  if (!person || !kind) return null;

  const noteText = note.trim();
  const slipHref = `/client/requests/slip?person=${encodeURIComponent(person.id)}&visit=${encodeURIComponent(
    kind.key,
  )}&date=${encodeURIComponent(day)}${noteText ? `&note=${encodeURIComponent(noteText)}` : ""}`;

  return (
    <details className="fv-cal__ask">
      <summary>Ask for a visit on this day</summary>
      <div className="fv-cal__ask-body">
        <div className="fv-request__fields">
          {people.length > 1 ? (
            <label className="field">
              <span>Who is this about?</span>
              <select
                id="fvr-person"
                name="person"
                className="select"
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
              >
                {people.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} — Lot {entry.lot_number}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>What kind of visit?</span>
            <select
              id="fvr-kind"
              name="visit_kind"
              className="select"
              value={kindKey}
              onChange={(event) => setKindKey(event.target.value)}
            >
              {FAMILY_VISIT_KINDS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tell us more (optional)</span>
            <textarea
              id="fvr-note"
              name="note"
              className="textarea"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything you would like us to know."
            />
          </label>
        </div>

        <div className="fv-request__preview" aria-live="polite">
          <p className="fv-request__preview-title">What the office will receive</p>
          <dl className="fv-request__facts">
            <div>
              <dt>About</dt>
              <dd>
                {person.name} · {person.life_dates}
              </dd>
            </div>
            <div>
              <dt>Their lot</dt>
              <dd>
                Section {person.lot_section} · Lot {person.lot_number} · {person.lot_plan}
              </dd>
            </div>
            <div>
              <dt>The park</dt>
              <dd>{person.park}</dd>
            </div>
            <div>
              <dt>The visit</dt>
              <dd>{kind.label}</dd>
            </div>
            <div>
              <dt>For the day</dt>
              <dd>{familyDayLabel(day)}</dd>
            </div>
            {noteText ? (
              <div>
                <dt>Your words</dt>
                <dd>{noteText}</dd>
              </div>
            ) : null}
          </dl>
          <div className="fv-request__actions">
            <Link className="btn btn--primary ag-btn-xl" href={slipHref}>
              <FileText size={20} aria-hidden="true" />
              <span>Open the printed request</span>
            </Link>
            <a className="btn btn--ghost" href={FAMILY_HELP.phoneHref}>
              <Phone size={20} aria-hidden="true" />
              <span>Call {FAMILY_HELP.phone}</span>
            </a>
          </div>
          <p className="fv-request__note">
            We can’t check who is free yet. This asks the office for {familyDayLabel(day)} and they
            confirm it — nothing is booked until they call you.
          </p>
        </div>
      </div>
    </details>
  );
}
