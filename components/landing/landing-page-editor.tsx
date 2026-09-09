"use client";

/**
 * Landing Page editor — premium staff editor for the whole public home (/).
 * Every region of the anchored catalogue is editable here and saves through the
 * BFF (POST /api/landing/content), which validates + persists into the same
 * fixture store the public page renders from. Mirrors the approved click-to-edit
 * model: pin rail items per side (unlimited, with photo + order), edit hero copy and
 * CTAs, about/mission/vision + image, the full service sections, unlimited plan
 * cards and unlimited blog posts with photo/video attachments.
 */
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Image as ImageIcon, Plus, Save, Trash2, Video } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker, RailPicker } from "@/components/landing/editor-pickers";
import type { CatalogueEntry } from "@/lib/landing/catalogue";
import {
  type AboutSection,
  type BlogPost,
  type Cta,
  type LandingContent,
  type MediaItem,
  type PlanCard,
  type PlansSection,
  type ServiceDetail,
  type ServicesSection,
} from "@/lib/api-client/landing";
import { mediaLabel } from "@/lib/media";

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
}: {
  num: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <section className="ed-section">
      <header className="ed-section__head">
        <span className="ed-section__num">{num}</span>
        <div>
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        {badge ? <div className="ed-section__badge">{badge}</div> : null}
      </header>
      <div className="ed-section__body">{children}</div>
    </section>
  );
}

/* ------------------------------ rail editor ------------------------------- */

function RailEditor({
  side,
  config,
  onChange,
}: {
  side: "left" | "right";
  config: LandingContent["rails"]["left"];
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
    });
    onChange(next);
    setPicking(false);
  }

  return (
    <div className="ed-rail">
      <div className="field-grid field-grid--2">
        <TextField
          label={`${side === "left" ? "Left" : "Right"} rail heading`}
          htmlFor={`rail-${side}-heading`}
          value={config.heading}
          onChange={(v) => onChange({ ...config, heading: v })}
          hint="The small heading visitors see above the pinned items."
        />
      </div>

      <div className="row row--space" style={{ margin: "var(--space-2) 0 var(--space-1)" }}>
        <p className="ed-subhead">
          Pinned items <Badge tone="info">{config.items.length}</Badge>
          <span className="ed-muted"> — unlimited; the rail scrolls, so pin as many as you want.</span>
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
        onClose={() => setPicking(false)}
        onAdd={add}
      />
    </div>
  );
}

/* --------------------------- plan card editor ----------------------------- */

