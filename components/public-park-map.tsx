"use client";

/**
 * Client-facing park map — multi-park (Villa Memorial · Loyola Gardens ·
 * Golden Haven). Uses the SAME shared store as staff, so plot edits made by
 * staff appear here (demo-local persistence). Read-only for customers: click a
 * plot for details; linked (Villa) plots show real lot info; demo-area plots
 * explain their status honestly.
 *
 * Two connected modes (spec §3, docs/07-client-villa/park-3d-spec.md):
 *   · MAP — the plain masterplan image with the existing plotting behaviour;
 *   · 3D  — the walk-in park, built from the same masterplan, entered in FULL
 *           SCREEN, with every control INSIDE the experience.
 * Both read and write ONE plot store, so a plot placed, moved, retyped or
 * deleted in either mode appears in the other, and the selection is shared.
 * The 3D world exists for the Villa park (the client's masterplan); the other
 * parks keep their own map images.
 *
 * PLOTTING IS ADMIN ONLY (spec §3, captain 2026-09-16). `canPlot` is resolved
 * server-side from the viewer's session scopes (`property:write`) and passed
 * down; a customer sees the map and the lots, can inspect and select them, and
 * gets no plotting or editing tools in EITHER mode — including the 3D place and
 * move gestures, which write the same store.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParkMapsView } from "@/components/park-maps-view";
import { Park3dPlotTools } from "@/components/park3d/plot-tools-panel";
import { PlotDetails } from "@/components/park-plot-details";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Lot } from "@/lib/api-client/property";
import {
  legendList,
  parkAreas,
  parksList,
  saveParkAreas,
  setActiveParkId,
  useParkStore,
  type PlotArea,
} from "@/lib/park-maps";

/** The 3D world exists for one park only — the client's Villa masterplan. */
const VILLA_PARK_ID = "villa";

const Park3dView = dynamic(
  () => import("@/components/park3d/park-3d-view").then((m) => m.Park3dView),
  {
    ssr: false,
    loading: () => <div className="park3d__loading">Preparing the park…</div>,
  },
);

/** Standard Fullscreen API plus the WebKit-prefixed shape older Safari ships. */
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

function fullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function exitFullscreen(): void {
  const doc = document as FullscreenDocument;
  if (typeof doc.exitFullscreen === "function") {
    void doc.exitFullscreen().catch(() => {});
    return;
  }
  doc.webkitExitFullscreen?.();
}

/**
 * Write a plot change into the store WITHOUT persisting the display-only overlay
 * (a linked lot's live status/owner are read from the property listing, not the
 * map store, so they must not be copied into it).
 */
function commitVillaAreas(next: PlotArea[]) {
  const stored = parkAreas(VILLA_PARK_ID);
  const byId = new Map(next.map((a) => [a.id, a]));
  const merged = stored
    .filter((s) => byId.has(s.id))
    .map((s) => {
      const n = byId.get(s.id)!;
      return {
        ...s,
        outline: n.outline,
        circle: n.circle,
        status: n.status,
        typeId: n.typeId,
        sectionBlock: n.sectionBlock,
        owner: n.owner,
      };
    });
  const added = next.filter((n) => !stored.some((s) => s.id === n.id));
  saveParkAreas(VILLA_PARK_ID, [...merged, ...added]);
}

