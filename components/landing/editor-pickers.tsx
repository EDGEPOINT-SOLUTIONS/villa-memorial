"use client";

/**
 * Editor pickers — modal pickers shared by the Landing Page editor.
 *  - MediaPicker: attach a photo from THREE sources — the real uploaded media
 *    library, a REAL device upload (components/landing/device-uploader.tsx,
 *    stored through the fixture store like every edit), or any public URL —
 *    for logos, about photos, plan cards, blog media and more.
 *  - RailPicker: choose what to pin to a fixed rail from the REAL catalogue
 *    (services/plans/products/links, priced from lib/villa-pricing.ts) — never an
 *    invented offer.
 */
import { useEffect, useState } from "react";
import { X, Search, Image as ImageIcon, Link2, UploadCloud, CheckSquare, Check, Square } from "lucide-react";
import { MEDIA_LIBRARY } from "@/lib/media";
import type { CatalogueEntry } from "@/lib/landing/catalogue";
import { buildRailCatalogue } from "@/lib/landing/catalogue";
import type { LotCategory, PlanPricing } from "@/lib/pricing-model";
import type { RailItemKind } from "@/lib/api-client/landing";
import { DeviceUploader } from "@/components/landing/device-uploader";

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

/** Three ways to attach a photo — the same real uploaded library, a file from
 * the staff device (stored through the fixture store), or any public URL. */
type MediaSourceTab = "library" | "device" | "url";

const MEDIA_TABS: Array<{ id: MediaSourceTab; label: string; icon: React.ReactNode }> = [
  { id: "library", label: "Photo library", icon: <ImageIcon size={15} aria-hidden="true" /> },
  { id: "device", label: "Upload from device", icon: <UploadCloud size={15} aria-hidden="true" /> },
  { id: "url", label: "Image URL", icon: <Link2 size={15} aria-hidden="true" /> },
];