function PlanCardsEditor({
  section,
  onChange,
}: {
  section: PlansSection;
  onChange: (next: PlansSection) => void;
}) {
  function patchCard(id: string, patch: Partial<PlanCard>) {
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
        <TextField label="Section heading" htmlFor="plans-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <div className="field-grid__span2">
          <TextField label="Section intro" htmlFor="plans-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
        </div>
      </div>
      <TextAreaField label="Footnote under the grid" htmlFor="plans-note" value={section.note ?? ""} onChange={(v) => onChange({ ...section, note: v || null })} hint="Shown in small type — the honest price-list note lives here." />

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Plan cards <Badge tone="info">{section.items.length}</Badge>
          <span className="ed-muted"> — add as many as you want; each needs a photo, name and price.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              items: [
                ...section.items,
                { id: uid("plan"), badge: "Plan", name: "", price: "", note: "", image: null, href: "/lots/price-list-2026" },
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add a plan card
        </Button>
      </div>

      {section.items.length === 0 ? (
        <p className="ed-hint">No plan cards yet — the home shows an empty-state note until you add one.</p>
      ) : (
        <div className="ed-plan-cards">
          {section.items.map((card, i) => (
            <details key={card.id} className="ed-plan-card" open={!card.name && !card.price}>
              <summary className="ed-plan-card__summary">
                <span className="ed-plan-card__thumb">
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- card photo
                    <img src={card.image} alt="" />
                  ) : null}
                </span>
                <span className="ed-plan-card__name">{card.name || "Untitled plan card"}</span>
                <span className="ed-plan-card__price">{card.price || "—"}</span>
                <MoveRowButtons label={card.name || "plan card"} first={i === 0} last={i === section.items.length - 1} onUp={() => move(card.id, -1)} onDown={() => move(card.id, 1)} onRemove={() => onChange({ ...section, items: section.items.filter((c) => c.id !== card.id) })} />
              </summary>
              <div className="ed-plan-card__fields">
                <div className="field-grid field-grid--3">
                  <TextField label="Card name" htmlFor={`plan-name-${card.id}`} value={card.name} onChange={(v) => patchCard(card.id, { name: v })} placeholder="e.g. Premium Lot" />
                  <TextField label="Price line" htmlFor={`plan-price-${card.id}`} value={card.price} onChange={(v) => patchCard(card.id, { price: v })} placeholder="e.g. ₱114,000" hint="Display only — no money math." />
                  <TextField label="Badge (optional)" htmlFor={`plan-badge-${card.id}`} value={card.badge ?? ""} onChange={(v) => patchCard(card.id, { badge: v || null })} placeholder="e.g. Garden lot" />
                </div>
                <TextField label="Note (optional)" htmlFor={`plan-note-${card.id}`} value={card.note ?? ""} onChange={(v) => patchCard(card.id, { note: v || null })} hint="Small type under the price, e.g. “2.5 sqm · lot only”." />
                <div className="field-grid field-grid--2">
                  <TextField label="Link destination" htmlFor={`plan-href-${card.id}`} value={card.href} onChange={(v) => patchCard(card.id, { href: v })} hint="Where the card takes visitors." />
                  <ImageField label="Card photo" htmlFor={`plan-image-${card.id}`} value={card.image} onChange={(v) => patchCard(card.id, { image: v })} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- services editor ------------------------------ */

function ServicesEditor({
  section,
  onChange,
}: {
  section: ServicesSection;
  onChange: (next: ServicesSection) => void;
}) {
  function patchService(id: string, patch: Partial<ServiceDetail>) {
    onChange({ ...section, items: section.items.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  function move(id: string, delta: -1 | 1) {
    const items = clone(section.items);
    const from = items.findIndex((s) => s.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const [svc] = items.splice(from, 1);
    items.splice(to, 0, svc);
    onChange({ ...section, items });
  }
  return (
    <div className="stack">
      <div className="field-grid field-grid--3">
        <TextField label="Section heading" htmlFor="services-heading" value={section.heading} onChange={(v) => onChange({ ...section, heading: v })} />
        <div className="field-grid__span2">
          <TextField label="Section intro" htmlFor="services-intro" value={section.intro} onChange={(v) => onChange({ ...section, intro: v })} />
        </div>
      </div>

      <div className="row row--space" style={{ margin: "var(--space-1) 0" }}>
        <p className="ed-subhead">
          Service sections <Badge tone="info">{section.items.length}</Badge>
          <span className="ed-muted"> — each is a full editorial block on the home.</span>
        </p>
        <Button
          variant="accent"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              items: [...section.items, { id: uid("svc"), title: "", tagline: "", image: null, body: [], bullets: [], link: { label: "Read the full service", href: "/services" } }],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add a service
        </Button>
      </div>

      {section.items.length === 0 ? (
        <p className="ed-hint">No service sections yet — add one above.</p>
      ) : (
        <div className="ed-services">
          {section.items.map((svc, i) => (
            <details key={svc.id} className="ed-service" open={!svc.title}>
              <summary className="ed-service__summary">
                <span className="ed-service__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ed-service__name">{svc.title || "Untitled service"}</span>
                <MoveRowButtons label={svc.title || "service"} first={i === 0} last={i === section.items.length - 1} onUp={() => move(svc.id, -1)} onDown={() => move(svc.id, 1)} onRemove={() => onChange({ ...section, items: section.items.filter((s) => s.id !== svc.id) })} />
              </summary>
              <div className="ed-service__fields">
                <div className="field-grid field-grid--2">
                  <TextField label="Service title" htmlFor={`svc-title-${svc.id}`} value={svc.title} onChange={(v) => patchService(svc.id, { title: v })} />
                  <TextField label="Tagline" htmlFor={`svc-tagline-${svc.id}`} value={svc.tagline ?? ""} onChange={(v) => patchService(svc.id, { tagline: v || null })} />
                </div>
                <TextAreaField label="Body paragraphs (blank line between paragraphs)" htmlFor={`svc-body-${svc.id}`} rows={4} value={svc.body.join("\n\n")} onChange={(v) => patchService(svc.id, { body: v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) })} />
                <TextAreaField label="Included points (one per line)" htmlFor={`svc-bullets-${svc.id}`} rows={3} value={svc.bullets.join("\n")} onChange={(v) => patchService(svc.id, { bullets: v.split("\n").map((s) => s.trim()).filter(Boolean) })} />
                <div className="field-grid field-grid--2">
                  <TextField label="Link label" htmlFor={`svc-link-${svc.id}`} value={svc.link.label} onChange={(v) => patchService(svc.id, { link: { ...svc.link, label: v } })} />
                  <TextField label="Link destination" htmlFor={`svc-href-${svc.id}`} value={svc.link.href} onChange={(v) => patchService(svc.id, { link: { ...svc.link, href: v } })} />
                </div>
                <ImageField label="Service photo" htmlFor={`svc-image-${svc.id}`} value={svc.image} onChange={(v) => patchService(svc.id, { image: v })} />
              </div>
            </details>
          ))}
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
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <input id={`media-src-${index}-${media.kind}`} type="text" value={media.src} onChange={(e) => onChange({ ...media, src: e.target.value })} placeholder={media.kind === "video" ? "https://…/video.mp4" : "https://… or /media/…"} />
          {media.kind === "photo" ? (
            <Button variant="secondary" size="sm" onClick={() => setOpenPicker(true)}>
              Library
            </Button>
          ) : null}
        </div>
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

/* ------------------------------- main editor ------------------------------ */

function ctaFields(cta: Cta, onChange: (next: Cta) => void, key: string, labelPrefix: string) {
  return (
    <div className="field-grid field-grid--2">
      <TextField label={`${labelPrefix} label`} htmlFor={`cta-${key}-label`} value={cta.label} onChange={(v) => onChange({ ...cta, label: v })} />
      <TextField label={`${labelPrefix} destination`} htmlFor={`cta-${key}-href`} value={cta.href} onChange={(v) => onChange({ ...cta, href: v })} hint="Internal path or tel: link." />
    </div>
  );
}

export function LandingPageEditor({
  initialContent,
  sessionName,
}: {
  initialContent: LandingContent;
  sessionName?: string;
}) {
  const [content, setContent] = useState<LandingContent>(() => clone(initialContent));
  const savedJson = useRef(JSON.stringify(initialContent));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  const dirty = useMemo(() => JSON.stringify(content) !== savedJson.current, [content]);

  function patch(fn: (draft: LandingContent) => void) {
    setContent((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });
  }

  function clientIssues(): string[] {
    const issues: string[] = [];
    content.plans.items.forEach((card, i) => {
      if (!card.name.trim() || !card.price.trim()) issues.push(`Plan card ${i + 1} needs a name and a price before publishing.`);
    });
    content.blog.posts.forEach((post) => {
      post.media.forEach((m) => {
        if (!m.src.trim()) issues.push(`A ${m.kind} attachment on “${post.caption.slice(0, 30) || post.date || "new post"}” is missing its source.`);
      });
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
      setNotice({ tone: "success", msg: "Published — the public home at / now shows this document." });
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

  const { logo, contact, hero, rails, about, services, plans, blog, map } = content;

  return (
    <div className="stack-4">
      {/* status band — navy folio strip with live counts + publish */}
      <section className="ed-band">
        <div className="ed-band__grid">
          <div>
            <p className="ed-band__eyebrow">Public home · localhost:4000 /</p>
            <h2 className="ed-band__title">Everything visitors see, one store</h2>
            <p className="ed-band__lead">
              {sessionName ? `Good day, ${sessionName} — ` : ""}the home renders only from this
              document. Fix the rails (left {rails.left.items.length} · right {rails.right.items.length}),
              hero, about, services, {plans.items.length} plan card{plans.items.length === 1 ? "" : "s"} and {blog.posts.length} blog post{blog.posts.length === 1 ? "" : "s"},
              then publish below.
            </p>
            <div className="row" style={{ gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
              <Badge tone="info">Left rail {rails.left.items.length}</Badge>
              <Badge tone="info">Right rail {rails.right.items.length}</Badge>
              <Badge tone="neutral">{plans.items.length} plans</Badge>
              <Badge tone="neutral">{blog.posts.length} posts</Badge>
              {content.updated_at ? <Badge tone="success">Live on /</Badge> : <Badge tone="warning">Seed content</Badge>}
            </div>
          </div>
          <div className="ed-band__actions">
            <a href="/" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ color: "var(--color-text-inverse)" }}>
              <ExternalLink size={14} aria-hidden="true" /> Open live page
            </a>
            <Button variant="accent" size="sm" onClick={publish} disabled={busy || !dirty}>
              <Save size={14} aria-hidden="true" /> {busy ? "Publishing…" : dirty ? "Publish changes" : "Up to date"}
            </Button>
            {dirty ? (
              <Button variant="ghost" size="sm" onClick={discard} style={{ color: "var(--color-text-inverse)" }}>
                Discard
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}

      <EdSection
        num="01"
        title="Brand & 24/7 line"
        hint="The mark that sits top-left in the header and in the hero, and the phone visitors can reach any hour."
      >
        <div className="field-grid field-grid--3">
          <TextField label="Wordmark" htmlFor="logo-wordmark" value={logo.wordmark} onChange={(v) => patch((d) => void (d.logo.wordmark = v))} hint="Shown beside the mark in the header, hero and footer." />
          <div className="field-grid__span2">
            <ImageField label="Logo mark (optional)" htmlFor="logo-mark" value={logo.markImage} onChange={(v) => patch((d) => void (d.logo.markImage = v))} />
          </div>
        </div>
        <div className="field-grid field-grid--4">
          <TextField label="Phone label" htmlFor="contact-label" value={contact.phoneLabel} onChange={(v) => patch((d) => void (d.contact.phoneLabel = v))} />
          <TextField label="Phone number shown" htmlFor="contact-display" value={contact.phoneDisplay} onChange={(v) => patch((d) => void (d.contact.phoneDisplay = v))} />
          <TextField label="Call link" htmlFor="contact-href" value={contact.phoneHref} onChange={(v) => patch((d) => void (d.contact.phoneHref = v))} hint="e.g. tel:+63917…" />
          <TextField label="Location line" htmlFor="contact-location" value={contact.location} onChange={(v) => patch((d) => void (d.contact.location = v))} />
        </div>
      </EdSection>

      <EdSection num="02" title="Hero" hint="The first thing a grieving or planning family reads — two clear doors: need help now, or plan ahead.">
        <div className="field-grid field-grid--2">
          <TextField label="Eyebrow" htmlFor="hero-eyebrow" value={hero.eyebrow} onChange={(v) => patch((d) => void (d.hero.eyebrow = v))} />
        </div>
        <TextField label="Headline" htmlFor="hero-headline" value={hero.headline} onChange={(v) => patch((d) => void (d.hero.headline = v))} hint="Warm, dignified, short — this is the anchor line." />
        <TextAreaField label="Subline" htmlFor="hero-subline" rows={2} value={hero.subline} onChange={(v) => patch((d) => void (d.hero.subline = v))} />
        {ctaFields(hero.primaryCta, (next) => patch((d) => void (d.hero.primaryCta = next)), "primary", "I need help now button")}
        {ctaFields(hero.secondaryCta, (next) => patch((d) => void (d.hero.secondaryCta = next)), "secondary", "Plan ahead button")}
      </EdSection>

      <EdSection num="03" title="Left fixed rail" hint="Pinned care & services — any number, each with its photo. Stays frozen beside the scrolling page on desktop; the rail scrolls when the list grows.">
        <RailEditor side="left" config={rails.left} onChange={(next) => patch((d) => void (d.rails.left = next))} />
      </EdSection>

      <EdSection num="04" title="Right fixed rail" hint="Pinned plans & lots — any number, each with its photo. Same anchored behaviour on the right side.">
        <RailEditor side="right" config={rails.right} onChange={(next) => patch((d) => void (d.rails.right = next))} />
      </EdSection>

      <EdSection num="05" title="About · Mission · Vision" hint="The family-run soul of the park, with a real photo — the trust section.">
        <AboutEditor section={about} onChange={(next) => patch((d) => void (d.about = next))} />
      </EdSection>

      <EdSection num="06" title="Services in full detail" hint="Editorial sections, not cards — what happens, what's included, how to begin.">
        <ServicesEditor section={services} onChange={(next) => patch((d) => void (d.services = next))} />
      </EdSection>

      <EdSection num="07" title="Plans — designed card grid" hint="Every card carries a real photo, name and honest price; add as many as you want (not a spreadsheet).">
        <PlanCardsEditor section={plans} onChange={(next) => patch((d) => void (d.plans = next))} />
      </EdSection>

      <EdSection num="08" title="Blog — rich newsfeed posts" hint="A caption plus as many photos/videos as you like, laid out like a newsfeed (single / pair / gallery, video inline). No like/share row — by design.">
        <BlogEditor section={blog} onChange={(next) => patch((d) => void (d.blog = next))} />
      </EdSection>

      <EdSection num="09" title="Live park map copy" hint="The interactive map itself always shows the real lot listing; the heading + intro are yours to word.">
        <MapEditor section={map} onChange={(next) => patch((d) => void (d.map = next))} />
      </EdSection>
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

export default LandingPageEditor;
