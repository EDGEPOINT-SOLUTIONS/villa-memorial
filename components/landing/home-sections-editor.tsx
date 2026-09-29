"use client";

/**
 * HomeSectionsEditor — the home editor, edited SECTION BY SECTION.
 *
 * The approved home-rebuild plan (2026-09-29) rebuilt `/` as seven sections; this
 * is the editor for those seven, in order, and it is the FIRST thing the Home
 * document opens on. Every element of every section is editable here: its title,
 * its lines, its actions (label + destination), its pictures (from the office's
 * media library or a device upload — the shared `MediaPicker`), its services
 * (chosen from the live catalogue), and the live bindings the plan's figures
 * read from.
 *
 * THE HONESTY RULES, MADE UI:
 *   · an amount is NEVER typed here. A section binds to the store that owns the
 *     figure (a casket model, a preparation day, a lot family + product, a plan
 *     tier) and the figure is read at render. The plan band shows the live
 *     monthlies read-only, with a link to the pricing editor;
 *   · the services band carries no amount at all (the office's minute 5);
 *   · the section 7 key is server-side configuration (`GoogleMapsKeyField`),
 *     saved to its own store, never into this document.
 *
 * The existing zones below the seven (brand, the blog's hero, the rails, the
 * about page copy, the plans board, the map copy, the blog and the FAQ) still
 * edit the other public surfaces that share this document; they are numbered
 * after the home's seven sections.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker } from "@/components/landing/editor-pickers";
import { GoogleMapsKeyField } from "@/components/landing/google-maps-key-field";
import { mediaLabel } from "@/lib/media";
import { EMBALMING_RATES, PLAN_TIERS, php } from "@/lib/villa-pricing";
import type {
  Cta,
  HomeChapel,
  HomeFact,
  HomeLotTile,
  HomeSections,
  HomeServiceTile,
} from "@/lib/api-client/landing";

/** What the editor needs from the live stores to offer real choices. */
export type HomeEditorCatalog = {
  /** The live catalogue's casket models (the 2026 sheet joined to the catalogue). */
  casketModels: ReadonlyArray<{ model: string; collection: string }>;
  /** The five a-la-carte service labels the catalogue sells. */
  services: ReadonlyArray<string>;
  /** The chapel resources on the live schedule (their capacity is a fact). */
  chapels: ReadonlyArray<{ id: string; name: string; capacity: number; kind: string | null }>;
  /** The pricing store's lot families and their product rows. */
  lotFamilies: ReadonlyArray<{
    title: string;
    caption: string;
    products: ReadonlyArray<string>;
  }>;
};

/* ------------------------------ field shells ------------------------------ */

