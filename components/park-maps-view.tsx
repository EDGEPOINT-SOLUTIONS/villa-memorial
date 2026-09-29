"use client";

/**
 * ParkMapsView — the Villa Memorial Park map with a SIMPLE admin editor:
 *  - (a park switcher appears only when the store carries more than one park;
 *    this product carries ONE, so it does not render)
 *  - IMAGE: upload · resize slider · lock image
 *  - PLOTS (CIRCLES): “+ Add plot” → just CLICK on the map to place a circle;
 *    set radius first; “Move plots” → click-drag a plot; delete selected demo
 *    plots; lock plots. Overlap is prevented with a friendly message.
 *
 * One shared store (lib/park-maps): staff edits appear on the customer side.
 * Persistence is demo-local (localStorage) — real sync awaits the dev contract.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  addLegendEntry,
  DEFAULT_LEGEND,
  legendEntry,
  legendList,
  LEGEND_IMAGE_OPTIONS,
  removeLegendEntry,
  updateLegendEntry,
} from "@/lib/park-maps";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  activeParkId,
  clearParkImage,
  getParkMeta,
  loadParkImage,
  nextAreaCode,
  parkAreas,
  parksList,
  resetParkDemo,
  saveParkAreas,
  saveParkImage,
  saveParkMeta,
  setActiveParkId,
  useParkStore,
  type PlotArea,
} from "@/lib/park-maps";
import { withLiveLotRecords } from "@/lib/park-live-lots";
import { parkMapImage } from "@/lib/media";

const ParksCanvas = dynamic(() => import("@/components/parks-canvas").then((m) => m.ParksCanvas), {
  ssr: false,
  loading: () => <div className="geo-map geo-map--loading">Loading map…</div>,
});

const MIN_SIZE = 0.5;
const MAX_SIZE = 12;

/** Keep a circle fully inside the frame given its radius. */
/** Translate a polygon whole (shape-preserving) — never squash at edges. */
function freeTranslate(outline: Array<[number, number]>, dx: number, dy: number): Array<[number, number]> {
  return outline.map((p) => [Math.round((p[0] + dx) * 10) / 10, Math.round((p[1] + dy) * 10) / 10] as [number, number]);
}

