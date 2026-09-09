"use client";

/**
 * Editor pickers — modal pickers shared by the Landing Page editor.
 *  - MediaPicker: choose a real uploaded asset from the media library (or paste
 *    any public URL) for logos, about photos, plan cards, rail items, blog media.
 *  - RailPicker: choose what to pin to a fixed rail from the REAL catalogue
 *    (services/plans/products/links, priced from lib/villa-pricing.ts) — never an
 *    invented offer.
 */
import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { MEDIA_LIBRARY } from "@/lib/media";
import type { CatalogueEntry } from "@/lib/landing/catalogue";
import { buildRailCatalogue } from "@/lib/landing/catalogue";
import type { RailItemKind } from "@/lib/api-client/landing";

/* --------------------------------- shell ---------------------------------- */

function ModalShell({
  open,
  title,
  eyebrow,
  onClose,
  children,
  width = "44rem",
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ed-modal__backdrop" onClick={onClose} />
      <div className="ed-modal__panel" style={{ maxWidth: width }}>
        <header className="ed-modal__head">
          <div>
            {eyebrow ? <p className="ed-modal__eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <button type="button" className="quick-menu__close" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="ed-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------- media picker ---------------------------- */

export function MediaPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (src: string) => void;
}) {
  const [customUrl, setCustomUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <ModalShell
      open={open}
      eyebrow="Photo library"
      title="Choose a photo"
      onClose={onClose}
      width="52rem"
    >
      <p className="ed-hint">
        Pick a real uploaded park photo, or paste a public image URL below. The same library
        feeds the public home.
      </p>
      <div className="ed-media-grid">
        {MEDIA_LIBRARY.map((m) => (
          <button
            type="button"
            key={m.src}
            className={`ed-media-card${copied === m.src ? " ed-media-card--picked" : ""}`}
            onClick={() => {
              onPick(m.src);
              setCopied(m.src);
              window.setTimeout(() => setCopied(null), 900);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnail */}
            <img src={m.src} alt={m.label} loading="lazy" />
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      <div className="ed-custom-url">
        <label htmlFor="ed-media-url" className="ed-label">
          …or paste an image URL
        </label>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <input
            id="ed-media-url"
            type="text"
            value={customUrl}
            placeholder="https://…  or  /media/…"
            onChange={(e) => setCustomUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!customUrl.trim()}
            onClick={() => {
              if (customUrl.trim()) onPick(customUrl.trim());
            }}
          >
            Use this URL
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* -------------------------------- rail picker ------------------------------ */

const KIND_LABEL: Record<RailItemKind, string> = {
  service: "Service",
  product: "Product",
  plan: "Plan",
  link: "Link",
};

export function RailPicker({
  open,
  side,
  onClose,
  onAdd,
}: {
  open: boolean;
  side: "left" | "right";
  onClose: () => void;
  onAdd: (entry: CatalogueEntry) => void;
}) {
  const [groups, setGroups] = useState<ReturnType<typeof buildRailCatalogue> | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open && !groups) setGroups(buildRailCatalogue());
  }, [open, groups]);

  if (!open) return null;

  const title = side === "left" ? "Pin to the left rail" : "Pin to the right rail";
  const matches = (e: CatalogueEntry) =>
    !filter.trim() ||
    e.title.toLowerCase().includes(filter.toLowerCase()) ||
    (e.caption ?? "").toLowerCase().includes(filter.toLowerCase());
  const visible = (groups ?? []).map((g) => ({ ...g, entries: g.entries.filter(matches) })).filter((g) => g.entries.length > 0);

  return (
    <ModalShell open={open} eyebrow="Fixed rail · pin any number" title={title} onClose={onClose} width="56rem">
      <p className="ed-hint">
        Pick from the real catalogue (services, plans &amp; lots, products, links). Each pinned
        item carries its photo, and the rail scrolls — pin as many as you want.
      </p>
      <div className="ed-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search the catalogue…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {visible.length === 0 ? (
        <p className="ed-hint">Nothing matches “{filter}”.</p>
      ) : (
        <div className="ed-catalogue">
          {visible.map((group) => (
            <div className="ed-catalogue__group" key={group.label}>
              <h3 className="ed-catalogue__label">{group.label}</h3>
              {group.entries.map((entry) => (
                <button
                  type="button"
                  key={`${entry.kind}-${entry.title}`}
                  className="ed-catalogue__row"
                  onClick={() => onAdd(entry)}
                >
                  <span className="rail-thumb">
                    {entry.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- catalogue photo
                      <img src={entry.image} alt="" loading="lazy" />
                    ) : (
                      <span className="rail-thumb--fallback" aria-hidden="true">
                        {(entry.title.charAt(0) || "•").toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="ed-catalogue__text">
                    <span className="ed-catalogue__title">{entry.title}</span>
                    <span className="ed-catalogue__meta">
                      <span className="ed-kind">{KIND_LABEL[entry.kind]}</span>
                      {entry.price ? <span className="ed-price">{entry.price}</span> : null}
                      {entry.caption ? <span className="ed-muted"> · {entry.caption}</span> : null}
                    </span>
                  </span>
                  <span className="btn btn--primary btn--sm">Pin</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
