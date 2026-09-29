"use client";

/**
 * Content editor (staff /staff/landing) — the premium surface for every public
 * page that renders from the LandingPage content document: the anchored
 * catalogue home (/) and the FAQ page (/faq). Every region of both pages is
 * editable here and saves through the BFF (POST /api/landing/content), which
 * validates + persists into the same fixture store the public pages render
 * from.
 *
 * Structure (blue/gold folio, design-system tokens only):
 *  - a sticky document console: sync state + Publish/Discard always in reach;
 *  - a section navigator that mirrors the page order (map BEFORE the newsfeed —
 *    the captain-approved reading order) with live counts and attention flags;
 *  - one numbered folio card per content zone, grouped so staff flow top-down.
 *
 * Image sources are three-fold everywhere: the uploaded photo library, a REAL
 * device upload (components/landing/device-uploader.tsx — stored through the
 * same fixture-store save path, no backend), or a public image URL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker, RailPicker } from "@/components/landing/editor-pickers";
import { HeroBackgroundField } from "@/components/landing/hero-background-field";
import type { CatalogueEntry } from "@/lib/landing/catalogue";
import {
  type AboutSection,
  type BlogPost,
  type Cta,
  type FaqItem,
  type FaqSection,
  type LandingContent,
  type MediaItem,
  type PlanLotCard,
  type PlanLotKind,
  type PlansLotsSection,
  type PlansSection,
} from "@/lib/api-client/landing";
import { mediaLabel } from "@/lib/media";
import { isValidCssColor } from "@/lib/landing/hero-background";
import { planLotCardFigures } from "@/lib/landing/plan-lots";
import { type LotCategory, type PlanPricing } from "@/lib/pricing-model";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  LOT_PRICE_CATEGORIES,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_PAYMENTS,
} from "@/lib/villa-pricing";
import { planRateOf } from "@/lib/pricing-model";
import {
  HomeSectionsEditor,
  type HomeEditorCatalog,
} from "@/components/landing/home-sections-editor";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------ tiny helpers ------------------------------ */

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
      <input id={htmlFor} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
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
      <textarea id={htmlFor} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** One select in the standard field shell — the editor's pickers (a card's
 * icon, the 2026 lot family a card prices from) read their options from the
 * model/villa-pricing, never from a hand-typed list in the view. */
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
      <select id={htmlFor} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
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
    <Field label={label} htmlFor={htmlFor} hint={value ? `Now: ${mediaLabel(value)}` : "No photo attached yet."}>
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
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={(src) => { onChange(src); setOpen(false); }} />
    </Field>
  );
}

function MoveRowButtons({
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

/* ------------------------------ section shells ---------------------------- */

function EdSection({
  num,
  title,
  hint,
  children,
  badge,
  id,
}: {
  num: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="ed-section" id={id}>
      <header className="ed-section__head">
        <span className="ed-section__num" aria-hidden="true">
          {num}
        </span>
        <div className="ed-section__title">
          <p className="ed-section__kicker">Content section</p>
          <h2>{title}</h2>
          {hint ? <p className="ed-section__hint">{hint}</p> : null}
        </div>
        {badge ? <div className="ed-section__badge">{badge}</div> : null}
      </header>
      <div className="ed-section__body">{children}</div>
    </section>
  );
}

/** Small count chip used in card headers + the navigator. */
function CountChip({ count, tone = "neutral" }: { count: number; tone?: "neutral" | "warn" }) {
  if (count === 0 && tone === "neutral") return null;
  return (
    <span className={`ed-chip${tone === "warn" ? " ed-chip--warn" : ""}`}>
      {count > 0 ? count : "—"}
    </span>
  );
}

/* ------------------------------ rail editor ------------------------------- */

function RailEditor({
  side,
  config,
  lotCategories,
  planPricing,
  onChange,
}: {
  side: "left" | "right";
  config: LandingContent["rails"]["left"];
  /** LIVE pricing slices for the picker's derived price lines. */
  lotCategories?: LotCategory[];
  planPricing?: PlanPricing;
  onChange: (next: LandingContent["rails"]["left"]) => void;
}) {
  const [picking, setPicking] = useState(false);

  function move(index: number, delta: -1 | 1) {
    const next = clone(config);
    const target = index + delta;
    if (target < 0 || target >= next.items.length) return;
    const [item] = next.items.splice(index, 1);
    next.items.splice(target, 0, item);
    onChange(next);
  }

  function remove(index: number) {
    const next = clone(config);
    next.items.splice(index, 1);
    onChange(next);
  }

  /**
   * The rail carries at most ONE oversized lead image: toggling an item on
   * clears every other item's lead state (the model's tolerant reader keeps the
   * first featured item, so the editor never records a second one).
   */
  function toggleLead(index: number) {
    const next = clone(config);
    next.items = next.items.map((item, i) => ({
      ...item,
      featured: i === index ? !item.featured : false,
    }));
    onChange(next);
  }

  function add(entry: CatalogueEntry) {
    const next = clone(config);
    next.items.push({
      id: uid("pin"),
      kind: entry.kind,
      title: entry.title,
      caption: entry.caption,
      price: entry.price,
      image: entry.image,
      href: entry.href,
      featured: false,
    });
    onChange(next);
    setPicking(false);
  }

  /** Bulk pin — one step for several catalogue picks (rails are unlimited). */
  function addMany(entries: CatalogueEntry[]) {
    if (entries.length === 0) return;
    const next = clone(config);
    next.items.push(
      ...entries.map((entry) => ({
        id: uid("pin"),
        kind: entry.kind,
        title: entry.title,
        caption: entry.caption,
        price: entry.price,
        image: entry.image,
        href: entry.href,
        featured: false,
      })),
    );
    onChange(next);
    setPicking(false);
  }

  return (
    <div className="ed-rail">
      <div className="row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <span className={`rail-side-mark rail-side-mark--${side}`} aria-hidden="true" />
        <p className="ed-subhead" style={{ margin: 0 }}>
          {side === "left" ? "Left rail — care & services" : "Right rail — plans & lots"}
        </p>
        <CountChip count={config.items.length} />
      </div>

      <div className="field-grid field-grid--2">
        <TextField
          label={`${side === "left" ? "Left" : "Right"} rail heading`}
          htmlFor={`rail-${side}-heading`}
          value={config.heading}
          onChange={(v) => onChange({ ...config, heading: v })}
          hint="The small heading visitors see above the pinned items."
        />
      </div>

      <div className="row row--space" style={{ margin: "var(--space-1) 0 var(--space-1)" }}>
        <p className="ed-hint">
          Unlimited — the rail scrolls, so pin as many real services, plans, products or links as
          you want. Visitors see them in exactly this order. Mark ONE item per rail as “Lead” to
          make it the oversized photo card at the top of that rail.
        </p>
        <Button variant="accent" size="sm" onClick={() => setPicking(true)}>
          <Plus size={15} aria-hidden="true" /> Pin an item
        </Button>
      </div>

      {config.items.length === 0 ? (
        <p className="ed-hint">Nothing pinned to this rail yet — visitors will see the heading alone.</p>
      ) : (
        <ul className="ed-pinned">
          {config.items.map((item, i) => (
            <li key={item.id} className="ed-pinned__row">
              <span className="rail-thumb">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pinned photo
                  <img src={item.image} alt="" loading="lazy" />
                ) : (
                  <span className="rail-thumb--fallback" aria-hidden="true">{(item.title.charAt(0) || "•").toUpperCase()}</span>
                )}
              </span>
              <span className="ed-pinned__text">
                <span className="ed-pinned__title">{item.title}</span>
                <span className="ed-pinned__meta">
                  <span className="ed-kind">{item.kind}</span>
                  {item.price ? <span className="ed-price">{item.price}</span> : null}
                  {item.caption ? <span className="ed-muted"> · {item.caption}</span> : null}
                </span>
              </span>
              <button
                type="button"
                className={`ed-lead-toggle${item.featured ? " ed-lead-toggle--on" : ""}`}
                aria-pressed={item.featured}
                title={
                  item.featured
                    ? "This is the rail's lead image — click to return it to a compact row"
                    : "Show this item as the rail's one oversized lead image"
                }
                onClick={() => toggleLead(i)}
              >
                Lead
              </button>
              <MoveRowButtons
                label={item.title}
                first={i === 0}
                last={i === config.items.length - 1}
                onUp={() => move(i, -1)}
                onDown={() => move(i, 1)}
                onRemove={() => remove(i)}
              />
            </li>
          ))}
        </ul>
      )}

      <RailPicker
        open={picking}
        side={side}
        lotCategories={lotCategories}
        planPricing={planPricing}
        onClose={() => setPicking(false)}
        onAdd={add}
        onAddMany={addMany}
      />
    </div>
  );
}

