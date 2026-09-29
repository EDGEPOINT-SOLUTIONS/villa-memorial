"use client";

/**
 * GoogleMapsKeyField — the home editor's section 7 key field.
 *
 * The key is SERVER-SIDE CONFIGURATION, not page copy: it lives in the
 * site-config store (`lib/api-client/site-config.ts`) and never rides the landing
 * content document, so a save of the page can neither carry nor leak it. The
 * public home reads it inside a server component and builds the embed before the
 * page serialises, so it never reaches public JavaScript either.
 *
 * The field loads its own state from the staff-gated `/api/site-config` route and
 * says PLAINLY which mode is live: the stored key, a deployment-level
 * `GOOGLE_MAPS_API_KEY` that wins over it, or no key at all — in which case the
 * map falls back to the keyless classic embed the approved plan uses.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";

type ConfigState = {
  storedKey: string;
  source: "environment" | "store" | "none";
  mode: "key" | "classic";
  updatedAt: string | null;
};

function modeSentence(state: ConfigState): string {
  if (state.source === "environment") {
    return "Live: a deployment-level GOOGLE_MAPS_API_KEY is set and wins over the value stored here. The embed uses Google's official Embed API.";
  }
  if (state.source === "store") {
    return "Live: the stored key is in use — the embed uses Google's official Embed API.";
  }
  return "Live: no key is set, so the map uses Google's keyless classic embed (the one the approved plan uses). Paste a key and save to switch to the official Embed API.";
}

export function GoogleMapsKeyField() {
  const [state, setState] = useState<ConfigState | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/site-config", { cache: "no-store" });
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
      if (!response.ok) {
        setNotice({ tone: "danger", msg: typeof body.error === "string" ? body.error : "The site configuration could not be read." });
        return;
      }
      const next: ConfigState = {
        storedKey: typeof body.storedKey === "string" ? body.storedKey : "",
        source:
          body.source === "environment" || body.source === "store" ? body.source : "none",
        mode: body.mode === "key" ? "key" : "classic",
        updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
      };
      setState(next);
      setValue(next.storedKey);
    } catch {
      setNotice({ tone: "danger", msg: "The site configuration could not be read — check your connection." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: value }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body =
        typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
      if (!response.ok) {
        setNotice({ tone: "danger", msg: typeof body.error === "string" ? body.error : "The key could not be saved." });
        return;
      }
      setNotice({
        tone: "success",
        msg: value.trim().length > 0 ? "Key saved — section 7 will use the official Embed API on the next render." : "Key cleared — section 7 falls back to the keyless classic embed.",
      });
      await load();
    } catch {
      setNotice({ tone: "danger", msg: "The key could not be saved — check your connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-3">
      <Field
        label="Google Maps API key (section 7 embed)"
        htmlFor="home-google-key"
        hint="Stored server-side (never in the page document, never in public JavaScript). Leave empty to use the keyless classic embed."
      >
        <input
          id="home-google-key"
          type="password"
          autoComplete="off"
          value={value}
          disabled={busy}
          placeholder="AIza…"
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      {state ? (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          <KeyRound size={14} aria-hidden="true" /> {modeSentence(state)}
          {state.updatedAt ? ` Last saved ${state.updatedAt.slice(0, 16).replace("T", " ")}.` : ""}
        </p>
      ) : null}
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        The app holds <b>no coordinates</b> for the park. Both embed modes pin the park address
        recorded in Brand &amp; 24/7 line, which is Google&apos;s reading of that address — the pin
        becomes exact when the office supplies the two numbers.
      </p>
      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}
      <div className="row" style={{ gap: "var(--space-2)" }}>
        <Button variant="secondary" size="sm" onClick={() => void save()} disabled={busy}>
          {busy ? <Loader2 size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
          {busy ? "Saving…" : "Save key"}
        </Button>
      </div>
    </div>
  );
}
