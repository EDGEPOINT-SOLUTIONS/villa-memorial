"use client";

/**
 * Hero background colour changer — the hero zone (02) control of the Landing
 * Page editor (captain's brief, 2026-09-17): "adjust the transparency of the
 * hero section from 0% to 100% and the background colour use a beautiful
 * colour changer".
 *
 * What it offers staff, in one folio card:
 *  - a palette of the SITE'S OWN brand colours (lib/landing/hero-background.ts,
 *    pinned to styles/tokens.css by a unit test — never hand-typed values);
 *  - a free colour input: a text field (hex / rgb()/hsl() / named colour,
 *    live-validated with a clear message) plus the native colour picker;
 *  - a live preview of the actual hero look — the shipped sky gradient under
 *    the chosen colour at the chosen transparency;
 *  - the 0–100% transparency slider with its value always shown.
 *
 * Everything saves through the same draft/publish path as the rest of the
 * document: this control only patches the hero fields on the editor's state.
 */
import { useEffect, useId, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  HERO_BACKGROUND_DEFAULT_COLOUR,
  HERO_BACKGROUND_PALETTE,
  isValidCssColor,
  readHeroTransparency,
  heroBackgroundLayer,
  heroBackgroundPick,
} from "@/lib/landing/hero-background";

const HEX6 = /^#[0-9a-f]{6}$/i;

export function HeroBackgroundField({
  hero,
  onChange,
}: {
  /** Any hero carrying the two background fields (the landing hero or a page document's hero). */
  hero: { background: string | null; backgroundTransparency: number };
  onChange: (patch: { background?: string | null; backgroundTransparency?: number }) => void;
}) {
  const ids = useId();
  const colourId = `${ids}-colour`;
  const transparencyId = `${ids}-transparency`;

  // The free-text field keeps what staff typed (so an invalid value can be
  // shown + corrected); the document only carries the trimmed text.
  const [text, setText] = useState(hero.background ?? "");
  useEffect(() => {
    setText(hero.background ?? "");
  }, [hero.background]);

  const colour = text.trim();
  const invalid = colour.length > 0 && !isValidCssColor(colour);
  const transparency = readHeroTransparency(hero.backgroundTransparency);
  const layer = heroBackgroundLayer({ background: colour, backgroundTransparency: transparency });
  const pickerValue = HEX6.test(colour) ? colour : HERO_BACKGROUND_DEFAULT_COLOUR;

  function type(value: string) {
    setText(value);
    onChange({ background: value.trim() || null });
  }

  function choose(value: string) {
    setText(value);
    onChange(heroBackgroundPick({ background: colour || null, backgroundTransparency: transparency }, value));
  }

  function clear() {
    setText("");
    onChange({ background: null });
  }

  return (
    <Field
      label="Hero background colour"
      htmlFor={colourId}
      hint="Painted over the background photo and its scrim, under the hero text. Leave empty for the shipped sky gradient."
    >
      <div className="ed-hero-bg">
        <div className="ed-hero-bg__inputs">
          <input
            id={colourId}
            className="ed-hero-bg__colour"
            type="text"
            value={text}
            spellCheck={false}
            autoComplete="off"
            placeholder={`${HERO_BACKGROUND_DEFAULT_COLOUR} or skyblue`}
            aria-invalid={invalid || undefined}
            aria-errormessage={invalid ? `${colourId}-error` : undefined}
            onChange={(e) => type(e.target.value)}
          />
          <input
            className="ed-hero-bg__picker"
            type="color"
            aria-label="Pick the hero background colour"
            value={pickerValue}
            onChange={(e) => choose(e.target.value)}
          />
          {hero.background ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              <RotateCcw size={14} aria-hidden="true" /> Shipped gradient
            </Button>
          ) : null}
        </div>

        {invalid ? (
          <span className="field__error" id={`${colourId}-error`} role="alert">
            That isn&rsquo;t a valid CSS colour — use a hex value like #3f97d1, rgb(…), hsl(…) or a
            named colour.
          </span>
        ) : null}

        <div className="ed-hero-bg__palette" role="group" aria-label="Brand colours">
          {HERO_BACKGROUND_PALETTE.map((entry) => {
            const active = colour.toLowerCase() === entry.value.toLowerCase();
            return (
              <button
                key={entry.token}
                type="button"
                className={`ed-hero-bg__swatch${active ? " ed-hero-bg__swatch--active" : ""}`}
                style={{ background: entry.value }}
                aria-pressed={active}
                aria-label={`${entry.name} — ${entry.value}`}
                title={`${entry.name} (${entry.token})`}
                onClick={() => choose(entry.value)}
              >
                {active ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="ed-hero-bg__preview" aria-hidden="true">
          <span
            className="ed-hero-bg__preview-fill"
            style={layer ? { background: layer.background, opacity: layer.opacity } : undefined}
          />
        </div>

        <div className="ed-hero-bg__transparency">
          <label htmlFor={transparencyId}>Transparency</label>
          <input
            id={transparencyId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={transparency}
            aria-valuetext={`${transparency}% transparent`}
            onChange={(e) => onChange({ backgroundTransparency: Number(e.target.value) })}
          />
          <span className="ed-hero-bg__value">{transparency}%</span>
        </div>

        <p className="ed-hint">
          {layer
            ? `Previewing ${layer.background} at ${transparency}% transparency over the shipped sky gradient. 0% is solid, 100% leaves the hero untouched.`
            : transparency >= 100
              ? "100% transparency — the colour layer is invisible. Slide down to paint it, and keep the navy hero copy readable (very dark colours may hide it)."
              : "Pick a colour above to use the transparency."}
        </p>
      </div>
    </Field>
  );
}
