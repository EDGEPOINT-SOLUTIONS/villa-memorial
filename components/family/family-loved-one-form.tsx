"use client";

/**
 * The one control that starts the family portal from a clean account: add a
 * loved one (captain, 2026-10-02).
 *
 * The family portal begins with nobody on the account, so the screens that are
 * about a person need this first. The submission posts to the family BFF
 * (`POST /api/family/loved-ones`), which records the person in the household
 * store the whole portal reads; on success the page refreshes so the new person
 * appears in the switcher and every screen. A validation refusal is the route's
 * own readable sentence, never a silent no-op.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function AddLovedOneForm({ onAdded }: { onAdded?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lifeDates, setLifeDates] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/family/loved-ones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, life_dates: lifeDates }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "That could not be saved. Try again.");
      }
      setSaved(name.trim());
      setName("");
      setLifeDates("");
      router.refresh();
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="fv-request__fields" onSubmit={submit}>
      {saved ? (
        <p className="dash-note" role="status">
          {saved} is on your account now.
        </p>
      ) : null}
      <label className="field">
        <span>Their name</span>
        <input
          className="input"
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Who you look after"
          autoComplete="name"
          required
        />
      </label>
      <label className="field">
        <span>Life dates (if you know them)</span>
        <input
          className="input"
          type="text"
          name="life_dates"
          value={lifeDates}
          onChange={(event) => setLifeDates(event.target.value)}
          placeholder="1948 – 2026"
        />
      </label>
      {error ? (
        <p className="alert alert--danger" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn--primary ag-btn-xl" type="submit" disabled={busy}>
        <UserPlus size={20} aria-hidden="true" />
        <span>{busy ? "Adding…" : "Add them"}</span>
      </button>
    </form>
  );
}
