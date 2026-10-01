"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { FamilyImageUploader } from "@/components/family/family-image-uploader";
import { Avatar } from "@/components/portal/avatar";
import {
  MEMORIAL_FIELD_CHOICES,
  type MemorialConsent,
  type MemorialFieldKey,
} from "@/lib/memorials";

/**
 * The ONE memorial switch and its per-field choices (captain, 2026-09-30).
 *
 * Each loved one gets their own switch, labelled with their name — “Make
 * Ernesto Dela Cruz visible”. Off is the safe state and says so plainly; on
 * says that the memorial can be found. The NAME is always shown when the switch
 * is on; the photograph, the birth year, the death year and the lot are each
 * this family's choice and each defaults OFF.
 *
 * Every change is written straight to the server (`POST /api/family/memorials`),
 * which owns the record the public pages read — the family is told in one line
 * what happened on the public side, and any failure is the route's own readable
 * sentence, never a silent no-op.
 */
export function MemorialVisibilityControl({
  personId,
  name,
  lifeDates,
  initials,
  portraitSrc,
  initial,
}: {
  personId: string;
  name: string;
  lifeDates: string;
  initials: string;
  /** The private portrait the office holds for this loved one, when attached. */
  portraitSrc: string | null;
  initial: MemorialConsent;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState<MemorialConsent>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const publicHref = `/memorials/${encodeURIComponent(personId)}`;

  async function save(next: MemorialConsent) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/family/memorials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ person_id: personId, ...next }),
      });
      const payload = (await response.json().catch(() => null)) as {
        consent?: MemorialConsent;
        error?: string;
      } | null;
      if (!response.ok || !payload?.consent) {
        throw new Error(payload?.error ?? "That choice could not be saved. Try again.");
      }
      setConsent(payload.consent);
      setMessage(
        payload.consent.visible
          ? `${name} is now on the public memorial page.`
          : `${name} is no longer on the public memorial page.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That choice could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleField(key: MemorialFieldKey, checked: boolean) {
    const next = { ...consent };
    if (key === "photo") next.show_photo = checked;
    if (key === "birth") next.show_birth = checked;
    if (key === "death") next.show_death = checked;
    if (key === "lot") next.show_lot = checked;
    void save(next);
  }

  const fieldOn: Record<MemorialFieldKey, boolean> = {
    photo: consent.show_photo,
    birth: consent.show_birth,
    death: consent.show_death,
    lot: consent.show_lot,
  };

  return (
    <section className="mem-vis" aria-labelledby={`mem-vis-${personId}`}>
      <div className="mem-vis__head">
        <Avatar src={portraitSrc} initials={initials} size={64} />
        <div className="mem-vis__who">
          <h2 className="mem-vis__name" id={`mem-vis-${personId}`}>
            {name}
          </h2>
          {lifeDates ? <p className="mem-vis__dates">{lifeDates}</p> : null}
        </div>
        <label className="mem-switch">
          <input
            type="checkbox"
            role="switch"
            className="mem-switch__input"
            checked={consent.visible}
            disabled={busy}
            onChange={(event) => void save({ ...consent, visible: event.target.checked })}
          />
          <span className="mem-switch__track" aria-hidden="true" />
          <span className="mem-switch__label">Make {name} visible</span>
        </label>
      </div>

      <p className="mem-vis__state" aria-live="polite">
        {consent.visible
          ? `${name}’s memorial can be found by anyone who searches.`
          : `Nothing about ${name} is shown publicly.`}
      </p>

      <fieldset className="mem-vis__fields" disabled={!consent.visible || busy}>
        <legend>The name always shows. Choose anything else to show with it:</legend>
        {MEMORIAL_FIELD_CHOICES.map((choice) => (
          <label className="mem-vis__field" key={choice.key}>
            <input
              type="checkbox"
              checked={fieldOn[choice.key]}
              onChange={(event) => toggleField(choice.key, event.target.checked)}
            />
            <span className="mem-vis__field-body">
              <span className="mem-vis__field-label">{choice.label}</span>
              <span className="mem-vis__field-meaning">{choice.meaning}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mem-vis__foot">
        <FamilyImageUploader
          slot="portrait"
          personId={personId}
          hasImage={Boolean(portraitSrc)}
          label={portraitSrc ? `Change ${name}’s photo` : `Attach ${name}’s photo`}
          hint="Private to your family until you also choose to show it."
        />
        {consent.visible ? (
          <Link className="mem-vis__link" href={publicHref}>
            Open the public page
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {message ? (
        <p className="mem-vis__message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="alert alert--danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
