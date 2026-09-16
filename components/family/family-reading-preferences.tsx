"use client";

/**
 * Family reading preferences — the approved design's "Language and reading"
 * block (page 15). Device-local by design: it changes how THIS device shows the
 * portal, so it never needs a service, and it works for a family that is not
 * signed in on a shared phone.
 *
 * Honesty rule: the block says plainly that the choice is saved on this device
 * only. Nothing is sent anywhere.
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
    root.dataset.fpReading = tokens.join(" ");
  } else {
    delete root.dataset.fpReading;
  }
}

const ROWS: Array<{ key: keyof Prefs; title: string; detail: string }> = [
  {
    key: "large",
    title: "Larger text",
    detail: "Makes the text on every family page bigger — helpful for reading in a chapel or with older eyes.",
  },
  {
    key: "contrast",
    title: "Stronger contrast",
    detail: "Darker text and firmer lines, on top of whatever your phone already does.",
  },
  {
    key: "calm",
    title: "Reduce movement",
    detail: "Switches off gentle fades and transitions. Your phone's own setting is also respected.",
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
    <div className="fp-reader" data-ready={ready ? "yes" : "no"}>
      {ROWS.map((row) => (
        <div className="fp-toggle-row" key={row.key}>
          <div>
            <p className="fp-toggle-row__title">{row.title}</p>
            <p className="fp-toggle-row__detail">{row.detail}</p>
          </div>
          <label className="fp-switch-label">
            <input
              type="checkbox"
              className="fp-switch-input"
              checked={prefs[row.key]}
              onChange={(event) => toggle(row.key, event.target.checked)}
            />
            <span className="visually-hidden">{row.title}</span>
          </label>
        </div>
      ))}
      <p className="fp-note mt-3">
        Saved on this device only — nothing is sent to us, and your phone&rsquo;s own accessibility
        settings always win.
      </p>
    </div>
  );
}
