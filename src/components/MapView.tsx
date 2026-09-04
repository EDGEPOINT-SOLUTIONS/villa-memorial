// Memorial-park map — aerial image with named, draggable markers (dots).
// - Admin (editable): click empty area to add a named point, drag to reposition.
// - Public (read-only): dots are clickable → parent opens an "inquire" panel.
// The list view remains a first-class sibling for accessibility.

import { useRef, useState } from "react";
import type { Lot, LotStatus } from "../lib/data";

const MAP_BACKGROUND =
  "https://static.vecteezy.com/system/resources/thumbnails/073/015/761/small_2x/drone-view-showing-rows-of-tombs-and-place-of-sorrow-and-memory-cemetery-on-bright-sunny-day-video.jpg";
const MAP_BACKGROUND_FALLBACK = "https://picsum.photos/seed/memorial-park-aerial/1400/900";

const STATUS_COLOR: Record<LotStatus, string> = {
  Available: "var(--sage-500)",
  Reserved: "var(--steel-500)",
  Sold: "var(--taupe-500)",
  Occupied: "var(--granite-600)",
  Maintenance: "var(--amber-500)",
  Transferred: "var(--indigo-500)",
};

const LEGEND: LotStatus[] = [
  "Available",
  "Reserved",
  "Sold",
  "Occupied",
  "Maintenance",
  "Transferred",
];

export function MapLegend() {
  return (
    <div
      style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}
      aria-label="Map legend"
    >
      {LEGEND.map((s) => (
        <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: STATUS_COLOR[s],
              display: "inline-block",
            }}
          />
          <span className="small muted">{s}</span>
        </span>
      ))}
    </div>
  );
}

type Pos = { x: number; y: number }; // percentages 0..100

// Spread lots across the image by section (percent positions).
const SECTION_POS: Record<string, Pos[]> = {
  "Garden of Roses": [
    { x: 18, y: 26 }, { x: 36, y: 24 }, { x: 54, y: 28 }, { x: 24, y: 38 }, { x: 44, y: 40 },
  ],
  "Garden of Remembrance": [
    { x: 18, y: 58 }, { x: 36, y: 56 }, { x: 54, y: 60 }, { x: 26, y: 70 }, { x: 46, y: 72 },
  ],
  "Evergreen Hill": [
    { x: 74, y: 28 }, { x: 88, y: 26 }, { x: 76, y: 46 }, { x: 90, y: 48 },
  ],
};

function initialPositions(lots: Lot[]): Map<string, Pos> {
  const map = new Map<string, Pos>();
  const bySection: Record<string, Lot[]> = {};
  for (const lot of lots) {
    (bySection[lot.section] ??= []).push(lot);
  }
  for (const [section, pts] of Object.entries(SECTION_POS)) {
    const members = bySection[section] ?? [];
    members.forEach((lot, i) => {
      const p = pts[i % pts.length];
      if (p) map.set(lot.id, p);
    });
  }
  return map;
}

export function MapView({
  lots,
  selectedId,
  onSelect,
  editable = false,
  onAdd,
}: {
  lots: Lot[];
  selectedId?: string | null;
  onSelect: (lot: Lot) => void;
  editable?: boolean;
  onAdd?: (name: string, x: number, y: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, Pos>>(() => initialPositions(lots));
  const [draft, setDraft] = useState<Pos | null>(null);
  const [draftName, setDraftName] = useState("");
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

  const [bg, setBg] = useState(MAP_BACKGROUND);

  function toPct(clientX: number, clientY: number): Pos {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    };
  }

  function onMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!editable) return;
    const p = toPct(e.clientX, e.clientY);
    setDraft(p);
    setDraftName("");
  }

  function confirmAdd() {
    if (onAdd && draft && draftName.trim()) {
      onAdd(draftName.trim(), draft.x, draft.y);
    }
    setDraft(null);
    setDraftName("");
  }

  function onMarkerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    dragRef.current = { id, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const lot = lots.find((l) => l.id === id);
    if (lot) onSelect(lot);
  }

  function onMarkerMove(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!dragRef.current || dragRef.current.id !== id) return;
    dragRef.current.moved = true;
    const p = toPct(e.clientX, e.clientY);
    setPositions((prev) => {
      const next = new Map(prev);
      next.set(id, { x: Math.max(2, Math.min(98, p.x)), y: Math.max(4, Math.min(96, p.y)) });
      return next;
    });
  }

  function onMarkerUp() {
    dragRef.current = null;
  }

  return (
    <div>
      <div className="park-map" ref={wrapRef} onPointerDown={onMapPointerDown}>
        <img
          className="park-map__img"
          src={bg}
          alt="Memorial park overview"
          draggable={false}
          onError={() => setBg(MAP_BACKGROUND_FALLBACK)}
        />

        {lots.map((lot) => {
          const p = positions.get(lot.id) ?? { x: 50, y: 50 };
          const selected = lot.id === selectedId;
          return (
            <button
              key={lot.id}
              className={`marker${selected ? " marker--selected" : ""}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onPointerDown={(e) => onMarkerDown(e, lot.id)}
              onPointerMove={(e) => onMarkerMove(e, lot.id)}
              onPointerUp={onMarkerUp}
              onPointerCancel={onMarkerUp}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(lot);
                }
              }}
              aria-label={`${lot.code} — ${lot.section} — ${lot.status}`}
            >
              <span className="marker__label">{lot.code}</span>
              <span className="marker__dot" style={{ background: STATUS_COLOR[lot.status] }} />
            </button>
          );
        })}

        {draft ? (
          <div
            className="park-map__draft"
            style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAdd();
                if (e.key === "Escape") setDraft(null);
              }}
              placeholder="Name this area"
              aria-label="New marker name"
            />
            <button className="btn btn--primary btn--sm" onClick={confirmAdd} type="button">
              Save
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setDraft(null)}
              type="button"
            >
              ✕
            </button>
          </div>
        ) : null}

        {editable ? (
          <div className="park-map__hint">
            Click an empty area to add a named point · drag a dot to move it
          </div>
        ) : null}
      </div>

      <p className="small muted" style={{ padding: "var(--space-3) var(--space-1) 0" }}>
        {editable
          ? "Dots are placed on the park overview and labelled by an administrator. The list view shows the same lots for precise work."
          : "Each dot is a lot you can enquire about. For an accessible alternative, staff use the list view."}
      </p>
    </div>
  );
}