/* ------------------------- plan board copy editor ------------------------- */

/**
 * "Plan ahead" — the Villa Memorial Plan board. The board itself (the promo
 * figure, the payment-mode switch, five tiers × four terms and the underwriting
 * logos) is rendered live from lib/villa-pricing.ts and has nothing to type;
 * staff own the kicker, heading, intro and footnote.
 */
function PlanBoardEditor({
  section,
  onChange,
}: {
  section: PlansSection;
  onChange: (next: PlansSection) => void;
}) {
  return (
    <div className="stack">
      <div className="field-grid field-grid--3">
        <TextField label="Section kicker" htmlFor="plans-kicker" value={section.kicker} onChange={(v) => onChange({ ...section, kicker: v })} hint="The small line above the heading." />
        <TextField label="Section heading" htmlFor="plans-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <TextField label="Section intro" htmlFor="plans-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
      </div>
      <TextAreaField
        label="Footnote under the board"
        htmlFor="plans-note"
        rows={3}
        value={section.note ?? ""}
        onChange={(v) => onChange({ ...section, note: v.trim() ? v : null })}
        hint="Shown in small type beside the logos. {seniorMonthly} prints the real senior-citizen monthly rate and {packagePage} becomes the link to the package page — never type an amount."
      />
      <p className="ed-hint">
        The board&rsquo;s five tiers × four terms, the payment-mode switch and the promo card are
        read live from the client&rsquo;s 2026 payment-mode tables in{" "}
        <strong>lib/villa-pricing.ts</strong> — there is nothing to type, and the figures can never
        drift from the price list.
      </p>
    </div>
  );
}

/* --------------------------- plans & lots editor -------------------------- */

/**
 * "Memorial plans & garden lots" — the home band's cards. Staff own the name,
 * the photo, the link, the type word and a plan's supporting line; every figure
 * is DERIVED from a live price source the card binds to (a 2026 lot family +
 * product row, or one of the five plan tiers) through lib/landing/plan-lots.ts.
 * No amount is ever typed in this editor.
 */
const PLAN_LOT_KIND_OPTIONS: ReadonlyArray<{ value: PlanLotKind; label: string }> = [
  { value: "lot", label: "Garden lot" },
  { value: "structure", label: "Structure" },
  { value: "plan", label: "Life plan" },
];

