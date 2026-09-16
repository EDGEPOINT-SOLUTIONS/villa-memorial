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
 * Plotting is ADMIN ONLY: with `canPlot` false the explorer can search, filter,
 * select and inspect, and the world cannot create, move or delete a plot.
 *
 * The camera is a DRONE (spec §3a.4): pointer-locked mouse look, Minecraft-style
 * movement, smooth accelerations — see `components/park3d/camera-rig.tsx` and
 * `lib/park-3d/flight.ts`.
 *
 * Loaded with `next/dynamic({ ssr: false })` from the park page, so three.js only
 * reaches browsers whose visitor actually opens 3D mode.
 */
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Park3dErrorBoundary } from "@/components/park3d/error-boundary";
import { DEVELOPMENT_OVERLAY_ENABLED } from "@/components/park3d/debug-layer";
import { ParkScene } from "@/components/park3d/park-scene";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import {
  ANY,
  filterPlots,
  isFiltering,
  plotSectionLabel,
  sectionFacets,
  SECTION_POI,
  statusFacets,
  type PlotFilters,
} from "@/lib/park-3d/explore";
import { FLIGHT } from "@/lib/park-3d/flight";
import { POIS_WORLD } from "@/lib/park-3d/masterplan";
import { usePark3d } from "@/lib/park-3d/view-store";
import type { LegendEntry, PlotArea } from "@/lib/park-maps";