function TextField({
  label,
  value,
  onChange,
  htmlFor,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  htmlFor: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} hint={hint}>
      <input
        id={htmlFor}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  htmlFor,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  htmlFor: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} hint={hint}>
      <textarea id={htmlFor} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function SelectField({
  label,
  value,
  onChange,
  htmlFor,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  htmlFor: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} hint={hint}>
      <select id={htmlFor} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ImageField({
  label,
  value,
  onChange,
  htmlFor,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  htmlFor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      hint={value ? `Now: ${mediaLabel(value)}` : "No photo attached yet — the band renders its engraved empty state."}
    >
      <div className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
        {value ? (
          <button type="button" className="ed-thumb-btn" onClick={() => setOpen(true)} aria-label="Change photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- attached photo */}
            <img src={value} alt="" />
          </button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <ImageIcon size={15} aria-hidden="true" /> {value ? "Change photo" : "Choose photo"}
        </Button>
        {value ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        ) : null}
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(src) => {
          onChange(src);
          setOpen(false);
        }}
      />
    </Field>
  );
}

/** A label + destination pair — every authored action in the seven sections. */
function ActionFields({
  legend,
  cta,
  onChange,
  idPrefix,
  hrefHint,
}: {
  legend: string;
  cta: Cta;
  onChange: (next: Cta) => void;
  idPrefix: string;
  hrefHint?: string;
}) {
  return (
    <fieldset className="ed-subfield">
      <legend>{legend}</legend>
      <div className="field-grid field-grid--2">
        <TextField
          label="Label"
          htmlFor={`${idPrefix}-label`}
          value={cta.label}
          onChange={(label) => onChange({ ...cta, label })}
        />
        <TextField
          label="Destination"
          htmlFor={`${idPrefix}-href`}
          value={cta.href}
          onChange={(href) => onChange({ ...cta, href })}
          hint={hrefHint}
        />
      </div>
    </fieldset>
  );
}

function RowButtons({
  onUp,
  onDown,
  onRemove,
  first,
  last,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  first: boolean;
  last: boolean;
  label: string;
}) {
  return (
    <span className="row" style={{ gap: "var(--space-1)" }}>
      <button type="button" className="ed-icon-btn" aria-label={`Move ${label} up`} disabled={first} onClick={onUp}>
        <ArrowUp size={14} aria-hidden="true" />
      </button>
      <button type="button" className="ed-icon-btn" aria-label={`Move ${label} down`} disabled={last} onClick={onDown}>
        <ArrowDown size={14} aria-hidden="true" />
      </button>
      <button type="button" className="ed-icon-btn ed-icon-btn--danger" aria-label={`Remove ${label}`} onClick={onRemove}>
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------ the editor -------------------------------- */

export function HomeSectionsEditor({
  home,
  onChange,
  catalog,
  planPricing,
}: {
  home: HomeSections;
  /** Replaces the whole `home` block — the caller owns the document state. */
  onChange: (next: HomeSections) => void;
  catalog: HomeEditorCatalog;
  /** The live monthlies the plan band prints, for the read-only price view. */
  planPricing: Readonly<
    Record<string, { monthly: number; seniorMonthly: number }>
  >;
}) {
  function update<K extends keyof HomeSections>(key: K, next: HomeSections[K]) {
    onChange({ ...home, [key]: next });
  }

  /* --- section 1 -------------------------------------------------------- */
  const gateway = home.gateway;
  function factButtons(facts: HomeFact[], index: number, id: string) {
    const current = facts[index];
    if (!current) return null;
    return (
      <RowButtons
        label={`fact ${index + 1}`}
        first={index === 0}
        last={index === facts.length - 1}
        onUp={() => update("gateway", { ...gateway, facts: moveItem(facts, index, -1) })}
        onDown={() => update("gateway", { ...gateway, facts: moveItem(facts, index, 1) })}
        onRemove={() =>
          update("gateway", { ...gateway, facts: facts.filter((entry) => entry.id !== id) })
        }
      />
    );
  }

  /* --- section 3 -------------------------------------------------------- */
  const park = home.park;
  const builder = park.builder;
  const allModels = catalog.casketModels.map((model) => model.model);
  const toggleModel = (model: string) => {
    const chosen = builder.casketModels.includes(model);
    const next = chosen
      ? builder.casketModels.filter((entry) => entry !== model)
      : allModels.filter((entry) => entry === model || builder.casketModels.includes(entry));
    update("park", { ...park, builder: { ...builder, casketModels: next } });
  };
  const toggleDay = (days: number) => {
    const chosen = builder.preparationDays.includes(days);
    const next = chosen
      ? builder.preparationDays.filter((entry) => entry !== days)
      : builder.preparationDays.concat(days).sort((a, b) => a - b);
    update("park", { ...park, builder: { ...builder, preparationDays: next } });
  };
  const chapelOptions = catalog.chapels.map((chapel) => ({
    value: chapel.id,
    label: `${chapel.name} — ${chapel.capacity} people${chapel.kind ? ` (${chapel.kind})` : ""}`,
  }));

  /* --- section 5 -------------------------------------------------------- */
  const services = home.services;
  function serviceButtons(items: HomeServiceTile[], index: number) {
    return (
      <RowButtons
        label={`service tile ${index + 1}`}
        first={index === 0}
        last={index === items.length - 1}
        onUp={() => update("services", { ...services, items: moveItem(items, index, -1) })}
        onDown={() => update("services", { ...services, items: moveItem(items, index, 1) })}
        onRemove={() =>
          update("services", { ...services, items: items.filter((entry) => entry.id !== items[index].id) })
        }
      />
    );
  }

  /* --- section 6 -------------------------------------------------------- */
  const lots = home.lots;
  function lotFamilyProducts(category: string): ReadonlyArray<string> {
    return catalog.lotFamilies.find((family) => family.title === category)?.products ?? [];
  }

  return (
    <div className="stack-4">
      {/* ============================ 1 · gateway ============================ */}
      <section className="ed-section" id="ed-home-1">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            01
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 1</p>
            <h2>The gateway</h2>
            <p className="ed-section__hint">
              The centred opening: the place, the headline, the promise and the call. The gold call
              action is bound to the 24/7 line edited under Brand &amp; 24/7 line.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <div className="field-grid field-grid--2">
            <TextField
              label="Place line"
              htmlFor="home-gateway-place"
              value={gateway.place}
              onChange={(place) => update("gateway", { ...gateway, place })}
              hint="Defaults to the location in Brand & 24/7 line."
            />
            <TextField
              label="Headline"
              htmlFor="home-gateway-headline"
              value={gateway.headline}
              onChange={(headline) => update("gateway", { ...gateway, headline })}
            />
          </div>
          <TextField
            label="Promise (the second headline line)"
            htmlFor="home-gateway-promise"
            value={gateway.promise}
            onChange={(promise) => update("gateway", { ...gateway, promise })}
            hint="Painted in the sky ink under the headline."
          />
          <TextAreaField
            label="Lead"
            htmlFor="home-gateway-lead"
            value={gateway.lead}
            onChange={(lead) => update("gateway", { ...gateway, lead })}
            rows={2}
          />
          <ActionFields
            legend="Supporting action (the call action is the 24/7 line)"
            cta={gateway.secondary}
            onChange={(secondary) => update("gateway", { ...gateway, secondary })}
            idPrefix="home-gateway-secondary"
          />
          <div className="stack-3">
            <p className="ed-section__kicker">Trust facts</p>
            {gateway.facts.map((fact, index) => (
              <div className="ed-card-row" key={fact.id}>
                <div className="field-grid field-grid--2" style={{ flex: 1 }}>
                  <TextField
                    label={`Fact ${index + 1} label`}
                    htmlFor={`home-fact-${fact.id}-label`}
                    value={fact.label}
                    onChange={(label) =>
                      update("gateway", {
                        ...gateway,
                        facts: gateway.facts.map((entry) =>
                          entry.id === fact.id ? { ...entry, label } : entry,
                        ),
                      })
                    }
                  />
                  <TextField
                    label="Supporting line"
                    htmlFor={`home-fact-${fact.id}-note`}
                    value={fact.note}
                    onChange={(note) =>
                      update("gateway", {
                        ...gateway,
                        facts: gateway.facts.map((entry) =>
                          entry.id === fact.id ? { ...entry, note } : entry,
                        ),
                      })
                    }
                  />
                </div>
                {factButtons(gateway.facts, index, fact.id)}
              </div>
            ))}
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update("gateway", {
                    ...gateway,
                    facts: gateway.facts.concat({
                      id: uniqueId("fact"),
                      label: "New fact",
                      note: "",
                    }),
                  })
                }
              >
                <Plus size={14} aria-hidden="true" /> Add a trust fact
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================= 2 · hero photograph ======================= */}
      <section className="ed-section" id="ed-home-2">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            02
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 2</p>
            <h2>The hero photograph</h2>
            <p className="ed-section__hint">
              The client&apos;s photograph, alone and whole. The page never crops it — the frame takes
              the picture&apos;s own shape.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <ImageField
            label="Photograph"
            htmlFor="home-photo-image"
            value={home.photo.image}
            onChange={(image) => update("photo", { ...home.photo, image })}
          />
          <TextField
            label="Alt text"
            htmlFor="home-photo-alt"
            value={home.photo.alt}
            onChange={(alt) => update("photo", { ...home.photo, alt })}
            hint="Describe what the photograph shows — required whenever a picture is published."
          />
        </div>
      </section>

      {/* ====================== 3 · the first park ========================== */}
      <section className="ed-section" id="ed-home-3">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            03
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 3</p>
            <h2>The first park · photograph, builder, chapels</h2>
            <p className="ed-section__hint">
              The park photograph with the arrangement builder beside it and the two chapels under
              it. The builder&apos;s figures are read live — the casket models come from the
              catalogue, the preparation days and chapel rates from the 2026 sheets.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <ImageField
            label="Park photograph"
            htmlFor="home-park-image"
            value={park.image}
            onChange={(image) => update("park", { ...park, image })}
          />
          <TextField
            label="Park photograph alt text"
            htmlFor="home-park-alt"
            value={park.imageAlt}
            onChange={(imageAlt) => update("park", { ...park, imageAlt })}
          />

          <fieldset className="ed-subfield">
            <legend>The arrangement builder</legend>
            <div className="field-grid field-grid--2">
              <TextField
                label="Title"
                htmlFor="home-builder-title"
                value={builder.title}
                onChange={(title) => update("park", { ...park, builder: { ...builder, title } })}
              />
              <TextField
                label="Closing action label"
                htmlFor="home-builder-secondary-label"
                value={builder.secondary.label}
                onChange={(label) =>
                  update("park", {
                    ...park,
                    builder: { ...builder, secondary: { ...builder.secondary, label } },
                  })
                }
              />
            </div>
            <TextAreaField
              label="Note"
              htmlFor="home-builder-note"
              value={builder.note}
              onChange={(note) => update("park", { ...park, builder: { ...builder, note } })}
              rows={2}
            />
            <TextField
              label="Closing action destination"
              htmlFor="home-builder-secondary-href"
              value={builder.secondary.href}
              onChange={(href) =>
                update("park", {
                  ...park,
                  builder: { ...builder, secondary: { ...builder.secondary, href } },
                })
              }
            />
            <Field
              label="Casket choices (from the live catalogue)"
              htmlFor="home-builder-caskets"
              hint="The model's price is read from the catalogue at render — never typed here."
            >
              <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                {catalog.casketModels.map((model) => (
                  <label key={model.model} className="row" style={{ gap: "var(--space-2)" }}>
                    <input
                      type="checkbox"
                      checked={builder.casketModels.includes(model.model)}
                      onChange={() => toggleModel(model.model)}
                    />
                    <span className="text-sm">
                      {model.model} <span className="text-muted">· {model.collection}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <Field
              label="Preparation days (the 2026 sheet's ladder)"
              htmlFor="home-builder-days"
              hint="Every row's figure is the sheet's own."
            >
              <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                {EMBALMING_RATES.map((row) => (
                  <label key={row.days} className="row" style={{ gap: "var(--space-2)" }}>
                    <input
                      type="checkbox"
                      checked={builder.preparationDays.includes(row.days)}
                      onChange={() => toggleDay(row.days)}
                    />
                    <span className="text-sm">
                      {row.days} days <span className="text-muted">· {php(row.amount)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="row row--wrap" style={{ gap: "var(--space-4)" }}>
              <label className="row" style={{ gap: "var(--space-2)" }}>
                <input
                  type="checkbox"
                  checked={builder.includeChapel}
                  onChange={() => update("park", { ...park, builder: { ...builder, includeChapel: !builder.includeChapel } })}
                />
                <span className="text-sm">Show the chapel choices (with the sheet&apos;s ₱1,000 fee)</span>
              </label>
              <label className="row" style={{ gap: "var(--space-2)" }}>
                <input
                  type="checkbox"
                  checked={builder.includeServices}
                  onChange={() => update("park", { ...park, builder: { ...builder, includeServices: !builder.includeServices } })}
                />
                <span className="text-sm">Show the five-services line</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="ed-subfield">
            <legend>The two chapels</legend>
            {park.chapels.map((chapel, index) => (
              <div className="ed-card" key={chapel.id}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <p className="ed-card__title">Chapel card {index + 1}</p>
                  <RowButtons
                    label={`chapel ${index + 1}`}
                    first={index === 0}
                    last={index === park.chapels.length - 1}
                    onUp={() => update("park", { ...park, chapels: moveItem(park.chapels, index, -1) })}
                    onDown={() => update("park", { ...park, chapels: moveItem(park.chapels, index, 1) })}
                    onRemove={() =>
                      update("park", {
                        ...park,
                        chapels: park.chapels.filter((entry) => entry.id !== chapel.id),
                      })
                    }
                  />
                </div>
                <SelectField
                  label="Chapel (from the live schedule)"
                  htmlFor={`home-chapel-${chapel.id}-resource`}
                  value={chapel.resourceId ?? ""}
                  options={[{ value: "", label: "Not bound — all fields free text" }].concat(chapelOptions)}
                  onChange={(resourceId) => {
                    const resource = catalog.chapels.find((entry) => entry.id === resourceId);
                    update("park", {
                      ...park,
                      chapels: park.chapels.map((entry) =>
                        entry.id === chapel.id
                          ? {
                              ...entry,
                              resourceId: resourceId || null,
                              name: resource ? resource.name : entry.name,
                            }
                          : entry,
                      ),
                    });
                  }}
                  hint="Binding supplies the name and the capacity sentence; leave unbound to write both yourself."
                />
                <div className="field-grid field-grid--2">
                  <TextField
                    label="Name"
                    htmlFor={`home-chapel-${chapel.id}-name`}
                    value={chapel.name}
                    onChange={(name) =>
                      update("park", {
                        ...park,
                        chapels: park.chapels.map((entry) =>
                          entry.id === chapel.id ? { ...entry, name } : entry,
                        ),
                      })
                    }
                  />
                  <TextField
                    label="Class line"
                    htmlFor={`home-chapel-${chapel.id}-kind`}
                    value={chapel.kind}
                    onChange={(kind) =>
                      update("park", {
                        ...park,
                        chapels: park.chapels.map((entry) =>
                          entry.id === chapel.id ? { ...entry, kind } : entry,
                        ),
                      })
                    }
                  />
                </div>
                <TextField
                  label="What it is"
                  htmlFor={`home-chapel-${chapel.id}-what`}
                  value={chapel.what}
                  onChange={(what) =>
                    update("park", {
                      ...park,
                      chapels: park.chapels.map((entry) =>
                        entry.id === chapel.id ? { ...entry, what } : entry,
                      ),
                    })
                  }
                  hint="The capacity sentence is added from the live chapel record when one is bound."
                />
                <ImageField
                  label="Photograph"
                  htmlFor={`home-chapel-${chapel.id}-image`}
                  value={chapel.image}
                  onChange={(image) =>
                    update("park", {
                      ...park,
                      chapels: park.chapels.map((entry) =>
                        entry.id === chapel.id ? { ...entry, image } : entry,
                      ),
                    })
                  }
                />
                <TextField
                  label="Caption"
                  htmlFor={`home-chapel-${chapel.id}-caption`}
                  value={chapel.caption}
                  onChange={(caption) =>
                    update("park", {
                      ...park,
                      chapels: park.chapels.map((entry) =>
                        entry.id === chapel.id ? { ...entry, caption } : entry,
                      ),
                    })
                  }
                  hint="The illustration-purposes line the client's own sheet prints — required with a photograph."
                />
              </div>
            ))}
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  update("park", {
                    ...park,
                    chapels: park.chapels.concat({
                      id: uniqueId("chapel"),
                      resourceId: null,
                      name: "New chapel",
                      kind: "",
                      what: "",
                      image: null,
                      caption: "Illustration purposes only — sample set-up.",
                    } satisfies HomeChapel),
                  })
                }
              >
                <Plus size={14} aria-hidden="true" /> Add a chapel card
              </Button>
            </div>
            <ActionFields
              legend="The chapels' action"
              cta={park.chapelsAction}
              onChange={(chapelsAction) => update("park", { ...park, chapelsAction })}
              idPrefix="home-chapels-action"
            />
          </fieldset>
        </div>
      </section>

      {/* ======================= 4 · Villa Memorial Plan ==================== */}
      <section className="ed-section" id="ed-home-4">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            04
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 4</p>
            <h2>Villa Memorial Plan</h2>
            <p className="ed-section__hint">
              Five rising tiers with the live monthly rate and the sheet&apos;s own line about what
              separates each one. Prices are read from the pricing store — edit them in Plans &amp;
              pricing, never here.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <TextField
            label="Heading"
            htmlFor="home-plans-heading"
            value={home.plans.heading}
            onChange={(heading) => update("plans", { ...home.plans, heading })}
          />
          <ActionFields
            legend="Band action"
            cta={home.plans.action}
            onChange={(action) => update("plans", { ...home.plans, action })}
            idPrefix="home-plans-action"
          />
          <table className="table">
            <caption className="text-sm text-muted" style={{ textAlign: "left", paddingBottom: "var(--space-2)" }}>
              Live from the pricing store (read-only here)
            </caption>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Monthly</th>
                <th>Senior monthly</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_TIERS.map((tier) => {
                const rate = planPricing[tier.id];
                return (
                  <tr key={tier.id}>
                    <td>{tier.name}</td>
                    <td>{rate ? php(rate.monthly) : "—"}</td>
                    <td>{rate ? php(rate.seniorMonthly) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            <a href="/staff/plans">Edit the plan rates</a> ·{" "}
            <a href="/staff/pricing">Edit the lot prices</a>
          </p>
        </div>
      </section>

      {/* ====================== 5 · Funeraria services ====================== */}
      <section className="ed-section" id="ed-home-5">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            05
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 5</p>
            <h2>Funeraria Memorial Services</h2>
            <p className="ed-section__hint">
              Five equal photographic tiles, a request under each, and one centred request for all
              five. NO amount on this band — the office&apos;s own minute 5. Each tile binds to a
              live catalogue service.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <TextField
            label="Heading"
            htmlFor="home-services-heading"
            value={services.heading}
            onChange={(heading) => update("services", { ...services, heading })}
          />
          <ActionFields
            legend="Band action"
            cta={services.action}
            onChange={(action) => update("services", { ...services, action })}
            idPrefix="home-services-action"
          />
          <ActionFields
            legend="The one all-five quote action"
            cta={services.allQuote}
            onChange={(allQuote) => update("services", { ...services, allQuote })}
            idPrefix="home-services-all"
          />
          {services.items.map((tile, index) => (
            <div className="ed-card" key={tile.id}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <p className="ed-card__title">Tile {index + 1}</p>
                {serviceButtons(services.items, index)}
              </div>
              <div className="field-grid field-grid--2">
                <SelectField
                  label="Service (from the live catalogue)"
                  htmlFor={`home-service-${tile.id}-service`}
                  value={tile.service}
                  options={catalog.services.map((service) => ({ value: service, label: service }))}
                  onChange={(service) =>
                    update("services", {
                      ...services,
                      items: services.items.map((entry) =>
                        entry.id === tile.id ? { ...entry, service } : entry,
                      ),
                    })
                  }
                  hint="The catalogue's own label — the figure for it is never printed on the home."
                />
                <TextField
                  label="Tile name"
                  htmlFor={`home-service-${tile.id}-label`}
                  value={tile.label}
                  onChange={(label) =>
                    update("services", {
                      ...services,
                      items: services.items.map((entry) =>
                        entry.id === tile.id ? { ...entry, label } : entry,
                      ),
                    })
                  }
                />
              </div>
              <ImageField
                label="Photograph"
                htmlFor={`home-service-${tile.id}-image`}
                value={tile.image}
                onChange={(image) =>
                  update("services", {
                    ...services,
                    items: services.items.map((entry) =>
                      entry.id === tile.id ? { ...entry, image } : entry,
                    ),
                  })
                }
              />
              <TextField
                label="Alt text"
                htmlFor={`home-service-${tile.id}-alt`}
                value={tile.imageAlt}
                onChange={(imageAlt) =>
                  update("services", {
                    ...services,
                    items: services.items.map((entry) =>
                      entry.id === tile.id ? { ...entry, imageAlt } : entry,
                    ),
                  })
                }
              />
              <ActionFields
                legend="Request action"
                cta={tile.quote}
                onChange={(quote) =>
                  update("services", {
                    ...services,
                    items: services.items.map((entry) =>
                      entry.id === tile.id ? { ...entry, quote } : entry,
                    ),
                  })
                }
                idPrefix={`home-service-${tile.id}-quote`}
              />
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                update("services", {
                  ...services,
                  items: services.items.concat({
                    id: uniqueId("svc"),
                    service: catalog.services[0] ?? "Retrieval",
                    label: "New service",
                    image: null,
                    imageAlt: "",
                    quote: { label: "Request a quote", href: "/quote" },
                  } satisfies HomeServiceTile),
                })
              }
            >
              <Plus size={14} aria-hidden="true" /> Add a service tile
            </Button>
          </div>
        </div>
      </section>

      {/* ======================= 6 · Villa Memorial Park =================== */}
      <section className="ed-section" id="ed-home-6">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            06
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 6</p>
            <h2>Villa Memorial Park</h2>
            <p className="ed-section__hint">
              The four lot types beside the park map, with every recorded plot pinned at its own
              recorded coordinates. Each tile binds to a live lot family + product row; the figures
              under the map are read from the pricing store. The app holds no park coordinates of
              its own — the pins are the plots&apos; own outlines.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <TextField
            label="Heading"
            htmlFor="home-lots-heading"
            value={lots.heading}
            onChange={(heading) => update("lots", { ...lots, heading })}
          />
          <ActionFields
            legend="Band action"
            cta={lots.action}
            onChange={(action) => update("lots", { ...lots, action })}
            idPrefix="home-lots-action"
          />
          <ActionFields
            legend="The detail panel's request action"
            cta={lots.quote}
            onChange={(quote) => update("lots", { ...lots, quote })}
            idPrefix="home-lots-quote"
          />
          {lots.items.map((tile: HomeLotTile, index) => {
            const products = lotFamilyProducts(tile.category);
            return (
              <div className="ed-card" key={tile.id}>
                <p className="ed-card__title">Lot type {index + 1}</p>
                <div className="field-grid field-grid--2">
                  <SelectField
                    label="Lot family (the pricing store)"
                    htmlFor={`home-lot-${tile.id}-category`}
                    value={tile.category}
                    options={catalog.lotFamilies.map((family) => ({
                      value: family.title,
                      label: `${family.title} — ${family.caption}`,
                    }))}
                    onChange={(category) => {
                      const nextProducts = lotFamilyProducts(category);
                      update("lots", {
                        ...lots,
                        items: lots.items.map((entry) =>
                          entry.id === tile.id
                            ? { ...entry, category, product: nextProducts[0] ?? "" }
                            : entry,
                        ),
                      });
                    }}
                  />
                  <SelectField
                    label="Product row"
                    htmlFor={`home-lot-${tile.id}-product`}
                    value={tile.product}
                    options={products.map((product) => ({ value: product, label: product }))}
                    onChange={(product) =>
                      update("lots", {
                        ...lots,
                        items: lots.items.map((entry) =>
                          entry.id === tile.id ? { ...entry, product } : entry,
                        ),
                      })
                    }
                  />
                </div>
                <TextField
                  label="Tile name"
                  htmlFor={`home-lot-${tile.id}-label`}
                  value={tile.label}
                  onChange={(label) =>
                    update("lots", {
                      ...lots,
                      items: lots.items.map((entry) =>
                        entry.id === tile.id ? { ...entry, label } : entry,
                      ),
                    })
                  }
                />
                <ImageField
                  label="Photograph (falls back to the client's own photo for the bound family)"
                  htmlFor={`home-lot-${tile.id}-image`}
                  value={tile.image}
                  onChange={(image) =>
                    update("lots", {
                      ...lots,
                      items: lots.items.map((entry) =>
                        entry.id === tile.id ? { ...entry, image } : entry,
                      ),
                    })
                  }
                />
                <TextField
                  label="Alt text"
                  htmlFor={`home-lot-${tile.id}-alt`}
                  value={tile.imageAlt}
                  onChange={(imageAlt) =>
                    update("lots", {
                      ...lots,
                      items: lots.items.map((entry) =>
                        entry.id === tile.id ? { ...entry, imageAlt } : entry,
                      ),
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================ 7 · contact ========================== */}
      <section className="ed-section" id="ed-home-7">
        <header className="ed-section__head">
          <span className="ed-section__num" aria-hidden="true">
            07
          </span>
          <div className="ed-section__title">
            <p className="ed-section__kicker">Home · section 7</p>
            <h2>Contact</h2>
            <p className="ed-section__hint">
              The enquiry form — the same one /contact uses, with the Data Privacy Act consent line —
              beside the embedded Google map of the park. The form&apos;s words are the contact
              page&apos;s; the map&apos;s key is stored below.
            </p>
          </div>
        </header>
        <div className="ed-section__body">
          <div className="field-grid field-grid--2">
            <TextField
              label="Heading"
              htmlFor="home-contact-heading"
              value={home.contact.heading}
              onChange={(heading) => update("contact", { ...home.contact, heading })}
            />
            <TextField
              label="Directions action label"
              htmlFor="home-contact-directions"
              value={home.contact.directionsLabel}
              onChange={(directionsLabel) => update("contact", { ...home.contact, directionsLabel })}
              hint="Opens the recorded park address in Google Maps — the destination is never typed."
            />
          </div>
          <TextAreaField
            label="Lead"
            htmlFor="home-contact-lead"
            value={home.contact.lead}
            onChange={(lead) => update("contact", { ...home.contact, lead })}
            rows={2}
          />
          <TextField
            label="Map title"
            htmlFor="home-contact-map-title"
            value={home.contact.mapTitle}
            onChange={(mapTitle) => update("contact", { ...home.contact, mapTitle })}
          />
          <TextAreaField
            label="Map note"
            htmlFor="home-contact-map-note"
            value={home.contact.mapNote}
            onChange={(mapNote) => update("contact", { ...home.contact, mapNote })}
            rows={2}
            hint="The honesty line under the map — what the pin is, and what the app does not hold."
          />
          <fieldset className="ed-subfield">
            <legend>Google map key (stored server-side)</legend>
            <GoogleMapsKeyField />
          </fieldset>
        </div>
      </section>
    </div>
  );
}