function PlansLotsEditor({
  section,
  lotCategories,
  planPricing,
  onChange,
}: {
  section: PlansLotsSection;
  /** LIVE lot families from the pricing store — every lot card's price reads these. */
  lotCategories: ReadonlyArray<LotCategory>;
  /** LIVE plan tables — every plan card's monthly rate reads these. */
  planPricing: PlanPricing;
  onChange: (next: PlansLotsSection) => void;
}) {
  function patchCard(id: string, patch: Partial<PlanLotCard>) {
    onChange({ ...section, items: section.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }
  function move(id: string, delta: -1 | 1) {
    const items = clone(section.items);
    const from = items.findIndex((c) => c.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const [card] = items.splice(from, 1);
    items.splice(to, 0, card);
    onChange({ ...section, items });
  }
  /** Switching a card's type word keeps its live binding valid (a lot card can
   * never point at a plan tier, and vice versa). */
  function changeKind(card: PlanLotCard, kind: PlanLotKind) {
    if (kind === "plan") {
      patchCard(card.id, {
        kind,
        tier: PLAN_TIERS.some((t) => t.id === card.tier) ? card.tier : PLAN_TIERS[0].id,
        href: card.href || "/plans",
      });
      return;
    }
    const family = lotCategories.find((c) => c.title === card.category) ?? lotCategories[0];
    patchCard(card.id, {
      kind,
      category: family?.title ?? "",
      product: family?.rows.some((r) => r.product === card.product)
        ? card.product
        : family?.rows[0]?.product ?? "",
      href: card.href || "/lots",
    });
  }
  function addCard() {
    const family = lotCategories[0];
    onChange({
      ...section,
      items: [
        ...section.items,
        {
          id: uid("plc"),
          kind: "lot",
          title: "",
          image: null,
          category: family?.title ?? "",
          product: family?.rows[0]?.product ?? "",
          tier: PLAN_TIERS[0].id,
          text: "",
          href: "/lots",
        },
      ],
    });
  }
  return (
    <div className="stack">
      <div className="field-grid field-grid--2">
        <TextField label="Section kicker" htmlFor="planslots-kicker" value={section.kicker} onChange={(v) => onChange({ ...section, kicker: v })} hint="The small line above the heading." />
        <TextField label="Section heading" htmlFor="planslots-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
      </div>
      <TextAreaField label="One-line lead" htmlFor="planslots-intro" rows={2} value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} hint="The captain's one sentence under the heading." />
      <TextAreaField label="Closing price note" htmlFor="planslots-note" rows={2} value={section.note ?? ""} onChange={(v) => onChange({ ...section, note: v.trim() ? v : null })} hint="What the figures on these cards are. An empty note hides the line." />

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Home cards <Badge tone="info">{section.items.length}</Badge>
          <span className="ed-muted"> — each card&rsquo;s price is read live from the 2026 list.</span>
        </p>
        <Button variant="accent" size="sm" onClick={addCard}>
          <Plus size={15} aria-hidden="true" /> Add a card
        </Button>
      </div>

      {section.items.length === 0 ? (
        <p className="ed-hint">No cards yet — the home shows an empty-state note until you add one.</p>
      ) : (
        <div className="ed-services">
          {section.items.map((card, i) => {
            const figures = planLotCardFigures(card, lotCategories, planPricing);
            const family = lotCategories.find((c) => c.title === card.category);
            const productOptions = (family?.rows ?? []).map((r) => ({
              value: r.product,
              label: `${r.product} · ${r.area} sqm`,
            }));
            return (
              <div className="ed-row" key={card.id}>
              <details className="ed-service" open={!card.title}>
                <summary className="ed-service__summary">
                  <span className="ed-service__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ed-service__name">{card.title || "Untitled card"}</span>
                  <span className="ed-price">
                    {figures ? `${figures.price}${figures.unit ? ` ${figures.unit}` : ""}` : "no price source"}
                  </span>
                </summary>
                <div className="ed-service__fields">
                  <div className="field-grid field-grid--3">
                    <TextField label="Card name" htmlFor={`plc-title-${card.id}`} value={card.title} onChange={(v) => patchCard(card.id, { title: v })} placeholder="e.g. Premium Lot" />
                    <SelectField
                      label="Type word"
                      htmlFor={`plc-kind-${card.id}`}
                      value={card.kind}
                      onChange={(v) => changeKind(card, v as PlanLotKind)}
                      options={PLAN_LOT_KIND_OPTIONS}
                      hint="Garden lot, Structure or Life plan."
                    />
                    <TextField label="Link destination" htmlFor={`plc-href-${card.id}`} value={card.href} onChange={(v) => patchCard(card.id, { href: v })} hint="Where the card takes visitors, e.g. /lots or /plans." />
                  </div>
                  <ImageField label="Card photo" htmlFor={`plc-image-${card.id}`} value={card.image} onChange={(v) => patchCard(card.id, { image: v })} />
                  {card.kind === "plan" ? (
                    <div className="field-grid field-grid--2">
                      <SelectField
                        label="Plan tier (2026 list)"
                        htmlFor={`plc-tier-${card.id}`}
                        value={card.tier}
                        onChange={(v) => patchCard(card.id, { tier: v })}
                        options={PLAN_TIERS.map((t) => ({ value: t.id, label: t.name }))}
                        hint="The card prints this tier's regular monthly rate. The amount is never typed here."
                      />
                      <TextField label="Supporting line" htmlFor={`plc-text-${card.id}`} value={card.text} onChange={(v) => patchCard(card.id, { text: v })} hint="The one line under the plan's name, e.g. what the plan covers." />
                    </div>
                  ) : (
                    <div className="field-grid field-grid--2">
                      <SelectField
                        label="Lot family (2026 list)"
                        htmlFor={`plc-category-${card.id}`}
                        value={card.category}
                        onChange={(v) => {
                          const next = lotCategories.find((c) => c.title === v);
                          patchCard(card.id, { category: v, product: next?.rows[0]?.product ?? "" });
                        }}
                        options={lotCategories.map((c) => ({ value: c.title, label: c.caption }))}
                        hint="The family the card prices from — the amount is read from the sheet, never typed."
                      />
                      <SelectField
                        label="Product in that family"
                        htmlFor={`plc-product-${card.id}`}
                        value={card.product}
                        onChange={(v) => patchCard(card.id, { product: v })}
                        options={productOptions}
                        hint="The row whose regular selling price and area the card prints."
                      />
                    </div>
                  )}
                </div>
              </details>
              <span className="ed-row__tools">
                <MoveRowButtons label={card.title || "card"} first={i === 0} last={i === section.items.length - 1} onUp={() => move(card.id, -1)} onDown={() => move(card.id, 1)} onRemove={() => onChange({ ...section, items: section.items.filter((c) => c.id !== card.id) })} />
              </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- blog editor -------------------------------- */

function MediaRowEditor({
  media,
  index,
  onChange,
  onRemove,
  onMove,
}: {
  media: MediaItem;
  index: number;
  total: number;
  onChange: (next: MediaItem) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const [openPicker, setOpenPicker] = useState(false);
  // A photo chosen from this device is a data URL stored with the document —
  // too long to be an editable text value, so it gets its own compact row state
  // (thumbnail + replace/remove) instead of a giant base64 blob in the input.
  const isDevicePhoto = media.kind === "photo" && media.src.startsWith("data:");
  return (
    <li className="ed-media-row">
      <select
        aria-label="Media kind"
        className="ed-media-row__kind"
        value={media.kind}
        onChange={(e) => onChange({ ...media, kind: e.target.value as MediaItem["kind"] })}
      >
        <option value="photo">Photo</option>
        <option value="video">Video</option>
      </select>
      <div className="ed-media-row__src">
        <label className="ed-label" htmlFor={`media-src-${index}-${media.kind}`}>
          {media.kind === "video" ? "Video source (mp4 URL)" : "Photo source"}
        </label>
        {isDevicePhoto ? (
          <div className="ed-media-attached">
            <span className="ed-media-attached__thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- staff's own uploaded photo */}
              <img src={media.src} alt="" />
            </span>
            <span className="ed-media-attached__copy">
              <strong>Device photo attached</strong>
              <span className="ed-media-attached__hint">
                Stored with this post, like every other edit — no backend.
              </span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => setOpenPicker(true)}>
              <ImageIcon size={14} aria-hidden="true" /> Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...media, src: "" })}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <input id={`media-src-${index}-${media.kind}`} type="text" value={media.src} onChange={(e) => onChange({ ...media, src: e.target.value })} placeholder={media.kind === "video" ? "https://…/video.mp4" : "https://… or /media/…"} />
            {media.kind === "photo" ? (
              <Button variant="secondary" size="sm" onClick={() => setOpenPicker(true)}>
                <ImageIcon size={14} aria-hidden="true" /> Choose
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {media.kind === "video" ? (
        <input
          className="ed-media-row__poster"
          type="text"
          aria-label="Video poster image"
          placeholder="Poster image URL (optional)"
          value={media.poster ?? ""}
          onChange={(e) => onChange({ ...media, poster: e.target.value || null })}
        />
      ) : (
        <input
          className="ed-media-row__alt"
          type="text"
          aria-label="Alt text"
          placeholder="Alt text (optional)"
          value={media.alt ?? ""}
          onChange={(e) => onChange({ ...media, alt: e.target.value || null })}
        />
      )}
      <MoveRowButtons label={`attachment ${index + 1}`} first={index === 0} last={false} onUp={() => onMove(-1)} onDown={() => onMove(1)} onRemove={onRemove} />
      <MediaPicker open={openPicker} onClose={() => setOpenPicker(false)} onPick={(src) => { onChange({ ...media, src }); setOpenPicker(false); }} />
    </li>
  );
}

export function BlogEditor({
  section,
  onChange,
}: {
  section: LandingContent["blog"];
  onChange: (next: LandingContent["blog"]) => void;
}) {
  function patchPost(id: string, patch: Partial<BlogPost>) {
    onChange({ ...section, posts: section.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }
  function patchMedia(id: string, index: number, patch: Partial<MediaItem>) {
    onChange({
      ...section,
      posts: section.posts.map((p) =>
        p.id === id ? { ...p, media: p.media.map((m, i) => (i === index ? { ...m, ...patch } : m)) } : p,
      ),
    });
  }
  function moveMedia(id: string, index: number, delta: -1 | 1) {
    onChange({
      ...section,
      posts: section.posts.map((p) => {
        if (p.id !== id) return p;
        const media = clone(p.media);
        const to = index + delta;
        if (to < 0 || to >= media.length) return p;
        const [m] = media.splice(index, 1);
        media.splice(to, 0, m);
        return { ...p, media };
      }),
    });
  }
  const today = () => new Date().toISOString().slice(0, 10);
  return (
    <div className="stack">
      <div className="field-grid field-grid--3">
        <TextField label="Section heading" htmlFor="blog-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <div className="field-grid__span2">
          <TextField label="Section intro" htmlFor="blog-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
        </div>
      </div>

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Published posts <Badge tone="info">{section.posts.length}</Badge>
          <span className="ed-muted"> — rich posts with as many photos/videos as you want.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              posts: [
                {
                  id: uid("post"),
                  author: "Villa Memorial Park",
                  date: today(),
                  caption: "",
                  media: [],
                  link: null,
                },
                ...section.posts,
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Write a post
        </Button>
      </div>

      {section.posts.length === 0 ? (
        <p className="ed-hint">No posts yet — publish the first story from the park.</p>
      ) : (
        <div className="ed-posts">
          {section.posts.map((post) => (
            <div className="ed-row" key={post.id}>
            <details className="ed-post" open={!post.caption && post.media.length === 0}>
              <summary className="ed-post__summary">
                <span className="post-card__avatar" aria-hidden="true">{(post.author.charAt(0) || "V").toUpperCase()}</span>
                <span className="ed-post__name">{post.caption ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "") : "New post"}</span>
                <span className="ed-post__meta">{post.date} · {post.media.length} attachment{post.media.length === 1 ? "" : "s"}</span>
              </summary>
              <div className="ed-post__fields">
                <div className="field-grid field-grid--3">
                  <TextField label="Author" htmlFor={`post-author-${post.id}`} value={post.author} onChange={(v) => patchPost(post.id, { author: v })} />
                  <TextField label="Date" htmlFor={`post-date-${post.id}`} value={post.date} onChange={(v) => patchPost(post.id, { date: v })} hint="YYYY-MM-DD" />
                  <div className="row" style={{ alignItems: "flex-end", gap: "var(--space-2)" }}>
                    <Button variant="accent" size="sm" onClick={() => patchPost(post.id, { media: [...post.media, { kind: "photo", src: "", alt: "", poster: null }] })}>
                      <ImageIcon size={14} aria-hidden="true" /> Photo
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => patchPost(post.id, { media: [...post.media, { kind: "video", src: "", alt: "", poster: null }] })}>
                      <Video size={14} aria-hidden="true" /> Video
                    </Button>
                  </div>
                </div>
                <TextAreaField label="Caption" htmlFor={`post-caption-${post.id}`} rows={3} value={post.caption} onChange={(v) => patchPost(post.id, { caption: v })} hint="Shown above the media, like a newsfeed post. No like/comment/share row — by design." />
                <TextField
                  label="Photo link destination (optional)"
                  htmlFor={`post-link-${post.id}`}
                  value={post.link ?? ""}
                  onChange={(v) => patchPost(post.id, { link: v.trim() || null })}
                  hint="When set, clicking this post's photo (and caption) opens this route, e.g. /price-list, /lots/price-list-2026, /map?plot=A-001. Leave empty to keep the post non-clickable."
                />
                {post.media.length === 0 ? (
                  <p className="ed-hint">No attachments — a caption-only post is fine.</p>
                ) : (
                  <ul className="ed-media-rows">
                    {post.media.map((m, i) => (
                      <MediaRowEditor
                        key={`${m.kind}-${i}-${m.src}`}
                        media={m}
                        index={i}
                        total={post.media.length}
                        onChange={(next) => patchMedia(post.id, i, next)}
                        onRemove={() => patchPost(post.id, { media: post.media.filter((_, j) => j !== i) })}
                        onMove={(delta) => moveMedia(post.id, i, delta)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </details>
            <span className="ed-row__tools">
              <Button variant="ghost" size="sm" className="ed-post__remove" onClick={() => onChange({ ...section, posts: section.posts.filter((p) => p.id !== post.id) })} aria-label="Delete post">
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutEditor({ section, onChange }: { section: AboutSection; onChange: (next: AboutSection) => void }) {
  return (
    <div className="stack">
      <div className="field-grid field-grid--2">
        <TextField label="Section heading" htmlFor="about-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <ImageField label="Park photo" htmlFor="about-image" value={section.image} onChange={(v) => onChange({ ...section, image: v })} />
      </div>
      <TextAreaField label="Story" htmlFor="about-story" rows={4} value={section.story} onChange={(v) => onChange({ ...section, story: v })} />
      <div className="field-grid field-grid--2">
        <TextAreaField label="Mission" htmlFor="about-mission" rows={4} value={section.mission} onChange={(v) => onChange({ ...section, mission: v })} />
        <TextAreaField label="Vision" htmlFor="about-vision" rows={4} value={section.vision} onChange={(v) => onChange({ ...section, vision: v })} />
      </div>
    </div>
  );
}

function MapEditor({
  section,
  onChange,
}: {
  section: LandingContent["map"];
  onChange: (next: LandingContent["map"]) => void;
}) {
  return (
    <div className="field-grid field-grid--2">
      <TextField label="Section heading" htmlFor="map-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
      <TextField label="Section intro" htmlFor="map-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
    </div>
  );
}

/* -------------------------------- FAQ editor ------------------------------ */

/**
 * The FAQ page (/faq). The page's words live in this same document so staff
 * edit them here — the hero copy, the question cards and the next-step link
 * row. The layout on /faq is the page's own; only the words move.
 */
function FaqEditor({
  section,
  onChange,
}: {
  section: FaqSection;
  onChange: (next: FaqSection) => void;
}) {
  function patchItem(id: string, patch: Partial<FaqItem>) {
    onChange({
      ...section,
      items: section.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function moveItem(id: string, delta: -1 | 1) {
    const items = clone(section.items);
    const index = items.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ ...section, items });
  }

  return (
    <div className="stack">
      <div className="field-grid field-grid--3">
        <TextField label="Eyebrow" htmlFor="faq-eyebrow" value={section.eyebrow} onChange={(v) => onChange({ ...section, eyebrow: v })} hint="The small line above the heading." />
        <TextField label="Page heading" htmlFor="faq-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <TextField label="Lead line" htmlFor="faq-lead" value={section.lead} onChange={(v) => onChange({ ...section, lead: v })} hint="The sentence under the heading." />
      </div>

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Questions &amp; answers <Badge tone="info">{section.items.length}</Badge>
          <span className="ed-muted"> — the cards on /faq, in this order.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              items: [...section.items, { id: uid("faq"), question: "", answer: "" }],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add a question
        </Button>
      </div>

      {section.items.length === 0 ? (
        <p className="ed-hint">No questions yet — /faq shows an empty-state note until you add one.</p>
      ) : (
        <div className="ed-services">
          {section.items.map((item, i) => (
            <div className="ed-row" key={item.id}>
            <details className="ed-service" open={!item.question}>
              <summary className="ed-service__summary">
                <span className="ed-service__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ed-service__name">{item.question || "Untitled question"}</span>
              </summary>
              <div className="ed-service__fields">
                <TextField label="Question" htmlFor={`faq-q-${item.id}`} value={item.question} onChange={(v) => patchItem(item.id, { question: v })} placeholder="e.g. What happens when I call?" />
                <TextAreaField label="Answer" htmlFor={`faq-a-${item.id}`} rows={3} value={item.answer} onChange={(v) => patchItem(item.id, { answer: v })} hint="The straight answer a family reads — keep it short and honest." />
              </div>
            </details>
            <span className="ed-row__tools">
              <MoveRowButtons
                label={item.question || "question"}
                first={i === 0}
                last={i === section.items.length - 1}
                onUp={() => moveItem(item.id, -1)}
                onDown={() => moveItem(item.id, 1)}
                onRemove={() =>
                  onChange({ ...section, items: section.items.filter((x) => x.id !== item.id) })
                }
              />
            </span>
            </div>
          ))}
        </div>
      )}

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Next-step links <Badge tone="info">{section.links.length}</Badge>
          <span className="ed-muted"> — the link row closing /faq.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() => onChange({ ...section, links: [...section.links, { label: "", href: "/" }] })}
        >
          <Plus size={15} aria-hidden="true" /> Add a link
        </Button>
      </div>

      {section.links.length === 0 ? (
        <p className="ed-hint">No links yet — leave it this way for a page that ends at the answers.</p>
      ) : (
        <div className="ed-services">
          {section.links.map((link, i) => (
            <div className="field-grid field-grid--2" key={i}>
              <TextField
                label={`Link ${i + 1} label`}
                htmlFor={`faq-link-label-${i}`}
                value={link.label}
                onChange={(v) =>
                  onChange({
                    ...section,
                    links: section.links.map((l, j) => (j === i ? { ...l, label: v } : l)),
                  })
                }
              />
              <div className="row" style={{ gap: "var(--space-2)", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Destination"
                    htmlFor={`faq-link-href-${i}`}
                    value={link.href}
                    onChange={(v) =>
                      onChange({
                        ...section,
                        links: section.links.map((l, j) => (j === i ? { ...l, href: v } : l)),
                      })
                    }
                    hint="Internal path, e.g. /plans."
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...section, links: section.links.filter((_, j) => j !== i) })}
                  aria-label={`Remove link ${link.label || i + 1}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- main editor ------------------------------ */

function ctaFields(cta: Cta, onChange: (next: Cta) => void, key: string, labelPrefix: string) {
  return (
    <div className="field-grid field-grid--2">
      <TextField label={`${labelPrefix} label`} htmlFor={`cta-${key}-label`} value={cta.label} onChange={(v) => onChange({ ...cta, label: v })} />
      <TextField label={`${labelPrefix} destination`} htmlFor={`cta-${key}-href`} value={cta.href} onChange={(v) => onChange({ ...cta, href: v })} hint="Internal path or tel: link." />
    </div>
  );
}

/* Navigable zones — numbering mirrors the section cards below and the public
   page order (the live park map card sits before the blog/newsfeed card). */
/**
 * The seven home sections as navigator zones — the approved home-rebuild plan's
 * order, and the FIRST thing the editor opens on. Their detailed editors are one
 * `HomeSectionsEditor` above the rest of the document.
 */
const HOME_ZONES: Array<{ id: string; num: string; label: string; hint: string }> = [
  { id: "ed-home-intro", num: "00", label: "The entrance", hint: "The opening overlay's two lines — a golden cloud on two cords, shown once per session on the home." },
  { id: "ed-home-1", num: "01", label: "Section 1 · The gateway", hint: "The centred opening: place, headline, promise, the call and the trust facts." },
  { id: "ed-home-2", num: "02", label: "Section 2 · The hero photograph", hint: "The client's photograph, alone and whole, named from the office's own park address — never cropped." },
  { id: "ed-home-3", num: "03", label: "Section 3 · The first park", hint: "The pavilion photograph (the band's dominant figure) with the arrangement builder beside it and the two chapels under it." },
  { id: "ed-home-4", num: "04", label: "Section 4 · Villa Memorial Park", hint: "The four lot types beside the pinned park map and the details under it." },
  { id: "ed-home-5", num: "05", label: "Section 5 · Villa Memorial Plan", hint: "Five rising tiers with the live monthly rate and the sheet's own line about each." },
  { id: "ed-home-6", num: "06", label: "Section 6 · The services", hint: "Five photographic tiles and their quote actions — no amounts on this band." },
  { id: "ed-home-7", num: "07", label: "Section 7 · Contact", hint: "The enquiry form and the embedded park map, with its server-side Google key." },
];

/**
 * WHICH EDITOR OWNS WHICH ZONES (office, inbox 048).
 *
 * The two pages that share this document have their own editors, and an editor
 * shows only what ITS page renders:
 *   · home       — the new home's own seven sections, plus the shared brand /
 *                  24-7 chrome the home's header, footer and call read;
 *   · storefront — the former storefront's sections, which render on /blog
 *                  (its restored bands): Hero · Fixed rails · About ·
 *                  plans-and-lots · the plan board · the park map copy;
 *   · faq        — the FAQ page at /faq, which is not a /blog band at all;
 *   · all        — every zone (the whole document, for tests and static use).
 */
export type LandingEditorMode = "all" | "home" | "storefront" | "faq";

const MODE_ZONE_IDS: Record<Exclude<LandingEditorMode, "all">, readonly string[]> = {
  home: [...HOME_ZONES.map((zone) => zone.id), "ed-brand"],
  storefront: ["ed-hero", "ed-rails", "ed-about", "ed-plans-lots", "ed-plans", "ed-map"],
  faq: ["ed-faq"],
};

const SECTION_ZONES: Array<{ id: string; num: string; label: string; hint: string }> = [
  ...HOME_ZONES,
  { id: "ed-brand", num: "08", label: "Brand & 24/7 line", hint: "Wordmark + mark, and the phone visitors can reach any hour. The home's gateway call action is bound to this line." },
  { id: "ed-hero", num: "09", label: "Hero", hint: "The first thing a grieving or planning family reads — two clear doors: need help now, or plan ahead." },
  { id: "ed-rails", num: "10", label: "Fixed rails", hint: "The pinned side columns that stay frozen beside the scrolling home — any number of items each." },
  { id: "ed-about", num: "11", label: "About · Mission · Vision", hint: "The family-run soul of the park, with a real photo — the trust section." },
  { id: "ed-plans-lots", num: "12", label: "Plans & lots · home cards", hint: "The home band's cards — a real photo, a name, a type word and a live figure from the 2026 list. You pick the family + product (or the plan tier); the amount is never typed." },
  { id: "ed-plans", num: "13", label: "Plan ahead · VMP board", hint: "The Villa Memorial Plan board: promo card, payment-mode switch and the five tiers × four terms, all read live from the 2026 payment-mode tables." },
  { id: "ed-map", num: "14", label: "Park map copy", hint: "The interactive map itself always shows the real lot listing — the heading + intro are yours to word." },
  { id: "ed-faq", num: "16", label: "FAQ page", hint: "The help page at /faq: the questions families ask most, the answers under each one, and the next-step links that close the page." },
];

function formatStamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function LandingPageEditor({
  initialContent,
  sessionName,
  lotCategories,
  planPricing,
  homeCatalog,
  mode = "all",
}: {
  initialContent: LandingContent;
  sessionName?: string;
  /** Which page's zones this editor shows (inbox 048). Default `all`: the whole
   *  document, as the earlier single editor showed it. */
  mode?: LandingEditorMode;
  /** Live-store choices for the seven home sections (catalogue, chapel resources,
   *  lot families). Omitted → the recorded seed's models/families, so static
   *  tests still render the editor. */
  homeCatalog?: HomeEditorCatalog;
  /**
   * The CURRENT pricing store slices (app/(staff)/staff/landing loads them). The
   * editor's service-card price lines and rail catalogue derive from these so a
   * pricing edit is reflected; omitting them falls back to the recorded seed for
   * static tests.
   */
  lotCategories?: LotCategory[];
  planPricing?: PlanPricing;
}) {
  const categories = lotCategories ?? LOT_PRICE_CATEGORIES;
  const pricing = planPricing ?? { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS };
  // The plan band's live monthlies for the editor's read-only price view.
  const homePlanPricing = Object.fromEntries(
    PLAN_TIERS.map((tier) => [
      tier.id,
      {
        monthly: planRateOf(pricing, tier.id, "monthly", false),
        seniorMonthly: planRateOf(pricing, tier.id, "monthly", true),
      },
    ]),
  );
  const homeChoices: HomeEditorCatalog = homeCatalog ?? {
    casketModels: CASKET_MODELS.map((model) => ({ model: model.model, collection: model.collection })),
    services: ALACARTE_SERVICE_FEES.map((fee) => fee.service),
    chapels: [],
    lotFamilies: LOT_PRICE_CATEGORIES.map((family) => ({
      title: family.title,
      caption: family.caption,
      products: family.rows.map((row) => row.product),
    })),
  };
  const [content, setContent] = useState<LandingContent>(() => clone(initialContent));
  const savedJson = useRef(JSON.stringify(initialContent));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);
  // The zones THIS editor owns — the navigator, the scroll-spy and the rendered
  // sections all use this list, so no editor shows another page's fields.
  const zones =
    mode === "all"
      ? SECTION_ZONES
      : SECTION_ZONES.filter((zone) => MODE_ZONE_IDS[mode].includes(zone.id));
  const shows = (id: string) => zones.some((zone) => zone.id === id);
  const consoleCopy: Record<LandingEditorMode, { title: string; live: string; status: string }> = {
    all: { title: "Public pages · / and /faq", live: "/", status: "the pages at / and /faq" },
    home: { title: "The public home · /", live: "/", status: "the home at /" },
    storefront: { title: "The blog's storefront · /blog", live: "/blog", status: "the bands on /blog" },
    faq: { title: "The FAQ page · /faq", live: "/faq", status: "the page at /faq" },
  };
  const copy = consoleCopy[mode];
  const [activeZone, setActiveZone] = useState(zones[0]?.id ?? SECTION_ZONES[0].id);

  const dirty = useMemo(() => JSON.stringify(content) !== savedJson.current, [content]);
  const lastSaved = content.updated_at;

  function patch(fn: (draft: LandingContent) => void) {
    setContent((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });
    // A success banner refers to the previously published state — retire it as
    // soon as staff start a new round of edits.
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  // Live attention flags per zone, shown in the navigator and card headers.
  const flags = useMemo(() => {
    const plansLots = content.plansLots.items.filter(
      (c) => !c.title.trim() || !c.href.trim(),
    ).length;
    const media = content.blog.posts.reduce((n, p) => n + p.media.filter((m) => !m.src.trim()).length, 0);
    const posts = content.blog.posts.filter((p) => !p.caption.trim() && p.media.length === 0).length;
    const faq =
      content.faq.items.filter((item) => !item.question.trim() || !item.answer.trim()).length +
      content.faq.links.filter((link) => !link.label.trim() || !link.href.trim()).length;
    return { plansLots, media, posts, faq };
  }, [content]);

  // Scroll-spy: keep the navigator's active zone in step with what's on screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveZone(entry.target.id);
        }
      },
      { rootMargin: "-96px 0px -62% 0px", threshold: 0 },
    );
    for (const zone of zones) {
      const el = document.getElementById(zone.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // `zones` is derived from `mode`, which is fixed for the editor's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToZone(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveZone(id);
  }

  function clientIssues(): string[] {
    const issues: string[] = [];
    // The second line is a call target: a number and its tel: link go together
    // (the save validator enforces the same pair rule).
    const secondDisplaySet = content.contact.secondPhoneDisplay.trim().length > 0;
    const secondHrefSet = content.contact.secondPhoneHref.trim().length > 0;
    if (secondDisplaySet !== secondHrefSet) {
      issues.push("The second phone line needs both a number to show and a call link — or leave both empty.");
    }
    if (content.hero.background !== null && !isValidCssColor(content.hero.background)) {
      issues.push(
        "The hero background colour must be a valid CSS colour — like #3f97d1, rgb(…), hsl(…) or a named colour.",
      );
    }
    const transparency = content.hero.backgroundTransparency;
    if (
      typeof transparency !== "number" ||
      !Number.isFinite(transparency) ||
      transparency < 0 ||
      transparency > 100 ||
      transparency % 1 !== 0
    ) {
      issues.push("The hero background transparency must be a whole number from 0 to 100.");
    }
    if (content.hero.textColour !== null && !isValidCssColor(content.hero.textColour)) {
      issues.push(
        "The hero text colour must be a valid CSS colour — like #ffffff, rgb(…), hsl(…) or a named colour.",
      );
    }
    content.plansLots.items.forEach((card, i) => {
      if (!card.title.trim() || !card.href.trim()) {
        issues.push(`Home card ${i + 1} needs a name and a link before publishing.`);
      }
      if (card.kind === "plan") {
        if (!PLAN_TIERS.some((t) => t.id === card.tier)) {
          issues.push(`Home card ${i + 1} must price from one of the five 2026 plan tiers.`);
        }
      } else {
        const family = categories.find((c) => c.title === card.category);
        if (!family || !family.rows.some((r) => r.product === card.product)) {
          issues.push(`Home card ${i + 1} must name a 2026 lot family and a product in it.`);
        }
      }
    });
    content.blog.posts.forEach((post) => {
      post.media.forEach((m) => {
        if (!m.src.trim()) issues.push(`A ${m.kind} attachment on “${post.caption.slice(0, 30) || post.date || "new post"}” is missing its source.`);
      });
    });
    content.faq.items.forEach((item, i) => {
      if (!item.question.trim() || !item.answer.trim()) {
        issues.push(`FAQ entry ${i + 1} needs both a question and an answer before publishing.`);
      }
    });
    content.faq.links.forEach((link, i) => {
      if (!link.label.trim() || !link.href.trim()) {
        issues.push(`FAQ next-step link ${i + 1} needs a label and a destination before publishing.`);
      }
    });
    return issues;
  }

  async function publish() {
    const issues = clientIssues();
    if (issues.length > 0) {
      setNotice({ tone: "danger", msg: issues.join(" ") });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/landing/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Publish failed — the content store didn't accept the document.";
        setNotice({ tone: "danger", msg });
        return;
      }
      const returned =
        typeof payload === "object" && payload !== null && "content" in payload
          ? (payload as { content: LandingContent }).content
          : null;
      if (returned) {
        setContent(returned);
        savedJson.current = JSON.stringify(returned);
      } else {
        savedJson.current = JSON.stringify(content);
      }
      setNotice({ tone: "success", msg: "Published — the public pages at / and /faq now show this document." });
    } catch {
      setNotice({ tone: "danger", msg: "Could not reach the content store." });
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setContent(clone(initialContent));
    savedJson.current = JSON.stringify(initialContent);
    setNotice(null);
  }

  const { logo, contact, hero, rails, about, plansLots, plans, map, faq } = content;
  const attention = flags.plansLots + flags.faq;

  const statusLine = busy
    ? "Publishing to the content store…"
    : dirty
      ? "Unsaved changes — the live pages still show the last published version."
      : lastSaved
        ? `Published ${formatStamp(lastSaved)} — ${copy.status} show this document.`
        : `Seed content — ${copy.status} currently show the recorded starter document.`;

  return (
    <div className="stack-4">
      {/* 1 · Sticky document console + navigator — status, the publish action
          and one-tap zone jumps stay in reach the whole way down. */}
      <div className="ed-stick">
        <div className="ed-console" aria-label="Document status and publish">
        <div className="ed-console__status">
          <span className={`ed-sync${dirty || busy ? " ed-sync--dirty" : ""}`} aria-hidden="true">
            {busy ? <Loader2 size={15} aria-hidden="true" /> : dirty ? null : <Check size={15} aria-hidden="true" />}
          </span>
          <div className="ed-console__copy">
            <p className="ed-console__title">{copy.title}</p>
            <p className="ed-console__sub">
              {sessionName ? `Good day, ${sessionName} — ` : ""}
              {statusLine}
            </p>
          </div>
        </div>
        <div className="ed-console__actions">
          <a href={copy.live} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm ed-console__live">
            <ExternalLink size={14} aria-hidden="true" /> View live page
          </a>
          {dirty ? (
            <Button variant="ghost" size="sm" className="ed-console__discard" onClick={discard}>
              Discard
            </Button>
          ) : null}
          <Button variant="accent" size="sm" onClick={publish} disabled={busy || !dirty} className="ed-console__publish">
            {busy ? (
              <>
                <Loader2 size={14} aria-hidden="true" /> Publishing…
              </>
            ) : dirty ? (
              <>
                <Save size={14} aria-hidden="true" /> Publish changes
              </>
            ) : (
              <>
                <CheckCircle2 size={14} aria-hidden="true" /> Up to date
              </>
            )}
          </Button>
        </div>
        </div>

        {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}

        {/* 2 · Section navigator — one tap to any zone, page order, live counts */}
        <nav className="ed-nav" aria-label="Page sections">
        <ul>
          {zones.map((zone) => {
            const count =
              zone.id === "ed-rails"
                ? rails.left.items.length + rails.right.items.length
                : zone.id === "ed-plans-lots"
                  ? plansLots.items.length
                  : zone.id === "ed-faq"
                      ? faq.items.length
                      : null;
            const warn =
              (zone.id === "ed-plans-lots" && flags.plansLots > 0) ||
              (zone.id === "ed-faq" && flags.faq > 0);
            return (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => scrollToZone(zone.id)}
                  className={`ed-nav__btn${activeZone === zone.id ? " ed-nav__btn--active" : ""}`}
                  aria-current={activeZone === zone.id ? "true" : undefined}
                >
                  <span className="ed-nav__num">{zone.num}</span>
                  <span className="ed-nav__label">{zone.label}</span>
                  {count !== null ? (
                    <span className={`ed-nav__count${warn ? " ed-nav__count--warn" : ""}`}>{count}</span>
                  ) : null}
                  {warn ? <span className="ed-nav__dot" title="Needs attention before publishing" aria-label="Needs attention" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>

      {/* 3 · The document, zone by zone — only the zones this mode owns. */}
      {shows("ed-home-1") ? (
        <HomeSectionsEditor
          home={content.home}
          onChange={(next) => patch((d) => void (d.home = next))}
          catalog={homeChoices}
          planPricing={homePlanPricing}
        />
      ) : null}

      {shows("ed-brand") ? (
      <EdSection
        id="ed-brand"
        num="08"
        title="Brand & 24/7 line"
        hint="The mark that sits top-left in the header and in the hero, and the phone visitors can reach any hour."
        badge={
          logo.markImage ? (
            <span className="ed-head-tag">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo preview */}
              <img src={logo.markImage} alt="" />
              Mark set
            </span>
          ) : (
            <span className="ed-head-tag ed-head-tag--muted">Monogram fallback</span>
          )
        }
      >
        <div className="field-grid field-grid--3">
          <TextField label="Wordmark" htmlFor="logo-wordmark" value={logo.wordmark} onChange={(v) => patch((d) => void (d.logo.wordmark = v))} hint="Shown beside the mark in the header, hero and footer." />
          <div className="field-grid__span2">
            <ImageField label="Logo mark" htmlFor="logo-mark" value={logo.markImage} onChange={(v) => patch((d) => void (d.logo.markImage = v))} />
          </div>
        </div>
        <div className="field-grid field-grid--4">
          <TextField label="Phone label" htmlFor="contact-label" value={contact.phoneLabel} onChange={(v) => patch((d) => void (d.contact.phoneLabel = v))} />
          <TextField label="Phone number shown" htmlFor="contact-display" value={contact.phoneDisplay} onChange={(v) => patch((d) => void (d.contact.phoneDisplay = v))} />
          <TextField label="Call link" htmlFor="contact-href" value={contact.phoneHref} onChange={(v) => patch((d) => void (d.contact.phoneHref = v))} hint="e.g. tel:+63917…" />
          <TextField label="Location line" htmlFor="contact-location" value={contact.location} onChange={(v) => patch((d) => void (d.contact.location = v))} />
        </div>
        {/* The contact surface (/contact) + the closing band read these too —
            the client's own letterhead facts. Empty a second-line field (both
            halves) to hide the row entirely. */}
        <div className="field-grid field-grid--4">
          <TextField label="Second line shown" htmlFor="contact-second-display" value={contact.secondPhoneDisplay} onChange={(v) => patch((d) => void (d.contact.secondPhoneDisplay = v))} hint="Optional — clear both second-line fields to hide it." />
          <TextField label="Second call link" htmlFor="contact-second-href" value={contact.secondPhoneHref} onChange={(v) => patch((d) => void (d.contact.secondPhoneHref = v))} hint="e.g. tel:+63917…" />
          <TextField label="Main office address" htmlFor="contact-office-address" value={contact.officeAddress} onChange={(v) => patch((d) => void (d.contact.officeAddress = v))} />
          <TextField label="Park address" htmlFor="contact-park-address" value={contact.parkAddress} onChange={(v) => patch((d) => void (d.contact.parkAddress = v))} />
        </div>
      </EdSection>
      ) : null}

      {shows("ed-hero") ? (
      <EdSection
        id="ed-hero"
        num="09"
        title="Hero"
        hint="The first thing a grieving or planning family reads — two clear doors: need help now, or plan ahead."
      >
        <div className="field-grid field-grid--2">
          <TextField label="Eyebrow" htmlFor="hero-eyebrow" value={hero.eyebrow} onChange={(v) => patch((d) => void (d.hero.eyebrow = v))} />
        </div>
        <TextField label="Headline" htmlFor="hero-headline" value={hero.headline} onChange={(v) => patch((d) => void (d.hero.headline = v))} hint="Warm, dignified, short — this is the anchor line. Leave it (with the eyebrow and subline) empty for a pure photo hero." />
        <TextAreaField label="Subline" htmlFor="hero-subline" rows={2} value={hero.subline} onChange={(v) => patch((d) => void (d.hero.subline = v))} />
        <ImageField
          label="Background photo"
          htmlFor="hero-image"
          value={hero.image}
          onChange={(v) => patch((d) => void (d.hero.image = v))}
        />
        <HeroBackgroundField
          hero={hero}
          onChange={(next) => patch((d) => void Object.assign(d.hero, next))}
        />
        {ctaFields(hero.primaryCta, (next) => patch((d) => void (d.hero.primaryCta = next)), "primary", "I need help now button")}
        {ctaFields(hero.secondaryCta, (next) => patch((d) => void (d.hero.secondaryCta = next)), "secondary", "Plan ahead button")}
      </EdSection>
      ) : null}

      {shows("ed-rails") ? (
      <EdSection
        id="ed-rails"
        num="10"
        title="Fixed rails"
        hint="The two pinned side columns flanking the home. Each can hold any number of real services, plans, products or links — the rail scrolls when the list grows, so nothing ever breaks the page."
        badge={<span className="ed-chip">{rails.left.items.length + rails.right.items.length} pinned</span>}
      >
        <div className="ed-rails-grid">
          <div className="ed-rail-card">
            <RailEditor
              side="left"
              config={rails.left}
              lotCategories={lotCategories}
              planPricing={planPricing}
              onChange={(next) => patch((d) => void (d.rails.left = next))}
            />
          </div>
          <div className="ed-rail-card">
            <RailEditor
              side="right"
              config={rails.right}
              lotCategories={lotCategories}
              planPricing={planPricing}
              onChange={(next) => patch((d) => void (d.rails.right = next))}
            />
          </div>
        </div>
      </EdSection>
      ) : null}

      {shows("ed-about") ? (
      <EdSection
        id="ed-about"
        num="11"
        title="About · Mission · Vision"
        hint="The family-run soul of the park, with a real photo — the trust section."
      >
        <AboutEditor section={about} onChange={(next) => patch((d) => void (d.about = next))} />
      </EdSection>

      ) : null}
      {shows("ed-plans-lots") ? (
      <EdSection
        id="ed-plans-lots"
        num="12"
        title="Memorial plans & garden lots"
        hint="The home band that replaced “What we do”: pick each card's 2026 lot family + product (or the plan tier), set its photo and link, and write the plan's supporting line — every figure is read live from the 2026 list, never typed."
        badge={
          flags.plansLots > 0 ? (
            <span className="ed-chip ed-chip--warn">{flags.plansLots} need attention</span>
          ) : (
            <CountChip count={plansLots.items.length} />
          )
        }
      >
        <PlansLotsEditor
          section={plansLots}
          lotCategories={categories}
          planPricing={pricing}
          onChange={(next) => patch((d) => void (d.plansLots = next))}
        />
      </EdSection>

      ) : null}
      {shows("ed-plans") ? (
      <EdSection
        id="ed-plans"
        num="13"
        title="Plan ahead — Villa Memorial Plan board"
        hint="The prototype's plan board: the promo figure beside the payment-mode switch, the five tiers × four terms, the senior-rate footnote and the underwriting logos. Every figure is read live from lib/villa-pricing.ts — you word the kicker, heading, intro and footnote."
        badge={<span className="ed-chip">2026 tables</span>}
      >
        <PlanBoardEditor section={plans} onChange={(next) => patch((d) => void (d.plans = next))} />
      </EdSection>

      ) : null}
      {shows("ed-map") ? (
      <EdSection
        id="ed-map"
        num="14"
        title="Live park map copy"
        hint="The interactive map itself always shows the real lot listing; the heading + intro are yours to word. On the home the map renders right above the newsfeed."
      >
        <MapEditor section={map} onChange={(next) => patch((d) => void (d.map = next))} />
      </EdSection>

      ) : null}
      {shows("ed-faq") ? (
      <EdSection
        id="ed-faq"
        num="16"
        title="FAQ page — /faq"
        hint="The questions families ask most, the answer under each one and the next-step links that close the page. The page's layout is fixed; every word below is yours."
        badge={
          flags.faq > 0 ? (
            <span className="ed-chip ed-chip--warn">{flags.faq} need attention</span>
          ) : (
            <CountChip count={faq.items.length} />
          )
        }
      >
        <FaqEditor section={faq} onChange={(next) => patch((d) => void (d.faq = next))} />
      </EdSection>
      ) : null}

      {/* 4 · Closing publish row — the same obvious action, repeated at the end of the document */}
      <div className="ed-publish-row">
        <p className="ed-hint">
          {attention > 0
            ? `${attention} item${attention === 1 ? "" : "s"} flagged for review — the amber markers above show what to check.`
            : dirty
              ? `Your edits are ready to publish to ${copy.status}.`
              : `This document matches ${copy.status}. Nothing to publish.`}
        </p>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          {dirty ? (
            <Button variant="ghost" size="sm" onClick={discard}>
              Discard
            </Button>
          ) : null}
          <Button variant="accent" onClick={publish} disabled={busy || !dirty}>
            {busy ? (
              <>
                <Loader2 size={15} aria-hidden="true" /> Publishing…
              </>
            ) : dirty ? (
              <>
                <Save size={15} aria-hidden="true" /> Publish changes
              </>
            ) : (
              <>
                <CheckCircle2 size={15} aria-hidden="true" /> Up to date
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LandingPageEditor;

/**
 * BlogAdminEditor — the Blog's own screen in the admin panel.
 *
 * WHY THIS EXISTS. The blog was zone 08 inside the Home document's editor, so
 * "where do I write a post?" was answered by "open the home editor and scroll to
 * the eighth zone". The captain asked for both: the surface is called Blog now
 * (`/blog`), and it has its own door in Pages & content.
 *
 * IT IS THE SAME EDITOR, NOT A SECOND ONE. It renders the very same `BlogEditor`
 * the Home zone renders, and saves through the very same
 * `POST /api/landing/content` seam with the whole document — so a post written
 * here and a post written on the Home screen are the same record, and the two
 * screens can never disagree about what a post is. Only the surrounding console
 * differs: this one names the document as the Blog and links to the live page.
 *
 * The document is loaded whole and saved whole because that is what the store
 * accepts (one landing document); this screen simply declines to show the parts
 * it does not own.
 */
export function BlogAdminEditor({ initialContent }: { initialContent: LandingContent }) {
  const [content, setContent] = useState<LandingContent>(() => clone(initialContent));
  const savedJson = useRef(JSON.stringify(initialContent));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  const dirty = useMemo(() => JSON.stringify(content) !== savedJson.current, [content]);
  const posts = content.blog.posts;

  /** Only the blog's own rules. The Home editor runs the whole document's; this
   *  screen must not block a publish over a FAQ entry it never showed. */
  function blogIssues(): string[] {
    const issues: string[] = [];
    if (!content.blog.heading.trim()) issues.push("The blog needs a heading.");
    content.blog.posts.forEach((post, i) => {
      const label = `Post ${i + 1}`;
      if (!post.caption.trim() && post.media.length === 0) {
        issues.push(`${label} is empty — give it a caption, a photo or a video.`);
      }
      post.media.forEach((m, j) => {
        if (!m.src.trim()) issues.push(`${label}'s attachment ${j + 1} has no file chosen yet.`);
      });
    });
    return issues;
  }

  async function publish() {
    const issues = blogIssues();
    if (issues.length > 0) {
      setNotice({ tone: "danger", msg: issues.join(" ") });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/landing/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Publish failed — the content store didn't accept the document.";
        setNotice({ tone: "danger", msg });
        return;
      }
      const returned =
        typeof payload === "object" && payload !== null && "content" in payload
          ? (payload as { content: LandingContent }).content
          : null;
      const next = returned ? clone(returned) : content;
      setContent(next);
      savedJson.current = JSON.stringify(next);
      setNotice({ tone: "success", msg: "Published — the blog page and the home band both show this now." });
    } catch {
      setNotice({ tone: "danger", msg: "Publish failed — the request did not complete." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-4">
      <div className="row row--space" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <p className="ed-muted" style={{ margin: 0 }}>
          {posts.length} post{posts.length === 1 ? "" : "s"} ·{" "}
          {posts.reduce((n, p) => n + p.media.length, 0)} attachment
          {posts.reduce((n, p) => n + p.media.length, 0) === 1 ? "" : "s"}
        </p>
        <div className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
          <Link href="/blog" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live blog
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setContent(clone(initialContent))} disabled={!dirty || busy}>
            Discard changes
          </Button>
          <Button variant="primary" size="sm" onClick={publish} disabled={!dirty || busy}>
            {busy ? (
              <>
                <Loader2 size={15} aria-hidden="true" /> Publishing…
              </>
            ) : (
              <>
                <Save size={15} aria-hidden="true" /> Publish
              </>
            )}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}

    </div>
  );
}