export type Park3dViewProps = {
  /** Every plot in the shared store — the explorer filters what is DRAWN, never this list. */
  areas: PlotArea[];
  legendById: Record<string, LegendEntry>;
  selectedCode: string | null;
  onSelect: (area: PlotArea) => void;
  /** Admin-only plotting (spec §3). */
  canPlot: boolean;
  onChangeAreas?: (areas: PlotArea[]) => void;
  /** Leave the 3D experience — the host also leaves full screen. */
  onExit: () => void;
  /** Full-screen state, so the exit control can say what it will do. */
  fullscreen: "on" | "off" | "refused";
  /** The shared details panel, rendered INSIDE the experience. */
  details: ReactNode;
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
  canPlot,
  onChangeAreas,
  onExit,
  fullscreen,
  details,
}: Park3dViewProps) {
  const cameraMode = usePark3d((s) => s.cameraMode);
  const setCameraMode = usePark3d((s) => s.setCameraMode);
  const tool = usePark3d((s) => s.tool);
  const setTool = usePark3d((s) => s.setTool);
  const speed = usePark3d((s) => s.flySpeed);
  const setSpeed = usePark3d((s) => s.setFlySpeed);
  const sensitivity = usePark3d((s) => s.lookSensitivity);
  const setSensitivity = usePark3d((s) => s.setLookSensitivity);
  const flying = usePark3d((s) => s.flying);
  const toggleFlying = usePark3d((s) => s.toggleFlying);
  const pointerLocked = usePark3d((s) => s.pointerLocked);
  const sprinting = usePark3d((s) => s.sprinting);
  const debugOpen = usePark3d((s) => s.debugOpen);
  const toggleDebug = usePark3d((s) => s.toggleDebug);
  const debug = usePark3d((s) => s.debug);
  const setDebugFlag = usePark3d((s) => s.setDebugFlag);
  const fps = usePark3d((s) => s.fps);
  const objectCount = usePark3d((s) => s.objectCount);
  const setReducedMotion = usePark3d((s) => s.setReducedMotion);
  const travelTo = usePark3d((s) => s.travelTo);
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

  const flyTo = (poiId: string) => {
    const poi = POIS_WORLD.find((p) => p.id === poiId);
    if (!poi) return;
    travelTo(
      { x: poi.standWorld.x, y: FLIGHT.cruiseAltitudeM, z: poi.standWorld.z },
      { x: poi.lookWorld.x, y: FLIGHT.cruiseAltitudeM, z: poi.lookWorld.z },
      poi.label,
    );
  };

  const chooseSection = (section: string) => {
    setFilters((current) => ({ ...current, section: current.section === section ? ANY : section }));
    setPanelOpen(true);
    const poi = SECTION_POI[section];
    if (poi) flyTo(poi);
  };

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
            variant={cameraMode === "drone" ? "primary" : "secondary"}
            onClick={() => setCameraMode("drone")}
            aria-pressed={cameraMode === "drone"}
          >
            Fly the park
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

        <div className="park3d__hud-end">
          <Button size="sm" variant={panelOpen ? "secondary" : "ghost"} onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen}>
            {panelOpen ? "Hide lots" : "Lots & search"}
          </Button>
          <details className="park3d__settings">
            <summary>Settings</summary>
            <div className="park3d__settings-body">
              <label className="park3d__field">
                <span>Flight speed</span>
                <input
                  type="range"
                  min={FLIGHT.minSpeedMps}
                  max={FLIGHT.maxSpeedMps}
                  step={0.1}
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  aria-label="Flight speed in metres per second"
                />
                <span className="park3d__value">{speed.toFixed(1)} m/s</span>
              </label>
              <label className="park3d__field">
                <span>Look sensitivity</span>
                <input
                  type="range"
                  min={0.001}
                  max={0.006}
                  step={0.0005}
                  value={sensitivity}
                  onChange={(event) => setSensitivity(Number(event.target.value))}
                  aria-label="Look sensitivity"
                />
                <span className="park3d__value">{Math.round(sensitivity * 10000) / 10}</span>
              </label>
              <label className="park3d__check">
                <input type="checkbox" checked={flying} onChange={toggleFlying} />
                <span>Free flight (Space ×2) — off: cruise at a level height</span>
              </label>
              <p className="park3d__note">
                Click the park to capture the mouse, Esc to release it. W A S D fly where you look,
                Space rises, Shift descends, Space ×2 toggles free flight, Ctrl (or W ×2) sprints.
                Camera and plot tools stay in the panel beside the world.
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
              camera={{ fov: 60, near: 0.1, far: 3000, position: [0, FLIGHT.cruiseAltitudeM, 0] }}
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
              />
            </Canvas>
          </Suspense>
        </Park3dErrorBoundary>

        {/* status strip: what the drone is doing, and what to click */}
        <p className="park3d__status" role="status">
          <span className="park3d__chip">{cameraMode === "drone" ? "Flight" : "Masterplan"}</span>
          {cameraMode === "drone" ? (
            <span className="park3d__chip">{flying ? "Free flight" : "Cruising"}</span>
          ) : null}
          {sprinting ? <span className="park3d__chip">Sprint</span> : null}
          <span className="park3d__chip">
            {filtering ? `${matches.length} of ${areas.length} plots` : `${areas.length} plots`}
          </span>
        </p>

        {cameraMode === "drone" && !pointerLocked ? (
          <p className="park3d__hint">Click the park to capture the mouse · Esc releases it</p>
        ) : null}
        {cameraMode === "drone" && pointerLocked ? <span className="park3d__reticle" aria-hidden /> : null}

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
              placeholder="Search: P-001, premium, available…"
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
                title={SECTION_POI[facet.id] ? "Filter and fly there" : "Filter this section"}
              >
                {facet.label} · {facet.count}
              </button>
            ))}
          </div>

          <div className="park3d__facets" role="group" aria-label="Fly to a place in the park">
            <span className="park3d__label">Fly to</span>
            {POIS_WORLD.map((poi) => (
              <button
                key={poi.id}
                type="button"
                className="park3d__facet"
                onClick={() => flyTo(poi.id)}
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
            Placeholder inventory marked <code>P-</code>/<code>PR-</code>/<code>G-</code>/
            <code>GN-</code>; prices read “Contact for pricing” until the park publishes real lots.
            {canPlot
              ? " Plotting is open to you (property:write) — edits share one store with the map view."
              : " Plotting tools are staff-only; you can inspect and select any plot."}
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