export function PublicParkMap({
  lots,
  initialPark,
  initialPlot,
  enable3d = false,
  canPlot = false,
}: {
  lots: Lot[];
  initialPark?: string;
  initialPlot?: string;
  /** Opt-in: only the park page hosts the walk-in 3D world. */
  enable3d?: boolean;
  /** Admin-only plotting — resolved from the session scopes by the page. */
  canPlot?: boolean;
}) {
  const [selected, setSelected] = useState<{ area: PlotArea; parkId: string } | null>(null);
  const [parkId, setParkId] = useState<string>(() => initialPark ?? VILLA_PARK_ID);
  const [mode, setMode] = useState<"map" | "3d">("map");
  const [fullscreen, setFullscreen] = useState<"on" | "off" | "refused">("off");
  useParkStore(); // re-render whenever the shared plot store changes

  const hostRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const heldFullscreen = useRef(false);
  const wasFullscreen = useRef(false);

  const parks = parksList();
  const parksRef = useRef(parks);
  parksRef.current = parks;

  const liveStatus: Record<string, string> = Object.fromEntries(lots.map((l) => [l.id, l.status]));
  const liveOwner: Record<string, string> = Object.fromEntries(
    lots.map((l) => [l.id, l.owner_name ?? ""]),
  );

  /** The Villa plots as 3D sees them: stored records + the live lot overlay. */
  const villaAreas = useMemo(() => {
    if (mode !== "3d") return [];
    return parkAreas(VILLA_PARK_ID).map((area) => {
      const live = area.lot_id ? liveStatus[area.lot_id] : undefined;
      const owner = area.lot_id && liveOwner[area.lot_id] ? liveOwner[area.lot_id] : area.owner ?? "";
      return {
        ...area,
        status: (live as PlotArea["status"]) || area.status,
        owner: owner || undefined,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lots, selected]);

  const legendById = useMemo(() => {
    const legend = legendList();
    return Object.fromEntries(legend.map((entry) => [entry.id, entry]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode]);

  const selectArea = useCallback((area: PlotArea, pId: string) => {
    setSelected({ area, parkId: pId });
  }, []);

  /* --- full screen is the 3D mode's frame (spec §3) ---------------------- */
  useEffect(() => {
    const onChange = () => {
      const active = Boolean(fullscreenElement());
      wasFullscreen.current = active;
      setFullscreen(active ? "on" : "off");
      heldFullscreen.current = active;
      // Esc (or the browser) leaving full screen leaves the 3D experience with
      // it: 3D IS the full-screen mode, and the exit control is the same door.
      if (!active && modeRef.current === "3d") {
        setMode("map");
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      if (heldFullscreen.current) exitFullscreen();
    };
  }, []);

  /** Entering 3D requests full screen from THIS gesture, and degrades gracefully. */
  function enter3d() {
    setMode("3d");
    setActiveParkId(VILLA_PARK_ID);
    setSelected((current) => (current && current.parkId !== VILLA_PARK_ID ? null : current));

    const host = hostRef.current as FullscreenElement | null;
    if (!host || typeof host.requestFullscreen !== "function" || document.fullscreenEnabled === false) {
      setFullscreen("refused");
      return;
    }
    try {
      const request = host.requestFullscreen() as unknown as Promise<void> | undefined;
      if (request && typeof request.then === "function") {
        request.then(
          () => setFullscreen("on"),
          () => setFullscreen("refused"),
        );
      } else {
        setFullscreen("on");
      }
    } catch {
      setFullscreen("refused");
    }
  }

  /** The in-experience exit control: leave full screen first, then the mode. */
  function leave3d() {
    if (fullscreenElement()) exitFullscreen();
    setMode("map");
  }

  function patchVillaArea(area: PlotArea, patch: Partial<PlotArea>) {
    const next = parkAreas(VILLA_PARK_ID).map((a) => (a.id === area.id ? { ...a, ...patch } : a));
    commitVillaAreas(next);
    const updated = next.find((a) => a.id === area.id);
    if (updated) setSelected({ area: updated, parkId: VILLA_PARK_ID });
  }

  function deleteVillaArea(area: PlotArea) {
    commitVillaAreas(parkAreas(VILLA_PARK_ID).filter((a) => a.id !== area.id));
    setSelected(null);
  }

  const parkName =
    parks.find((p) => p.id === (mode === "3d" ? VILLA_PARK_ID : parkId))?.name ??
    parksRef.current[0]?.name ??
    "Park";

  useEffect(() => {
    // Keep the map's own park selection in step when the URL asked for one.
    if (initialPark) setParkId(initialPark);
  }, [initialPark]);

  if (lots.length === 0) {
    return (
      <EmptyState
        title="No lots to show yet"
        hint="Property listings will appear here as they are published."
      />
    );
  }

  const selectedVillaArea =
    selected && selected.parkId === VILLA_PARK_ID
      ? villaAreas.find((a) => a.id === selected.area.id) ?? selected.area
      : null;

  return (
    <div className="stack-4 park-mode" ref={hostRef}>
      {/* Page chrome — only while the plain map is on screen. In 3D everything
          lives inside the experience (mode switch, exit, toggles, details). */}
      {enable3d && mode === "map" ? (
        <div className="row row--wrap park-mode-switch">
          <div className="btn-group" role="tablist" aria-label="Park view mode">
            <Button variant="primary" size="sm" role="tab" aria-selected onClick={() => setMode("map")}>
              Map
            </Button>
            <Button variant="secondary" size="sm" role="tab" aria-selected={false} onClick={enter3d}>
              3D · enter the park
            </Button>
          </div>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            {canPlot
              ? "The plain park map. Your account has the plotting tools; switch to 3D and the same plots are there to fly over."
              : "The plain park map. Switch to 3D to fly the same masterplan — selecting a plot behaves the same in both views."}
          </p>
        </div>
      ) : null}

      {mode === "3d" ? (
        <Park3dView
          areas={villaAreas}
          legendById={legendById}
          selectedCode={selectedVillaArea?.code ?? null}
          onSelect={(area) => selectArea(area, VILLA_PARK_ID)}
          canPlot={canPlot}
          onChangeAreas={canPlot ? commitVillaAreas : undefined}
          onExit={leave3d}
          fullscreen={fullscreen}
          details={
            <PlotDetails
              selected={
                selectedVillaArea ? { area: selectedVillaArea, parkId: VILLA_PARK_ID } : null
              }
              lots={lots}
              parkName={parkName}
            >
              {canPlot && selectedVillaArea ? (
                <Park3dPlotTools
                  area={selectedVillaArea}
                  onPatch={(patch) => patchVillaArea(selectedVillaArea, patch)}
                  onDelete={() => deleteVillaArea(selectedVillaArea)}
                />
              ) : null}
            </PlotDetails>
          }
        />
      ) : (
        <div className="map-layout">
          <div className="stack-4" style={{ flex: "1 1 auto", minWidth: 0 }}>
            <ParkMapsView
              canEdit={canPlot}
              liveStatusById={liveStatus}
              liveOwnerById={liveOwner}
              initialParkId={initialPark}
              autoSelectCode={initialPlot}
              selectedCode={selected?.area.code ?? null}
              onSelect={selectArea}
              onParkChange={(id) => setParkId(id)}
            />
          </div>
          <aside className="card" aria-live="polite">
            <PlotDetails selected={selected} lots={lots} parkName={parkName} />
          </aside>
        </div>
      )}
    </div>
  );
}
