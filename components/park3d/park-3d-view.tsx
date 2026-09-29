"use client";

/**
 * park3d/park-3d-view.tsx — the 3D park experience: the canvas plus the WHOLE
 * interface, in-experience.
 *
 * Captain's direction (2026-09-16, spec §3): everything the visitor can toggle or
 * set lives INSIDE the 3D experience — mode and exit, view toggles, the section
 * list, search, filters, the details panel and the plot tools — instead of in the
 * page chrome around the canvas. It stays elegant and minimal: a quiet identity
 * plate, one camera switch, one exit control, and a collapsible explorer panel.
 * There is deliberately no health/score/HUD chrome anywhere.
 *
 * Navigation is the orbit camera (captain, 2026-09-17 — Blender-style): rotate,
 * zoom, pan, and FRAME what you select. Selecting a plot, a section or a point of
 * interest glides the camera onto it; the gestures and the envelope live in
 * `components/park3d/camera-rig.tsx` + `lib/park-3d/orbit.ts`.
 *
 * Booking: the plot panel is the shared `PlotDetails`. On the public map it renders
 * the request-to-reserve contact link for everyone (view-only; the capability door
 * is not wired there, 2026-09-20) — an administrative host may pass a `reserveSlot`
 * instead. Nothing is invented here — see `components/park-plot-details.tsx`.
 *
 * Plotting is ADMIN ONLY. The public park page passes NO capability, so `canPlot`
 * defaults to false there and the explorer can only search, filter, select and
 * inspect — the world cannot create, move or delete a plot. Plot authoring lives
 * on the administrative property map (`/staff/property` → `PropertyExplorer`).
 *
 * Loaded with `next/dynamic({ ssr: false })` from the park page, so three.js only
 * reaches browsers whose visitor actually opens 3D mode.
 */
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Park3dErrorBoundary } from "@/components/park3d/error-boundary";
import { DEVELOPMENT_OVERLAY_ENABLED } from "@/components/park3d/debug-layer";
import { ParkScene } from "@/components/park3d/park-scene";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import {
  ANY,
  filterPlots,
  isFiltering,
  plotSectionId,
  plotSectionLabel,
  sectionFacets,
  SECTION_POI,
  statusFacets,
  type PlotFilters,
} from "@/lib/park-3d/explore";
import { POIS_WORLD, SITE_CENTRE_WORLD, SITE_RADIUS_M } from "@/lib/park-3d/masterplan";
import { ORBIT, worldBoundsOfAreas } from "@/lib/park-3d/orbit";
import { usePark3d } from "@/lib/park-3d/view-store";
import type { LegendEntry, PlotArea } from "@/lib/park-maps";

export type Park3dViewProps = {
  /** Every plot in the shared store — the explorer filters what is DRAWN, never this list. */
  areas: PlotArea[];
  legendById: Record<string, LegendEntry>;
  selectedCode: string | null;
  onSelect: (area: PlotArea) => void;
  /**
   * Admin-only plotting. OPTIONAL and false by default: the public host passes
   * nothing, so the explorer can never render an editing control there. Only an
   * administrative surface resolves `property:write` and turns it on.
   */
  canPlot?: boolean;
  onChangeAreas?: (areas: PlotArea[]) => void;
  /** Leave the 3D experience — the host also leaves full screen. */
  onExit: () => void;
  /** Full-screen state, so the exit control can say what it will do. */
  fullscreen: "on" | "off" | "refused";
  /** The shared details panel, rendered INSIDE the experience. */
  details: ReactNode;
  /**
   * Bumped by the host on every selection, so re-selecting the same plot frames it
   * again instead of being swallowed by "the code did not change".
   */
  selectionSeq?: number;
};

const STATUS_ORDER: Array<PlotArea["status"]> = [
  "available",
  "reserved",
  "sold",
  "occupied",
  "maintenance",
];

