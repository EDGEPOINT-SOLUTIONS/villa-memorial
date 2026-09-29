"use client";

/**
 * Client-facing park map — Villa Memorial Park (the product's ONE park; the demo
 * Loyola Gardens / Golden Haven records were removed 2026-09-21). Uses the SAME
 * shared store as staff, so plot edits made by staff appear here (demo-local
 * persistence). Read-only for customers: click a plot for details; linked plots
 * show real lot info; map-only plots explain their status honestly.
 *
 * Two connected modes (spec §3, docs/07-client-villa/park-3d-spec.md):
 *   · MAP — the plain masterplan image, opening under a designed band head;
 *   · 3D  — the orbit-navigated park, built from the same masterplan, entered in
 *           FULL SCREEN, with every control INSIDE the experience.
 * Both read ONE plot store and the selection is shared.
 *
 * VIEW-ONLY BY CONSTRUCTION (captain 2026-09-20). This public surface takes no
 * capability prop and resolves no session: it must never render an editing
 * control, in Map mode or 3D, for anyone. Plotting is an administrative act and
 * lives in the admin area (`/staff/property` → `PropertyExplorer` →
 * `park-maps-view.tsx`'s `canEdit`, gated on `property:write`). The store still
 * SHARES staff edits into this view; the viewer just cannot write to it. A
 * regression here is caught by `tests/unit/public-map-view-only.test.tsx`.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParkMapsView } from "@/components/park-maps-view";
import { PlotDetails } from "@/components/park-plot-details";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Lot } from "@/lib/api-client/property";
import { withLiveLotRecords } from "@/lib/park-live-lots";
import {
  legendList,
  parkAreas,
  parksList,
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

export function PublicParkMap({
  lots,
  initialPark,
  initialPlot,
  enable3d = false,
  bandHead,
}: {
  lots: Lot[];
  initialPark?: string;
  initialPlot?: string;
  /** Opt-in: only the park page hosts the 3D park and its designed band head. */
  enable3d?: boolean;
  /**
   * The park page's designed band head (kicker · title · lead). When present it
   * renders ABOVE the framed map with the ONE 3D outline action in it; the
   * old page-chrome “Map / 3D” switch and its sentence are gone.
   */
  bandHead?: { kicker: string; title: string; lead?: string };
}) {
  const [selected, setSelected] = useState<{ area: PlotArea; parkId: string } | null>(null);
  const [parkId, setParkId] = useState<string>(() => initialPark ?? VILLA_PARK_ID);
  const [mode, setMode] = useState<"map" | "3d">("map");
  const [fullscreen, setFullscreen] = useState<"on" | "off" | "refused">("off");
  /**
   * Bumped on every selection, so the 3D camera frames the chosen plot even when
   * the same plot is chosen again (the code alone would look unchanged).
   */
  const [selectionSeq, setSelectionSeq] = useState(0);
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
    return withLiveLotRecords(parkAreas(VILLA_PARK_ID), {
      statusById: liveStatus,
      ownerById: liveOwner,
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
    setSelectionSeq((seq) => seq + 1);
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
      {/* The park page's designed band head — kicker · title · lead and the ONE
          3D outline action — sits ABOVE the framed map (captain 2026-09-30).
          The old page-chrome “Map / 3D” switch and its two-sentence explainer
          are deleted: the gateway owns the Map/Lots view switch now, and 3D is
          a single action in this band. The /blog embed passes no head. */}
      {enable3d && mode === "map" ? (
        <div className="home-band-head">
          {bandHead ? (
            <>
              <p className="home-band-head__kicker">{bandHead.kicker}</p>
              <h2 className="home-band-head__title">{bandHead.title}</h2>
              {bandHead.lead ? <p className="home-band-head__lead">{bandHead.lead}</p> : null}
            </>
          ) : null}
          <Button variant="secondary" onClick={enter3d}>
            3D · enter the park
          </Button>
        </div>
      ) : null}

      {mode === "3d" ? (
        <Park3dView
          areas={villaAreas}
          legendById={legendById}
          selectedCode={selectedVillaArea?.code ?? null}
          selectionSeq={selectionSeq}
          onSelect={(area) => selectArea(area, VILLA_PARK_ID)}
          // View-only by construction: this public surface never grants plotting,
          // even to an admin. Plot authoring lives on /staff/property.
          canPlot={false}
          onExit={leave3d}
          fullscreen={fullscreen}
          details={
            <PlotDetails
              selected={
                selectedVillaArea ? { area: selectedVillaArea, parkId: VILLA_PARK_ID } : null
              }
              lots={lots}
              parkName={parkName}
            />
          }
        />
      ) : (
        <div className={enable3d ? "map-shell" : undefined}>
          <div className="map-layout">
            <div className="stack-4" style={{ flex: "1 1 auto", minWidth: 0 }}>
              <ParkMapsView
                // Public viewer: never editable here, for anyone.
                canEdit={false}
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
        </div>
      )}
    </div>
  );
}
