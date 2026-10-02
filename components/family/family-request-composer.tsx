"use client";

/**
 * The family request composer — how a manager asks the office for something on
 * behalf of ONE loved one, in a way that always remembers WHICH person and WHICH
 * lot the request is about (captain, 2026-09-30).
 *
 * The person and the lot are chosen from the household's own records, never typed
 * free-hand, so the office receives a structured request: the loved one's name,
 * their section · lot · plan and the park, then the kind of help and the family's
 * own words. The composer builds the printed request slip (lib/contracts/
 * family-request-slip.ts) and links to it; nothing here sends anything, because no
 * service desk exists — the slip plus the office phone are the honest path.
 */
import Link from "next/link";
import { useState } from "react";
import { FileText, Phone } from "lucide-react";
import type { FamilyAskFor } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";

export type ComposerPerson = {
  id: string;
  name: string;
  life_dates: string;
  lot_number: string;
  lot_section: string;
  lot_plan: string;
  park: string;
};

export function FamilyRequestComposer({
  people,
  askFor,
  defaultPersonId,
  managerName,
  managerContact,
}: {
  people: ComposerPerson[];
  askFor: FamilyAskFor[];
  defaultPersonId?: string;
  managerName: string;
  managerContact: string;
}) {
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id ?? "");
  const [kindKey, setKindKey] = useState(askFor[0]?.key ?? "");
  const [note, setNote] = useState("");

  const person = people.find((entry) => entry.id === personId) ?? people[0];
  const kind = askFor.find((entry) => entry.key === kindKey) ?? askFor[0];
  if (!person || !kind) return null;

  const noteText = note.trim();
  const slipHref = `/client/requests/slip?person=${encodeURIComponent(person.id)}&kind=${encodeURIComponent(
    kind.key,
  )}${noteText ? `&note=${encodeURIComponent(noteText)}` : ""}`;

  return (
    <div className="fv-request">
      <div className="fv-request__fields">
        <label className="field">
          <span>Who is this about?</span>
          <select
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
        <label className="field">
          <span>What do you need?</span>
          <select
            className="select"
            value={kindKey}
            onChange={(event) => setKindKey(event.target.value)}
          >
            {askFor.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tell us more (optional)</span>
          <textarea
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
            <dt>The request</dt>
            <dd>{kind.label}</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>
              {managerName} · {managerContact}
            </dd>
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
          Names {person.name.split(/\s+/)[0] || "your loved one"} and their lot — the office
          confirms it.
        </p>
      </div>
    </div>
  );
}
