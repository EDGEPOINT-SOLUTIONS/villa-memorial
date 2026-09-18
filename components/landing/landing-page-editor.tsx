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
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker, RailPicker } from "@/components/landing/editor-pickers";
import { HeroBackgroundField } from "@/components/landing/hero-background-field";
import { SERVICE_CARD_ICONS } from "@/components/landing/service-icons";
import type { CatalogueEntry } from "@/lib/landing/catalogue";
import {
  type AboutSection,
  type BlogPost,
  type Cta,
  type FaqItem,
  type FaqSection,
  type LandingContent,
  type MediaItem,
  type PlansSection,
  type ServiceCard,
  type ServicesSection,
} from "@/lib/api-client/landing";
import { mediaLabel } from "@/lib/media";
import { isValidCssColor } from "@/lib/landing/hero-background";
import { lotCategoryFromPriceOf, type LotCategory, type PlanPricing } from "@/lib/pricing-model";
import { LOT_PRICE_CATEGORIES, php } from "@/lib/villa-pricing";

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

/* --------------------------- service card editor -------------------------- */

/**
 * "What we do" — the four real-2026 service cards. Staff own every word and the
 * destination; the card's price line is DERIVED: its “price family” picks one of
 * the four 2026 lot families and the home prints that family's entry-level
 * “from ₱X · ₱Y / month, 6 yrs” through lib/villa-pricing.ts.
 */