export function Park3dView({
  areas,
  legendById,
  selectedCode,
  onSelect,
  canPlot = false,
  onChangeAreas,
  onExit,
  fullscreen,
  details,
  selectionSeq = 0,
}: Park3dViewProps) {
  const cameraMode = usePark3d((s) => s.cameraMode);
  const setCameraMode = usePark3d((s) => s.setCameraMode);
  const tool = usePark3d((s) => s.tool);
  const setTool = usePark3d((s) => s.setTool);
  const orbitSpeed = usePark3d((s) => s.orbitSpeed);
  const setOrbitSpeed = usePark3d((s) => s.setOrbitSpeed);
  const zoomSpeed = usePark3d((s) => s.zoomSpeed);
  const setZoomSpeed = usePark3d((s) => s.setZoomSpeed);
  const autoOrbit = usePark3d((s) => s.autoOrbit);
  const setAutoOrbit = usePark3d((s) => s.setAutoOrbit);
  const debugOpen = usePark3d((s) => s.debugOpen);
  const toggleDebug = usePark3d((s) => s.toggleDebug);
  const debug = usePark3d((s) => s.debug);
  const setDebugFlag = usePark3d((s) => s.setDebugFlag);
  const fps = usePark3d((s) => s.fps);
  const objectCount = usePark3d((s) => s.objectCount);
  const setReducedMotion = usePark3d((s) => s.setReducedMotion);
  const frameTo = usePark3d((s) => s.frameTo);
  const zoomBy = usePark3d((s) => s.zoomBy);
  const reset = usePark3d((s) => s.reset);

  const [filters, setFilters] = useState<PlotFilters>({ text: "", status: ANY, section: ANY });
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
      reset(); // leaving 3D must not leave the next visit in "place a plot" mode
    };
  }, [reset, setReducedMotion]);

  /* --- explorer: search, filters, sections (spec §3a.10) ------------------ */
  const sections = useMemo(() => sectionFacets(areas), [areas]);
  const statuses = useMemo(() => statusFacets(areas), [areas]);
  const matches = useMemo(() => filterPlots(areas, filters), [areas, filters]);
  const filtering = isFiltering(filters);

  /**
   * What the world draws. `null` means "no filter"; otherwise only the matches —
   * plus the selected plot, so filtering never hides what the details panel is
   * describing. The WRITE path always uses the full `areas` list.
   */
  const visibleCodes = useMemo(() => {
    if (!filtering) return null;
    const codes = new Set(matches.map((area) => area.code));
    if (selectedCode) codes.add(selectedCode);
    return codes;
  }, [filtering, matches, selectedCode]);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: areas.filter((a) => a.status === status).length,
  })).filter((c) => c.count > 0);

  /** Frame a set of plots, or a bare world point when there is no cluster to frame. */
  const framePlots = (plots: PlotArea[], label: string, fallback?: { x: number; z: number }) => {
    const bounds = plots.length ? worldBoundsOfAreas(plots) : null;
    if (bounds) {
      frameTo(bounds.centre, bounds.radius, label);
      return;
    }
    if (fallback) {
      frameTo({ x: fallback.x, y: 0, z: fallback.z }, ORBIT.poiFrameRadiusM, label);
    }
  };

  const framePoi = (poiId: string) => {
    const poi = POIS_WORLD.find((p) => p.id === poiId);
    if (!poi) return;
    framePlots(
      areas.filter((area) => plotSectionId(area) === poiId),
      poi.label,
      { x: poi.world.x, z: poi.world.z },
    );
  };

  const chooseSection = (section: string) => {
    setFilters((current) => ({ ...current, section: current.section === section ? ANY : section }));
    setPanelOpen(true);
    const poi = SECTION_POI[section];
    if (poi) framePoi(poi);
  };

  const framePark = () => {
    setCameraMode("orbit");
    frameTo(
      { x: SITE_CENTRE_WORLD.x, y: 0, z: SITE_CENTRE_WORLD.z },
      SITE_RADIUS_M,
      "The park",
    );
  };

  /* --- selecting frames the plot (spec §3a.9) ---------------------------- */
  const framedSeq = useRef(-1);
  useEffect(() => {
    if (selectionSeq === framedSeq.current) return;
    framedSeq.current = selectionSeq;
    if (!selectedCode) return;
    const area = areas.find((a) => a.code === selectedCode);
    if (!area) return;
    framePlots([area], area.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- framePlots is recreated per render on purpose
  }, [selectionSeq, selectedCode, areas]);

  return (
    <section className="park3d" aria-label="Three-dimensional park">
      {/* ---- the in-experience bar: identity, camera, settings, exit -------- */}
      <div className="park3d__hud">
        <p className="park3d__identity">
          <span className="park3d__title">Sanctuario Memorial Park</span>
          <span className="park3d__subtitle">
            Begang, Isabela City, Basilan · “A Sacred Place. A Lasting Legacy.”
          </span>
        </p>

        <div className="park3d__group" role="group" aria-label="Camera mode">
          <Button
            size="sm"
            variant={cameraMode === "orbit" ? "primary" : "secondary"}
            onClick={() => setCameraMode("orbit")}
            aria-pressed={cameraMode === "orbit"}
          >
            Orbit the park
          </Button>
          <Button
            size="sm"
            variant={cameraMode === "overhead" ? "primary" : "secondary"}
            onClick={() => setCameraMode("overhead")}
            aria-pressed={cameraMode === "overhead"}
          >
            Masterplan view
          </Button>
        </div>

        <div className="park3d__group" role="group" aria-label="Zoom and framing">
          <Button size="sm" variant="secondary" onClick={() => zoomBy(1 / (1 - ORBIT.zoomStep))} aria-label="Zoom out">
            −
          </Button>
          <Button size="sm" variant="secondary" onClick={() => zoomBy(1 - ORBIT.zoomStep)} aria-label="Zoom in">
            +
          </Button>
          <Button size="sm" variant="ghost" onClick={framePark}>
            Frame the park
          </Button>
        </div>

        <div className="park3d__hud-end">
          <Button size="sm" variant={panelOpen ? "secondary" : "ghost"} onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen}>
            {panelOpen ? "Hide lots" : "Lots & search"}
          </Button>
          <details className="park3d__settings">
            <summary>Settings</summary>
            <div className="park3d__settings-body">
              <label className="park3d__field">
                <span>Orbit speed</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.2}
                  step={0.05}
                  value={orbitSpeed}
                  onChange={(event) => setOrbitSpeed(Number(event.target.value))}
                  aria-label="Orbit speed"
                />
                <span className="park3d__value">{orbitSpeed.toFixed(2)}</span>
              </label>
              <label className="park3d__field">
                <span>Zoom speed</span>
                <input
                  type="range"
                  min={0.3}
                  max={1.6}
                  step={0.05}
                  value={zoomSpeed}
                  onChange={(event) => setZoomSpeed(Number(event.target.value))}
                  aria-label="Zoom speed"
                />
                <span className="park3d__value">{zoomSpeed.toFixed(2)}</span>
              </label>
              <label className="park3d__check">
                <input
                  type="checkbox"
                  checked={autoOrbit}
                  onChange={(event) => setAutoOrbit(event.target.checked)}
                />
                <span>Auto-orbit — a slow drift around what is framed</span>
              </label>
              <p className="park3d__note">
                Drag to orbit · wheel or pinch to zoom · middle-drag, Shift+drag or two fingers to
                pan · + and − keys zoom, 0 frames the whole park. Click a plot to select it and the
                camera glides to it — never a jump. Camera, plot tools and the details panel stay in
                the panel beside the world.
              </p>
              {DEVELOPMENT_OVERLAY_ENABLED ? (
                <div className="park3d__debug">
                  <Button size="sm" variant={debugOpen ? "primary" : "ghost"} onClick={toggleDebug}>
                    {debugOpen ? "Developer overlay on" : "Developer overlay"}
                  </Button>
                  {debugOpen ? (
                    <>
                      <div className="park3d__checks">
                        {(
                          [
                            ["boundary", "Site boundary"],
                            ["axes", "World axes"],
                            ["plotIds", "Plot IDs"],
                            ["sections", "Section boundaries"],
                            ["masterplan", "Masterplan overlay"],
                          ] as const
                        ).map(([flag, label]) => (
                          <label key={flag} className="park3d__check">
                            <input
                              type="checkbox"
                              checked={debug[flag]}
                              onChange={(event) => setDebugFlag(flag, event.target.checked)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="park3d__note" role="status">
                        {fps} fps · {objectCount} scene objects
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>
          <Button size="sm" variant="secondary" onClick={onExit}>
            {fullscreen === "on" ? "Leave full screen & 3D" : "Back to the map"}
          </Button>
        </div>
      </div>

      {/* ---- the world ------------------------------------------------------ */}
      <div className="park3d__stage">
        <Park3dErrorBoundary
          fallback={
            <div className="park3d__fallback">
              <ErrorState message="The 3D park could not start on this device (WebGL unavailable). The map view still works." />
            </div>
          }
        >
          <Suspense fallback={<div className="park3d__loading">Preparing the park…</div>}>
            <Canvas
              shadows
              dpr={[1, 1.75]}
              camera={{ fov: 60, near: 0.1, far: 3000, position: [0, 120, 160] }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.domElement.setAttribute("aria-hidden", "true");
              }}
            >
              <ParkScene
                areas={areas}
                visibleCodes={visibleCodes}
                legendById={legendById}
                selectedCode={selectedCode}
                canPlot={canPlot}
                onSelect={onSelect}
                onChangeAreas={onChangeAreas}
                onPoi={framePoi}
              />
            </Canvas>
          </Suspense>
        </Park3dErrorBoundary>

        {/* status strip: how the camera is navigating, and what to click */}
        <p className="park3d__status" role="status">
          <span className="park3d__chip">{cameraMode === "overhead" ? "Masterplan" : "Orbit"}</span>
          {autoOrbit ? <span className="park3d__chip">Auto-orbit</span> : null}
          <span className="park3d__chip">
            {filtering ? `${matches.length} of ${areas.length} plots` : `${areas.length} plots`}
          </span>
        </p>

        {fullscreen === "refused" ? (
          <p className="park3d__banner" role="status">
            This browser would not open full screen — the park is open inline instead. Everything
            works the same; use “Back to the map” to leave.
          </p>
        ) : null}

        {canPlot && tool === "place" ? (
          <p className="park3d__banner" role="status">
            Click inside the park to place a plot — it is written to the same store the map view
            draws.
          </p>
        ) : canPlot && tool === "move" ? (
          <p className="park3d__banner" role="status">
            Drag a plot across the ground; the map view follows on release.
          </p>
        ) : null}

        {/* ---- the explorer: search, sections, details, plot tools ---------- */}
        {panelOpen ? (
        <aside className="park3d__panel" aria-label="Explore the park's plots">
          <div className="park3d__panel-head">
            <h3 className="park3d__panel-title">Plots</h3>
            <button type="button" className="park3d__link" onClick={() => setPanelOpen(false)}>
              Close
            </button>
          </div>

          <label className="park3d__search">
            <span className="visually-hidden">Search plots</span>
            <input
              type="search"
              value={filters.text}
              placeholder="Search: A-001, premium, available…"
              onChange={(event) =>
                setFilters((current) => ({ ...current, text: event.target.value }))
              }
            />
          </label>

          <div className="park3d__facets" role="group" aria-label="Filter by status">
            <button
              type="button"
              className={`park3d__facet${filters.status === ANY ? " park3d__facet--on" : ""}`}
              aria-pressed={filters.status === ANY}
              onClick={() => setFilters((current) => ({ ...current, status: ANY }))}
            >
              All statuses
            </button>
            {statuses.map((facet) => (
              <button
                key={facet.id}
                type="button"
                className={`park3d__facet${filters.status === facet.id ? " park3d__facet--on" : ""}`}
                aria-pressed={filters.status === facet.id}
                onClick={() => setFilters((current) => ({ ...current, status: facet.id }))}
              >
                {facet.label} · {facet.count}
              </button>
            ))}
          </div>

          <div className="park3d__facets" role="group" aria-label="Filter by section">
            <button
              type="button"
              className={`park3d__facet${filters.section === ANY ? " park3d__facet--on" : ""}`}
              aria-pressed={filters.section === ANY}
              onClick={() => setFilters((current) => ({ ...current, section: ANY }))}
            >
              Every section
            </button>
            {sections.map((facet) => (
              <button
                key={facet.id}
                type="button"
                className={`park3d__facet${filters.section === facet.id ? " park3d__facet--on" : ""}`}
                aria-pressed={filters.section === facet.id}
                onClick={() => chooseSection(facet.id)}
                title={SECTION_POI[facet.id] ? "Filter and frame it" : "Filter this section"}
              >
                {facet.label} · {facet.count}
              </button>
            ))}
          </div>

          <div className="park3d__facets" role="group" aria-label="Frame a place in the park">
            <span className="park3d__label">Go to</span>
            {POIS_WORLD.map((poi) => (
              <button
                key={poi.id}
                type="button"
                className="park3d__facet"
                onClick={() => framePoi(poi.id)}
              >
                {poi.label}
              </button>
            ))}
          </div>

          {filtering ? (
            <ul className="park3d__results">
              {matches.slice(0, 40).map((area) => (
                <li key={area.id}>
                  <button
                    type="button"
                    className={`park3d__result${area.code === selectedCode ? " park3d__result--on" : ""}`}
                    onClick={() => onSelect(area)}
                  >
                    <strong>{area.code}</strong>
                    <span className="text-muted">
                      {" "}
                      · {plotSectionLabel(area)} · {area.status}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length > 40 ? (
                <li className="park3d__note">+ {matches.length - 40} more — narrow the search</li>
              ) : null}
              {matches.length === 0 ? (
                <li className="park3d__note">No plot matches those filters.</li>
              ) : null}
            </ul>
          ) : null}

          {canPlot ? (
            <div className="park3d__facets" role="group" aria-label="Plot tools">
              {(
                [
                  ["inspect", "Inspect"],
                  ["place", "Place a plot"],
                  ["move", "Move a plot"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`park3d__facet${tool === value ? " park3d__facet--on" : ""}`}
                  aria-pressed={tool === value}
                  onClick={() => setTool(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="park3d__details">{details}</div>

          <p className="park3d__note">
            Every plot is a recorded lot the lot pages also list; a plot with no published price
            reads “Price on request” until the office quotes it.
            {canPlot
              ? " Plotting is open to you (property:write) — edits share one store with the map view."
              : " Plotting is handled by the office on the property map; you can inspect and select any plot."}
          </p>
          <p className="park3d__note">
            {areas.length} plots shown · {counts.map((c) => `${c.count} ${c.status}`).join(" · ")}.
            Shared with the map view in this browser (demo store — not multi-user sync yet).
          </p>
        </aside>
        ) : null}
      </div>

      {/* Text alternative for the 3D world (design-system accessibility rule). */}
      <p className="visually-hidden">
        Three-dimensional view of the park. Named places: {POIS_WORLD.map((p) => p.label).join(", ")}.
        Plot details are listed in the Plots panel inside this view, and the map view shows the same
        plots on the masterplan image.
      </p>
    </section>
  );
}

export default Park3dView;
