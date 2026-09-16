"use client";

/**
 * Family reading preferences — the family portal's “Make it easier to read”
 * block. Device-local by design: it changes how THIS device shows the portal,
 * so it never needs a service, and it works on a shared phone.
 *
 * Honesty rule: the block says plainly that the choice is saved on this device
 * only. Nothing is sent anywhere. The state is shown as a word as well as the
 * switch, so it is never colour-only.
 */
import { useEffect, useState } from "react";

type Prefs = { large: boolean; contrast: boolean; calm: boolean };

const STORAGE_KEY = "im_family_reading";

const DEFAULTS: Prefs = { large: false, contrast: false, calm: false };

function read(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function apply(prefs: Prefs) {
  const root = document.documentElement;
  const tokens: string[] = [];
  if (prefs.large) tokens.push("large");
  if (prefs.contrast) tokens.push("contrast");
  if (prefs.calm) tokens.push("calm");
  if (tokens.length > 0) {
    root.dataset.fvReading = tokens.join(" ");
  } else {
    delete root.dataset.fvReading;
  }
}

const ROWS: Array<{ key: keyof Prefs; title: string; detail: string }> = [
  {
    key: "large",
    title: "Bigger writing",
    detail: "Makes every word on every page larger — helpful in a chapel, or with older eyes.",
  },
  {
    key: "contrast",
    title: "Stronger colours",
    detail: "Darker words and firmer lines, on top of whatever your phone already does.",
  },
  {
    key: "calm",
    title: "Calmer page",
    detail: "Switches off any movement. Your phone's own setting is always respected too.",
  },
];

export function FamilyReadingPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = read();
    setPrefs(stored);
    apply(stored);
    setReady(true);
  }, []);

  function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — the choice still applies until the tab closes */
    }
  }

  return (
    <div className="fv-reader" data-ready={ready ? "yes" : "no"}>
      {ROWS.map((row) => (
        <div className="fv-toggle-row" key={row.key}>
          <div className="fv-toggle-row__body">
            <p className="fv-toggle-row__title">{row.title}</p>
            <p className="fv-toggle-row__detail">{row.detail}</p>
          </div>
          <label className="fv-switch">
            <input
              type="checkbox"
              checked={prefs[row.key]}
              onChange={(event) => toggle(row.key, event.target.checked)}
            />
            <span className="fv-switch__track" aria-hidden="true" />
            <span className="fv-switch__state">{prefs[row.key] ? "On" : "Off"}</span>
          </label>
        </div>
      ))}
      <p className="ag-note">
        <strong>Saved on this device only</strong> — nothing is sent to us, and your phone&rsquo;s own
        accessibility settings always win.
      </p>
    </div>
  );
}