export function ParkMapsView({
  canEdit = false,
  selectedCode,
  liveStatusById = {},
  liveOwnerById = {},
  initialParkId,
  autoSelectCode,
  onSelect,
  onParkChange,
}: {
  canEdit?: boolean;
  selectedCode?: string | null;
  liveStatusById?: Record<string, string>;
  liveOwnerById?: Record<string, string>;
  initialParkId?: string;
  autoSelectCode?: string;
  onSelect: (area: PlotArea, parkId: string) => void;
  /** Told when the visitor switches park — the host shares this selection. */
  onParkChange?: (parkId: string) => void;
}) {
  useParkStore();
  const parks = parksList();
  const parkChangeRef = useRef(onParkChange);
  parkChangeRef.current = onParkChange;
  const [parkId, setParkId] = useState<string>(() => {
    if (initialParkId && parks.some((p) => p.id === initialParkId)) return initialParkId;
    return parks[0].id;
  });
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = activeParkId();
    // A deep link (?park=) wins over the remembered park.
    if (!initialParkId && stored && stored !== parkId) {
      setParkId(stored);
      parkChangeRef.current?.(stored);
    }
    if (initialParkId && initialParkId !== parkId) {
      setParkId(initialParkId);
      parkChangeRef.current?.(initialParkId);
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the uploaded image for the active park (IndexedDB).
  useEffect(() => {
    let cancelled = false;
    if (!mounted) return;
    loadParkImage(parkId)
      .then((img) => {
        if (!cancelled) setCustomImage(img);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mounted, parkId]);

  const park = parks.find((p) => p.id === parkId) ?? parks[0];
  const meta = mounted
    ? getParkMeta(park.id)
    : { scale: 1, imageLocked: false, plotsLocked: false, customImage: undefined };
  const imageLocked = meta.imageLocked;
  const plotsLocked = meta.plotsLocked;
  // A staff-uploaded image wins; otherwise the park's own masterplan, painted
  // through `parkMapImage` so a browser loads its 209 KB WebP derivative instead
  // of the client's 2,331 KB PNG. Same 1254 × 1254 pixels, so every plot
  // coordinate and the canvas's natural-size fit are unaffected.
  const image = customImage || parkMapImage(park.image);
  const areas = mounted ? parkAreas(park.id) : [];
  const effectiveAreas: PlotArea[] = withLiveLotRecords(areas, {
    statusById: liveStatusById,
    ownerById: liveOwnerById,
  });

  // Auto-select a plot from a deep link (?plot=CODE) once areas are ready.
  useEffect(() => {
    if (!mounted || !autoSelectCode) return;
    const code = autoSelectCode.toUpperCase();
    const target = effectiveAreas.find((a) => a.code.toUpperCase() === code);
    if (target) handleSelectArea(target, parkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, parkId, autoSelectCode, effectiveAreas.length]);

  const [mode, setMode] = useState<"view" | "place" | "move">("view");
  const [plotSize, setPlotSize] = useState(2);
  const [plotTypeId, setPlotTypeId] = useState<string>(DEFAULT_LEGEND[0].id);
  const [newLegendName, setNewLegendName] = useState("");
  const [localSel, setLocalSel] = useState<string | null>(null);
  const activeSel = selectedCode ?? localSel;
  const [message, setMessage] = useState<{ tone: "info" | "success" | "danger"; text: string } | null>(null);
  const [legendTick, setLegendTick] = useState(0);
  const legend = mounted ? legendList() : DEFAULT_LEGEND;

  function typeCount(typeId?: string): number {
    return effectiveAreas.filter((a) => a.typeId === typeId).length;
  }

  // Keep the chosen new-plot type valid when the legend changes.
  useEffect(() => {
    if (mounted && legend.length && !legend.some((e) => e.id === plotTypeId)) {
      setPlotTypeId(legend[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, legendTick]);

  function choosePark(id: string) {
    setParkId(id);
    setActiveParkId(id);
    setMode("view");
    setMessage(null);
    parkChangeRef.current?.(id);
  }

  function updateMeta(patch: Partial<ReturnType<typeof getParkMeta>>) {
    saveParkMeta(park.id, patch);
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ tone: "danger", text: "Please choose an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      try {
        await saveParkImage(park.id, dataUrl);
        setCustomImage(dataUrl);
        setMessage({ tone: "success", text: "Image updated for " + park.name + " (" + Math.round(file.size / 1024 / 1024 * 10) / 10 + " MB)." });
      } catch {
        setMessage({ tone: "danger", text: "Could not store that image in this browser." });
      }
    };
    reader.readAsDataURL(file);
  }

  function placeSquare(x: number, y: number, size: number) {
    // Plots can go ANYWHERE — coordinates are used as clicked (no clamping).
    const h = size / 2;
    const code = nextAreaCode(areas, park.name);
    const round = (n: number) => Math.round(n * 10) / 10;
    const candidate: PlotArea = {
      id: `${park.id}-${code.toLowerCase()}`,
      code,
      lot_id: null,
      status: "available",
      typeId: plotTypeId,
      outline: [
        [round(x - h), round(y - h)],
        [round(x + h), round(y - h)],
        [round(x + h), round(y + h)],
        [round(x - h), round(y + h)],
      ],
    };
    saveParkAreas(park.id, [...areas, candidate]);
    setMessage({ tone: "success", text: `Plot ${code} added.` });
    onSelect(candidate, park.id);
    // keep placing — click again for more; press “Done” to stop.
  }

  function handleMove(areaId: string, dx: number, dy: number) {
    const next = areas.map((a) => {
      if (a.id !== areaId) return a;
      if (a.circle) {
        return { ...a, circle: { x: Math.round((a.circle.x + dx) * 10) / 10, y: Math.round((a.circle.y + dy) * 10) / 10, r: a.circle.r } };
      }
      return { ...a, outline: freeTranslate(a.outline!, dx, dy) };
    });
    saveParkAreas(park.id, next);
    setMessage({ tone: "success", text: "Plot moved." });
  }

  function handleSelectArea(area: PlotArea, pId: string) {
    setLocalSel(area.code);
    onSelect(area, pId);
  }

  async function resetDemo() {
    if (!window.confirm("Reset ALL park demo data back to the fresh sample (plots, sizes, locks, images)?")) return;
    await resetParkDemo().catch(() => {});
    setCustomImage(null);
    setParkId(parks[0].id);
    setLocalSel(null);
    setMode("view");
    setMessage({ tone: "success", text: "Demo data reset to the fresh sample." });
  }

  function deleteArea(area: PlotArea) {
    if (area.lot_id) {
      setMessage({ tone: "danger", text: "Linked sellable lots can't be deleted here." });
      return;
    }
    saveParkAreas(
      park.id,
      areas.filter((a) => a.id !== area.id),
    );
    setLocalSel((cur) => (cur === area.code ? null : cur));
    setMessage({ tone: "success", text: `Plot ${area.code} removed.` });
  }

  return (
    <div className="stack-4">
      {/* Sections below are drawn on the map image, so the outline needs one
          heading before the legend/editor sub-headings (h1 → h3 would skip). */}
      <h2 className="visually-hidden">Park map</h2>
      {/* The park switcher exists only for a real multi-park store. This product
          carries Villa Memorial Park alone, so there is nothing to switch. */}
      {parks.length > 1 ? (
        <div className="row row--wrap" style={{ justifyContent: "space-between" }}>
          <nav className="row row--wrap" aria-label="Choose park map">
            {parks.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pill-toggle${p.id === park.id ? " pill-toggle--active" : ""}`}
                onClick={() => choosePark(p.id)}
              >
                {p.name}
              </button>
            ))}
          </nav>
        </div>
      ) : null}

      <p className="text-sm text-muted" style={{ marginBottom: 0 }}>
        {park.name} · {park.branch} — click a plot to inspect
        {canEdit ? "; staff can add circular plots" : "."}
      </p>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {canEdit ? (
        <div className="card">
          <div className="card__body stack-4">
            {/* Legend — plot types (unlimited) */}
            <div className="row row--wrap" style={{ justifyContent: "space-between" }}>
              <h3 className="mb-0 text-md">Legend — plot types</h3>
              <span className="text-sm text-muted">unlimited · every plot must carry a type</span>
            </div>
            <div
              className="stack"
              style={{
                maxHeight: "15rem",
                overflowY: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
              }}
            >
              {legend.map((e) => (
                <div
                  key={e.id}
                  className="row row--wrap"
                  style={{
                    gap: "var(--space-2)",
                    justifyContent: "space-between",
                    padding: "var(--space-2) 0",
                    borderBottom: "1px solid var(--color-border-soft)",
                  }}
                >
                  <span className="row" style={{ gap: "var(--space-2)", minWidth: 0, flex: "1 1 16rem" }}>
                    <i aria-hidden className="dot" style={{ background: e.color }} />
                    <span className="text-sm" style={{ overflowWrap: "anywhere" }}>
                      <strong>{e.name}</strong>{" "}
                      <span className="text-muted">· {typeCount(e.id)} plot(s)</span>
                    </span>
                    {e.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- attached legend photo
                      <img src={e.image} alt={e.name} style={{ width: "2.2rem", height: "2.2rem", objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                    ) : null}
                  </span>
                  <span className="row" style={{ gap: "var(--space-2)" }}>
                    <input
                      type="color"
                      value={e.color}
                      aria-label={"Colour for " + e.name}
                      style={{ width: "2.2rem", height: "2rem", padding: 0, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}
                      onChange={(ev) => {
                        updateLegendEntry(e.id, { color: ev.target.value });
                        setLegendTick((t) => t + 1);
                      }}
                    />
                    <select
                      aria-label={"Image for " + e.name}
                      value={e.image ?? ""}
                      onChange={(ev) => {
                        updateLegendEntry(e.id, { image: ev.target.value || undefined });
                        setLegendTick((t) => t + 1);
                      }}
                    >
                      {LEGEND_IMAGE_OPTIONS.map((o) => (
                        <option key={o.value || "none"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={legend.length <= 1}
                      title="Plots of this type fall back to their status colour"
                      onClick={() => {
                        removeLegendEntry(e.id);
                        setLegendTick((t) => t + 1);
                      }}
                    >
                      Remove
                    </Button>
                  </span>
                </div>
              ))}
            </div>
            <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
              <input
                value={newLegendName}
                placeholder="New legend type — e.g. MAIN ROAD"
                className="input"
                style={{ flex: "1 1 18rem" }}
                aria-label="New legend type name"
                onChange={(e) => setNewLegendName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const entry = addLegendEntry(newLegendName);
                    setNewLegendName("");
                    setPlotTypeId(entry.id);
                    setLegendTick((t) => t + 1);
                  }
                }}
              />
              <Button
                size="sm"
                variant="accent"
                onClick={() => {
                  if (!newLegendName.trim()) {
                    setMessage({ tone: "danger", text: "Type a name for the new legend entry first." });
                    return;
                  }
                  const entry = addLegendEntry(newLegendName);
                  setNewLegendName("");
                  setPlotTypeId(entry.id);
                  setLegendTick((t) => t + 1);
                  setMessage({ tone: "success", text: `Legend type “${entry.name}” added.` });
                }}
              >
                + Add legend type
              </Button>
            </div>

            {/* Image */}
            <div className="row row--wrap" style={{ justifyContent: "space-between" }}>
              <h3 className="mb-0 text-md">Image</h3>
              <div className="row">
                <Button size="sm" variant="secondary" disabled={imageLocked} onClick={() => fileRef.current?.click()}>
                  Upload image
                </Button>
                <Button size="sm" variant={imageLocked ? "primary" : "ghost"} onClick={() => updateMeta({ imageLocked: !imageLocked })}>
                  {imageLocked ? "Image locked" : "Lock image"}
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" aria-label="Upload map image" className="visually-hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null)} />
            </div>

            {!imageLocked ? (
              <div className="row row--wrap">
                <label className="row" style={{ gap: "var(--space-2)" }}>
                  <span className="text-sm text-muted">Resize:</span>
                  <input
                    type="range"
                    min={0.4}
                    max={4}
                    step={0.1}
                    value={meta.scale}
                    onChange={(e) => updateMeta({ scale: Number(e.target.value) })}
                    aria-label="Resize park image (40-400%)"
                  />
                  <span className="text-sm text-muted">{Math.round(meta.scale * 100)}% (max 400%)</span>
                </label>
                {customImage ? (
                  <Button size="sm" variant="ghost" onClick={async () => { await clearParkImage(park.id).catch(() => {}); updateMeta({ scale: 1 }); setCustomImage(null); setMessage({ tone: "success", text: "Reverted to the sample image at 100%." }); }}>
                    Reset image
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => updateMeta({ scale: 1 })}>
                    Fit (100%)
                  </Button>
                )}
                <span className="text-sm text-muted">(you can zoom out past the image to see it fully)</span>
              </div>
            ) : null}

            {/* Plots (circles) */}
            <div className="row row--wrap" style={{ justifyContent: "space-between" }}>
              <h3 className="mb-0 text-md">Plots</h3>
              <div className="row">
                {mode === "place" ? (
                  <Button size="sm" variant="secondary" onClick={() => { setMode("view"); setMessage(null); }}>
                    Done placing
                  </Button>
                ) : (
                  <Button size="sm" disabled={plotsLocked} onClick={() => { setMode("place"); setMessage(null); }}>
                    + Add plot
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={plotsLocked || mode === "place"}
                  onClick={() => { setMode(mode === "move" ? "view" : "move"); setMessage(null); }}
                >
                  {mode === "move" ? "Stop moving" : "Move plots"}
                </Button>
                <Button size="sm" variant={plotsLocked ? "primary" : "ghost"} onClick={() => updateMeta({ plotsLocked: !plotsLocked })}>
                  {plotsLocked ? "Plots locked" : "Lock plots"}
                </Button>
                <Button size="sm" variant="danger" onClick={resetDemo}>
                  Reset demo data
                </Button>
              </div>
            </div>

            <div className="row row--wrap">
              <label className="row" style={{ gap: "var(--space-2)" }}>
                <span className="text-sm text-muted">Plot size:</span>
                <input
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={0.25}
                  value={plotSize}
                  onChange={(e) => setPlotSize(Number(e.target.value))}
                  aria-label="New plot size"
                />
                <span className="text-sm text-muted">{Math.round(plotSize * 100) / 100}</span>
              </label>
              <span className="text-sm text-muted">
                {plotsLocked
                  ? "Plots are locked."
                  : mode === "place"
                    ? "Click anywhere on the map to place a SQUARE plot — no area limits."
                    : mode === "move"
                      ? "Click and drag a plot to move it."
                      : "Add plots or move them — then lock when the layout is final."}
              </span>
            </div>
            <div className="row row--wrap">
              <label className="row" style={{ gap: "var(--space-2)" }}>
                <span className="text-sm text-muted">New plot type (required):</span>
                <select
                  value={plotTypeId}
                  disabled={plotsLocked}
                  aria-label="Plot type for new plots"
                  onChange={(e) => setPlotTypeId(e.target.value)}
                >
                  {legend.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <ParksCanvas
        parkId={park.id}
        image={image}
        scale={meta.scale}
        areas={effectiveAreas}
        mode={canEdit && !plotsLocked ? mode : "view"}
        plotSize={plotSize}
        selectedCode={activeSel}
        legendById={Object.fromEntries(legend.map((e) => [e.id, e]))}
        onSelect={(area) => handleSelectArea(area, park.id)}
        onPlace={placeSquare}
        onMovePlot={handleMove}
      />

      {mounted ? (
        // THE MAP KEY — rectangle swatches, not round dots (captain 2026-09-30).
        // Every plot on the canvas is its own recorded rectangle: its FILL is the
        // legend type colour and its 2 px EDGE is the status colour. The key uses
        // that same grammar — type = filled box, status = paper box with a 2 px
        // status edge — so the key speaks the canvas's language. Every count is a
        // record count.
        <div className="map-key">
          <div className="map-key__group" role="group" aria-label="Plot types">
            {legend
              .filter((e) => typeCount(e.id) > 0)
              .map((e) => (
                <span key={e.id} className="map-key__item">
                  <i
                    aria-hidden
                    className="map-key__swatch map-key__swatch--type"
                    style={{ background: e.color }}
                  />{" "}
                  {e.name} · {typeCount(e.id)}
                </span>
              ))}
          </div>
          <span aria-hidden className="map-key__sep" />
          <div className="map-key__group" role="group" aria-label="Plot statuses">
            {[...new Set(effectiveAreas.map((a) => a.status))].map((st) => (
              <span key={st} className="map-key__item">
                <i
                  aria-hidden
                  className={`map-key__swatch map-key__swatch--status map-key__swatch--${stTone(st)}`}
                />{" "}
                {st} · {effectiveAreas.filter((a) => a.status === st).length}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {canEdit && !plotsLocked && activeSel ? (
        (() => {
          const sel = areas.find((a) => a.code === activeSel);
          if (!sel) return null;
          const type = legendEntry(sel.typeId);
          return (
            <div className="card">
              <div className="card__body stack">
                <div className="row row--wrap" style={{ justifyContent: "space-between" }}>
                  <span className="text-sm">
                    Selected: <strong>{sel.code}</strong> · {sel.status}
                    {sel.lot_id ? " · linked sellable lot" : " · map plot"}
                  </span>
                  {!sel.lot_id ? (
                    <Button variant="danger" size="sm" onClick={() => deleteArea(sel)}>
                      Delete plot
                    </Button>
                  ) : null}
                </div>
                <label className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                  <span className="text-sm text-muted">Type:</span>
                  <select
                    value={sel.typeId ?? ""}
                    aria-label="Plot type of the selected plot"
                    onChange={(e) => {
                      saveParkAreas(
                        park.id,
                        areas.map((a) => (a.id === sel.id ? { ...a, typeId: e.target.value || undefined } : a)),
                      );
                      setMessage({ tone: "success", text: `${sel.code} is now a ${legendEntry(e.target.value)?.name ?? "standard"} plot.` });
                    }}
                  >
                    <option value="">Standard (no type)</option>
                    {legend.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  {type?.image ? (
                    <span className="media-block media-block--natural" style={{ width: "9rem" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- attached legend photo */}
                      <img src={type.image} alt={type.name} />
                    </span>
                  ) : null}
                </label>
              </div>
            </div>
          );
        })()
      ) : null}

      <p className="text-sm text-muted">
        {canEdit
          ? "Edits appear on the customer park map too (demo store — real shared persistence awaits the dev geometry/media contract)."
          : `${park.branch} · click a plot for details.`}
      </p>
    </div>
  );
}

function stTone(status: PlotArea["status"]): string {
  switch (status) {
    case "available":
      return "success";
    case "reserved":
      return "warning";
    case "sold":
      return "info";
    case "occupied":
      return "neutral";
    default:
      return "danger";
  }
}
