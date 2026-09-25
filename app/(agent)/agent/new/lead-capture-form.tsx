"use client";

/**
 * Field capture form (approved design page 12) — one question at a time, one
 * hand, one big Save. The capture itself is real: it writes to the demo-local
 * store on this device (lib/demo-agent-captures.ts) so a lead at the door
 * survives closing the app; the sync to the office waits on the crm-families
 * write contract, and the form says so.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  NEED_OPTIONS,
  SOURCE_OPTIONS,
  saveAgentLead,
  type AgentLeadCapture,
  type AgentLeadNeed,
  type AgentLeadSource,
} from "@/lib/demo-agent-captures";

export function LeadCaptureForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState<AgentLeadNeed | null>(null);
  const [source, setSource] = useState<AgentLeadSource>("walk_in");
  const [callback, setCallback] = useState("");
  const [note, setNote] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AgentLeadCapture | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("Enter the phone number — it is how you reach them again.");
      return;
    }
    if (!need) {
      setError("Choose what they need — even “not sure yet” counts.");
      return;
    }
    const result = saveAgentLead({
      name,
      phone,
      need,
      source,
      callback,
      note,
      has_photo: Boolean(photoName),
    });
    setSaved(result.capture);
    setDuplicate(result.duplicate);
  }

  function another() {
    setSaved(null);
    setDuplicate(false);
    setName("");
    setPhone("");
    setNeed(null);
    setSource("walk_in");
    setCallback("");
    setNote("");
    setPhotoName(null);
    setError(null);
  }

  if (saved) {
    const displayName = saved.name || saved.phone;
    return (
      <div className="ag-capture">
        <div className="ag-card">
          <div className="ag-card__body">
            <p style={{ margin: 0 }}>
              <span className="badge badge--success">{duplicate ? "Already yours" : "Saved on this phone"}</span>
            </p>
            <p className="ag-note" style={{ marginTop: "var(--space-2)" }}>
              {duplicate
                ? `${displayName} is already in your queue with this number — we kept the first record rather than making a second one.`
                : `${displayName} is queued on this device as “${NEED_OPTIONS.find((o) => o.value === saved.need)?.label.toLowerCase()}”. They will appear in your pipeline when the CRM write contract lands — nothing is sent to the office yet.`}
            </p>
            <div className="ag-actions">
              <Link className="btn btn--primary btn--sm" href="/agent/prospects">
                Back to the pipeline
              </Link>
              <button className="btn btn--secondary btn--sm" type="button" onClick={another}>
                Capture another
              </button>
            </div>
          </div>
        </div>
        <p className="ag-note">
          Honest wording, per the repo rule: this is a demo-local capture, not delivery. When the crm-families
          write route lands, this confirmation becomes a real receipt.
        </p>
      </div>
    );
  }

  return (
    <form className="ag-capture" onSubmit={submit}>
      {!online ? (
        <div className="ag-offline" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 5-2.6M9.5 21h5M12 17v4M5.5 12.5a10 10 0 0 1 3-1.4M15.5 12.5a10 10 0 0 1 3.6 1.7M2 2l20 20M8.5 16.3a5 5 0 0 1 7 0" /></svg>
          <span>
            <strong>No signal right now.</strong> Anything you save here is kept on this phone and you can
            send it when you are back online — it is never lost.
          </span>
        </div>
      ) : null}

      <div className="ag-card">
        <div className="ag-card__body">
          <div className="ag-field">
            <label className="ag-field__label" htmlFor="lead-name">
              1 · Who did you meet?
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              autoComplete="name"
            />
          </div>

          <div className="ag-field">
            <label className="ag-field__label" htmlFor="lead-phone">
              Phone number
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 9xx xxx xxxx"
              autoComplete="tel"
              required
            />
            <p className="ag-field__hint">Only the number and what they need are required — it is how the office and you reach them again.</p>
          </div>

          <div className="ag-field">
            <p className="ag-field__label">
              2 · What do they need?
            </p>
            <div className="ag-choice-row">
              {NEED_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`ag-choice${need === o.value ? " ag-choice--on" : ""}`}
                  type="button"
                  aria-pressed={need === o.value}
                  onClick={() => setNeed(o.value)}
                >
                  {o.label}
                  <small>{o.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="ag-field">
            <p className="ag-field__label">
              3 · Where did they come from?
            </p>
            <div className="ag-choice-row">
              {SOURCE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`ag-choice${source === o.value ? " ag-choice--on" : ""}`}
                  type="button"
                  aria-pressed={source === o.value}
                  onClick={() => setSource(o.value)}
                >
                  {o.label}
                  <small>{o.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="ag-field">
            <label className="ag-field__label" htmlFor="lead-callback">
              4 · When should you call back?
            </label>
            <input
              id="lead-callback"
              type="text"
              value={callback}
              onChange={(e) => setCallback(e.target.value)}
              placeholder="e.g. After 4 PM, by call"
            />
            <p className="ag-field__hint">This becomes your follow-up — it will appear in Today at the right time.</p>
          </div>

          <div className="ag-field">
            <label className="ag-field__label" htmlFor="lead-note">
              A note for the next call (optional)
            </label>
            <textarea id="lead-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What matters to them, who else decides…" />
          </div>

          <div className="ag-photo">
            <span className="ag-photo__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v12H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg>
            </span>
            <div className="ag-photo__body">
              <p className="ag-field__label">
                Photo of the form or a business card
              </p>
              <p className="ag-field__hint">
                {photoName ? `Attached: ${photoName}` : "Optional. The photo stays on this phone with the lead."}
              </p>
            </div>
            <label className="btn btn--secondary" style={{ cursor: "pointer" }}>
              Take a photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                aria-label="Attach a photo of the form or a business card"
              />
            </label>
          </div>

          {error ? (
            <p className="ag-note ag-note--error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn btn--primary ag-btn-xl btn--block" type="submit">
            Save this lead
          </button>
          <p className="ag-note ag-note--center">
            Saved on this phone. Nothing is sent to the office yet — the CRM write contract is not built.
          </p>
        </div>
      </div>
    </form>
  );
}