export function MediaPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (src: string) => void;
}) {
  const [tab, setTab] = useState<MediaSourceTab>("library");
  const [customUrl, setCustomUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <ModalShell
      open={open}
      eyebrow="Photo source"
      title="Choose a photo"
      onClose={onClose}
      width="54rem"
    >
      <div className="ed-source-tabs" role="tablist" aria-label="Photo source">
        {MEDIA_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`ed-source-tab${tab === t.id ? " ed-source-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div>
          <p className="ed-hint">
            Pick a real uploaded park photo. The same library feeds the public home.
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
        </div>
      ) : null}

      {tab === "device" ? (
        <div>
          <p className="ed-hint">
            Pick a local image file from this device — a logo, a park photo, anything. No
            backend needed: it is stored with the document like every other edit here.
          </p>
          <DeviceUploader
            onPick={(src) => {
              onPick(src);
            }}
          />
        </div>
      ) : null}

      {tab === "url" ? (
        <div className="ed-custom-url ed-custom-url--tab">
          <p className="ed-hint">
            Paste a public image URL (https://… or an in-app /media/… path).
          </p>
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
      ) : null}
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

/** Stable key for one catalogue entry (kind+title is unique per catalogue). */
const entryKey = (e: CatalogueEntry) => `${e.kind}::${e.title}`;

export function RailPicker({
  open,
  side,
  lotCategories,
  planPricing,
  onClose,
  onAdd,
  onAddMany,
}: {
  open: boolean;
  side: "left" | "right";
  /** LIVE pricing document slices — the picker's price lines track office edits. */
  lotCategories?: ReadonlyArray<LotCategory>;
  planPricing?: PlanPricing;
  onClose: () => void;
  /** Instant single pin — clicking a catalogue row pins that one item. */
  onAdd: (entry: CatalogueEntry) => void;
  /** Bulk pin — several selected items pinned to the rail in one step. */
  onAddMany: (entries: CatalogueEntry[]) => void;
}) {
  const [groups, setGroups] = useState<ReturnType<typeof buildRailCatalogue> | null>(null);
  const [filter, setFilter] = useState("");
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && !groups) setGroups(buildRailCatalogue({ lotCategories, planPricing }));
    // The first open snapshots the pricing document for this editing session;
    // a price edit lands in /staff/pricing, not mid-pin, so no refetch is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see note above
  }, [open, groups]);

  // Each open starts clean: no stale bulk selection from a previous session.
  useEffect(() => {
    if (open) {
      setBulk(false);
      setSelected(new Set());
    }
  }, [open]);

  if (!open) return null;

  const title = side === "left" ? "Pin to the left rail" : "Pin to the right rail";
  const matches = (e: CatalogueEntry) =>
    !filter.trim() ||
    e.title.toLowerCase().includes(filter.toLowerCase()) ||
    (e.caption ?? "").toLowerCase().includes(filter.toLowerCase());
  const visible = (groups ?? [])
    .map((g) => ({ ...g, entries: g.entries.filter(matches) }))
    .filter((g) => g.entries.length > 0);
  const visibleEntries = visible.flatMap((g) => g.entries);
  const visibleKeys = new Set(visibleEntries.map(entryKey));
  const allVisibleSelected =
    visibleEntries.length > 0 && visibleEntries.every((e) => selected.has(entryKey(e)));

  const toggle = (e: CatalogueEntry) => {
    const key = entryKey(e);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const k of visibleKeys) next.delete(k);
      } else {
        for (const k of visibleKeys) next.add(k);
      }
      return next;
    });
  };

  const pinSelected = () => {
    const entries = (groups ?? [])
      .flatMap((g) => g.entries)
      .filter((e) => selected.has(entryKey(e)));
    if (entries.length === 0) return;
    onAddMany(entries);
    setSelected(new Set());
    setBulk(false);
  };

  return (
    <ModalShell open={open} eyebrow="Fixed rail · pin any number" title={title} onClose={onClose} width="56rem">
      <p className="ed-hint">
        Pick from the real catalogue (services, plans &amp; lots, products, links). Pin one with a
        click, or switch to bulk pin to select several at once — the rail scrolls, so pin as many
        as you want.
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

      <div className="ed-catalogue-tools">
        {bulk ? (
          <>
            <button
              type="button"
              className="ed-tool-btn"
              disabled={visibleEntries.length === 0}
              onClick={toggleAllVisible}
            >
              {allVisibleSelected ? "Deselect all shown" : "Select all shown"}
            </button>
            <span className="ed-chip">{selected.size} selected</span>
          </>
        ) : (
          <button type="button" className="ed-tool-btn ed-tool-btn--accent" onClick={() => setBulk(true)}>
            <CheckSquare size={14} aria-hidden="true" /> Bulk pin several
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="ed-hint">Nothing matches “{filter}”.</p>
      ) : (
        <div className="ed-catalogue">
          {visible.map((group) => (
            <div className="ed-catalogue__group" key={group.label}>
              <h3 className="ed-catalogue__label">{group.label}</h3>
              {group.entries.map((entry) => {
                const key = entryKey(entry);
                const isSelected = selected.has(key);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`ed-catalogue__row${bulk ? " ed-catalogue__row--bulk" : ""}${isSelected ? " ed-catalogue__row--selected" : ""}`}
                    aria-pressed={bulk ? isSelected : undefined}
                    onClick={() => (bulk ? toggle(entry) : onAdd(entry))}
                  >
                    {bulk ? (
                      <span className="ed-catalogue__pick" aria-hidden="true">
                        {isSelected ? <Check size={14} /> : <Square size={14} />}
                      </span>
                    ) : null}
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
                    {!bulk ? <span className="btn btn--primary btn--sm">Pin</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {bulk ? (
        <div className="ed-bulk-bar">
          <p className="ed-hint">
            Selected items are pinned in one step, in catalogue order — reorder or remove them
            afterwards in the pinned list below.
          </p>
          <div className="ed-bulk-bar__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setBulk(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              disabled={selected.size === 0}
              onClick={pinSelected}
            >
              <CheckSquare size={14} aria-hidden="true" />
              Pin {selected.size > 0 ? selected.size : ""} {selected.size === 1 ? "item" : "items"}
            </button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