function ServicesEditor({
  section,
  lotCategories,
  onChange,
}: {
  section: ServicesSection;
  /** LIVE lot families from the pricing store — the card's price line reads these. */
  lotCategories: ReadonlyArray<LotCategory>;
  onChange: (next: ServicesSection) => void;
}) {
  function patchCard(id: string, patch: Partial<ServiceCard>) {
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
  return (
    <div className="stack">
      <div className="field-grid field-grid--3">
        <TextField label="Section kicker" htmlFor="services-kicker" value={section.kicker} onChange={(v) => onChange({ ...section, kicker: v })} hint="The small line above the heading." />
        <TextField label="Section heading" htmlFor="services-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <TextField label="Section intro" htmlFor="services-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
      </div>

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Service cards <Badge tone="info">{section.items.length}</Badge>
          <span className="ed-muted"> — each card&rsquo;s price line is read from the 2026 list.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              items: [
                ...section.items,
                {
                  id: uid("svc"),
                  icon: SERVICE_CARD_ICONS[0].key,
                  title: "",
                  text: "",
                  href: "/lots",
                  category: lotCategories[0]?.title ?? "",
                },
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add a service card
        </Button>
      </div>

      {section.items.length === 0 ? (
        <p className="ed-hint">No service cards yet — the home shows an empty-state note until you add one.</p>
      ) : (
        <div className="ed-services">
          {section.items.map((card, i) => {
            const from = lotCategoryFromPriceOf(lotCategories, card.category);
            return (
              <details key={card.id} className="ed-service" open={!card.title}>
                <summary className="ed-service__summary">
                  <span className="ed-service__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ed-service__name">{card.title || "Untitled service card"}</span>
                  <span className="ed-price">
                    {from ? `from ${php(from.selling)} · ${php(from.monthly)} / mo` : "no price family"}
                  </span>
                  <MoveRowButtons label={card.title || "service card"} first={i === 0} last={i === section.items.length - 1} onUp={() => move(card.id, -1)} onDown={() => move(card.id, 1)} onRemove={() => onChange({ ...section, items: section.items.filter((c) => c.id !== card.id) })} />
                </summary>
                <div className="ed-service__fields">
                  <div className="field-grid field-grid--3">
                    <TextField label="Card title" htmlFor={`svc-title-${card.id}`} value={card.title} onChange={(v) => patchCard(card.id, { title: v })} placeholder="e.g. Lot only" />
                    <SelectField
                      label="Icon"
                      htmlFor={`svc-icon-${card.id}`}
                      value={card.icon}
                      onChange={(v) => patchCard(card.id, { icon: v })}
                      options={SERVICE_CARD_ICONS.map((o) => ({ value: o.key, label: o.label }))}
                    />
                    <TextField label="Link destination" htmlFor={`svc-href-${card.id}`} value={card.href} onChange={(v) => patchCard(card.id, { href: v })} hint="Where the card takes visitors, e.g. /lots." />
                  </div>
                  <TextAreaField label="One line of copy" htmlFor={`svc-text-${card.id}`} rows={2} value={card.text} onChange={(v) => patchCard(card.id, { text: v })} hint="A single sentence, as the card prints it." />
                  <SelectField
                    label="Price family (2026 list)"
                    htmlFor={`svc-category-${card.id}`}
                    value={card.category}
                    onChange={(v) => patchCard(card.id, { category: v })}
                    options={lotCategories.map((c) => ({ value: c.title, label: c.caption }))}
                    hint="The “from …” line is read from the client's 2026 sheet for this family — the amount is never typed here."
                  />
                </div>
              </details>
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

function BlogEditor({
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
            <details key={post.id} className="ed-post" open={!post.caption && post.media.length === 0}>
              <summary className="ed-post__summary">
                <span className="post-card__avatar" aria-hidden="true">{(post.author.charAt(0) || "V").toUpperCase()}</span>
                <span className="ed-post__name">{post.caption ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "") : "New post"}</span>
                <span className="ed-post__meta">{post.date} · {post.media.length} attachment{post.media.length === 1 ? "" : "s"}</span>
                <Button variant="ghost" size="sm" className="ed-post__remove" onClick={() => onChange({ ...section, posts: section.posts.filter((p) => p.id !== post.id) })} aria-label="Delete post">
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
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
                  hint="When set, clicking this post's photo (and caption) opens this route, e.g. /plans/villa-memorial-plan, /lots/price-list-2026, /map?plot=A-001. Leave empty to keep the post non-clickable."
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
            <details key={item.id} className="ed-service" open={!item.question}>
              <summary className="ed-service__summary">
                <span className="ed-service__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ed-service__name">{item.question || "Untitled question"}</span>
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
              </summary>
              <div className="ed-service__fields">
                <TextField label="Question" htmlFor={`faq-q-${item.id}`} value={item.question} onChange={(v) => patchItem(item.id, { question: v })} placeholder="e.g. What happens when I call?" />
                <TextAreaField label="Answer" htmlFor={`faq-a-${item.id}`} rows={3} value={item.answer} onChange={(v) => patchItem(item.id, { answer: v })} hint="The straight answer a family reads — keep it short and honest." />
              </div>
            </details>
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
const SECTION_ZONES: Array<{ id: string; num: string; label: string; hint: string }> = [
  { id: "ed-brand", num: "01", label: "Brand & 24/7 line", hint: "Wordmark + mark, and the phone visitors can reach any hour." },
  { id: "ed-hero", num: "02", label: "Hero", hint: "The first thing a grieving or planning family reads — two clear doors: need help now, or plan ahead." },
  { id: "ed-rails", num: "03", label: "Fixed rails", hint: "The pinned side columns that stay frozen beside the scrolling home — any number of items each." },
  { id: "ed-about", num: "04", label: "About · Mission · Vision", hint: "The family-run soul of the park, with a real photo — the trust section." },
  { id: "ed-services", num: "05", label: "What we do · service cards", hint: "The four 2026 service cards — you write every word; each card's “from …” line is read from the price list for the family you pick." },
  { id: "ed-plans", num: "06", label: "Plan ahead · VMP board", hint: "The Villa Memorial Plan board: promo card, payment-mode switch and the five tiers × four terms, all read live from the 2026 payment-mode tables." },
  { id: "ed-map", num: "07", label: "Park map copy", hint: "The interactive map itself always shows the real lot listing — the heading + intro are yours to word." },
  { id: "ed-blog", num: "08", label: "Blog & newsfeed", hint: "Rich posts laid out like a newsfeed — single / pair / gallery, video inline. No like/share row — by design." },
  { id: "ed-faq", num: "09", label: "FAQ page", hint: "The help page at /faq: the questions families ask most, the answers under each one, and the next-step links that close the page." },
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
}: {
  initialContent: LandingContent;
  sessionName?: string;
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
  const [content, setContent] = useState<LandingContent>(() => clone(initialContent));
  const savedJson = useRef(JSON.stringify(initialContent));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);
  const [activeZone, setActiveZone] = useState(SECTION_ZONES[0].id);

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
    const services = content.services.items.filter(
      (c) => !c.title.trim() || !c.text.trim() || !c.href.trim(),
    ).length;
    const media = content.blog.posts.reduce((n, p) => n + p.media.filter((m) => !m.src.trim()).length, 0);
    const posts = content.blog.posts.filter((p) => !p.caption.trim() && p.media.length === 0).length;
    const faq =
      content.faq.items.filter((item) => !item.question.trim() || !item.answer.trim()).length +
      content.faq.links.filter((link) => !link.label.trim() || !link.href.trim()).length;
    return { services, media, posts, faq };
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
    for (const zone of SECTION_ZONES) {
      const el = document.getElementById(zone.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollToZone(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveZone(id);
  }

  function clientIssues(): string[] {
    const issues: string[] = [];
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
    content.services.items.forEach((card, i) => {
      if (!card.title.trim() || !card.text.trim() || !card.href.trim()) {
        issues.push(`Service card ${i + 1} needs a title, a line of copy and a link before publishing.`);
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

  const { logo, contact, hero, rails, about, services, plans, blog, map, faq } = content;
  const attention = flags.services + flags.media + flags.faq;

  const statusLine = busy
    ? "Publishing to the content store…"
    : dirty
      ? "Unsaved changes — the live pages still show the last published version."
      : lastSaved
        ? `Published ${formatStamp(lastSaved)} — the pages at / and /faq show this document.`
        : "Seed content — the pages currently show the recorded starter document.";

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
            <p className="ed-console__title">Public pages · / and /faq</p>
            <p className="ed-console__sub">
              {sessionName ? `Good day, ${sessionName} — ` : ""}
              {statusLine}
            </p>
          </div>
        </div>
        <div className="ed-console__actions">
          <a href="/" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm ed-console__live">
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
        <nav className="ed-nav" aria-label="Landing page sections">
        <ul>
          {SECTION_ZONES.map((zone) => {
            const count =
              zone.id === "ed-rails"
                ? rails.left.items.length + rails.right.items.length
                : zone.id === "ed-services"
                  ? services.items.length
                  : zone.id === "ed-blog"
                    ? blog.posts.length
                    : zone.id === "ed-faq"
                      ? faq.items.length
                      : null;
            const warn =
              (zone.id === "ed-services" && flags.services > 0) ||
              (zone.id === "ed-blog" && (flags.media > 0 || flags.posts > 0)) ||
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

      {/* 3 · The document, zone by zone */}
      <EdSection
        id="ed-brand"
        num="01"
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
      </EdSection>

      <EdSection
        id="ed-hero"
        num="02"
        title="Hero"
        hint="The first thing a grieving or planning family reads — two clear doors: need help now, or plan ahead."
      >
        <div className="field-grid field-grid--2">
          <TextField label="Eyebrow" htmlFor="hero-eyebrow" value={hero.eyebrow} onChange={(v) => patch((d) => void (d.hero.eyebrow = v))} />
        </div>
        <TextField label="Headline" htmlFor="hero-headline" value={hero.headline} onChange={(v) => patch((d) => void (d.hero.headline = v))} hint="Warm, dignified, short — this is the anchor line." />
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

      <EdSection
        id="ed-rails"
        num="03"
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

      <EdSection
        id="ed-about"
        num="04"
        title="About · Mission · Vision"
        hint="The family-run soul of the park, with a real photo — the trust section."
      >
        <AboutEditor section={about} onChange={(next) => patch((d) => void (d.about = next))} />
      </EdSection>

      <EdSection
        id="ed-services"
        num="05"
        title="What we do — service cards"
        hint="The four 2026 service cards, exactly as the prototype prints them: pick an icon, write the one-line copy and the destination — the “from ₱… · ₱… / month, 6 yrs” line is read from the price list for the family you choose (never typed)."
        badge={
          flags.services > 0 ? (
            <span className="ed-chip ed-chip--warn">{flags.services} need attention</span>
          ) : (
            <CountChip count={services.items.length} />
          )
        }
      >
        <ServicesEditor
          section={services}
          lotCategories={categories}
          onChange={(next) => patch((d) => void (d.services = next))}
        />
      </EdSection>

      <EdSection
        id="ed-plans"
        num="06"
        title="Plan ahead — Villa Memorial Plan board"
        hint="The prototype's plan board: the promo figure beside the payment-mode switch, the five tiers × four terms, the senior-rate footnote and the underwriting logos. Every figure is read live from lib/villa-pricing.ts — you word the kicker, heading, intro and footnote."
        badge={<span className="ed-chip">2026 tables</span>}
      >
        <PlanBoardEditor section={plans} onChange={(next) => patch((d) => void (d.plans = next))} />
      </EdSection>

      <EdSection
        id="ed-map"
        num="07"
        title="Live park map copy"
        hint="The interactive map itself always shows the real lot listing; the heading + intro are yours to word. On the home the map renders right above the newsfeed."
      >
        <MapEditor section={map} onChange={(next) => patch((d) => void (d.map = next))} />
      </EdSection>

      <EdSection
        id="ed-blog"
        num="08"
        title="Blog — rich newsfeed posts"
        hint="A caption plus as many photos/videos as you like, laid out like a newsfeed (single / pair / gallery, video inline). No like/share row — by design."
        badge={
          flags.media + flags.posts > 0 ? (
            <span className="ed-chip ed-chip--warn">Needs attention</span>
          ) : (
            <CountChip count={blog.posts.length} />
          )
        }
      >
        <BlogEditor section={blog} onChange={(next) => patch((d) => void (d.blog = next))} />
      </EdSection>

      <EdSection
        id="ed-faq"
        num="09"
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

      {/* 4 · Closing publish row — the same obvious action, repeated at the end of the document */}
      <div className="ed-publish-row">
        <p className="ed-hint">
          {attention > 0
            ? `${attention} item${attention === 1 ? "" : "s"} flagged for review — the amber markers above show what to check.`
            : dirty
              ? "Your edits are ready to go live on the public pages."
              : "This document matches what visitors see on / and /faq. Nothing to publish."}
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
