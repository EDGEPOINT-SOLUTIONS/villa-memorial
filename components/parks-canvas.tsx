"use client";

/**
 * ParksCanvas — Leaflet CRS.Simple park map.
 *
 * Modes: view (click selects) · place (click drops a SQUARE anywhere) ·
 * move (SMOOTH drag: the plot follows the cursor live, committed on release).
 *
 * Plotting is unrestricted — coordinates are never clamped to the image/frame.
 * Every plot carries a centered label: the LOT NUMBER, plus the OWNER NAME
 * when sold/occupied. Crisp pixels kick in past native zoom.
 */
import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LegendEntry, PlotArea } from "@/lib/park-maps";
import { labelsTightAt } from "@/lib/park-maps";

const W = 100;
const H = 75;

const NO_FLIP = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
});

function cssToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function statusColor(status: PlotArea["status"]): string {
  switch (status) {
    case "available":
      return cssToken("--color-status-success", "#6f8f6a");
    case "reserved":
      return cssToken("--color-status-warning", "#b08a3e");
    case "sold":
      return cssToken("--color-status-info", "#5b7086");
    case "occupied":
      return cssToken("--granite-500", "#98a1aa");
    default:
      return cssToken("--color-status-danger", "#b3695e");
  }
}

type Mode = "view" | "place" | "move";
type LayerSet = { shape: L.Path; label: L.Marker };
type DragState = {
  id: string;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  outline: Array<[number, number]>;
  circle: { x: number; y: number; r: number } | null;
};

function centerOf(outline: Array<[number, number]>): [number, number] {
  const lats = outline.map((p) => p[1]); // outline stores [x, y]
  const lngs = outline.map((p) => p[0]);
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function ParksCanvas({
  parkId,
  image,
  scale,
  areas,
  mode,
  plotSize,
  selectedCode,
  legendById = {},
  onSelect,
  onPlace,
  onMovePlot,
}: {
  parkId: string;
  image: string;
  scale: number;
  areas: PlotArea[];
  mode: Mode;
  plotSize: number;
  selectedCode: string | null;
  /** Legend type entries per typeId: plot fill colour + label type name. */
  legendById?: Record<string, LegendEntry>;
  onSelect: (area: PlotArea) => void;
  onPlace: (x: number, y: number, size: number) => void;
  onMovePlot: (areaId: string, dx: number, dy: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const layersRef = useRef<Map<string, LayerSet>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const sizeRef = useRef(plotSize);
  sizeRef.current = plotSize;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const overlayUnitsRef = useRef({ w: W, h: H });
  const overviewZoomRef = useRef<number | null>(null);

  const updateCrisp = useCallback(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;
    const img = overlay.getElement();
    if (!img || !img.naturalWidth) return;
    const a = map.latLngToContainerPoint(L.latLng(0, 0));
    const b = map.latLngToContainerPoint(L.latLng(0, 100));
    const pxPerUnit = Math.abs(b.x - a.x) / 100;
    const displayWidth = pxPerUnit * overlayUnitsRef.current.w;
    img.classList.toggle("geo-image-pixelated", displayWidth > img.naturalWidth * 1.05);
  }, []);

  /* Overview label density: at the whole-park view the legend-type line on
     every plot label repeats the legend below the map and buries the lot
     codes. The type line returns once the visitor zooms past the overview;
     the code and owner stay at every zoom (rule in lib/park-maps.ts). */
  const updateLabelDensity = useCallback(() => {
    const el = holder.current;
    const map = mapRef.current;
    if (!el || !map) return;
    const overview = overviewZoomRef.current ?? map.getZoom();
    el.setAttribute(
      "data-label-density",
      labelsTightAt(map.getZoom(), overview) ? "tight" : "full",
    );
  }, []);

  // Fit the image by its NATURAL aspect ratio (contain, centered, no stretch).
  const fitOverlayToImage = useCallback(
    (el: HTMLImageElement) => {
      const overlay = overlayRef.current;
      const map = mapRef.current;
      if (!overlay || !map || !el.naturalWidth) return;
      const ratio = el.naturalWidth / el.naturalHeight;
      let fitW = W;
      let fitH = fitW / ratio;
      if (fitH > H) {
        fitH = H;
        fitW = fitH * ratio;
      }
      const w = fitW * scaleRef.current;
      const h = fitH * scaleRef.current;
      const x0 = (W - w) / 2;
      const y0 = (H - h) / 2;
      const bounds = L.latLngBounds(L.latLng(y0, x0), L.latLng(y0 + h, x0 + w));
      overlay.setBounds(bounds);
      overlayUnitsRef.current = { w, h };
      updateCrisp();
    },
    [updateCrisp],
  );
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const placeRef = useRef(onPlace);
  placeRef.current = onPlace;
  const moveRef = useRef(onMovePlot);
  moveRef.current = onMovePlot;
  const areasRef = useRef(areas);
  areasRef.current = areas;

  useEffect(() => {
    if (!holder.current) return;
    const map = L.map(holder.current, {
      crs: NO_FLIP,
      minZoom: -4,
      maxZoom: 14,
      scrollWheelZoom: true,
      // zoomSnap: 0 — an image map is not a tile map (craft pass, 2026-09-18).
      // With Leaflet's default snap of 1, fitBounds FLOORS the fitted zoom
      // (2.84 → 2), so the square masterplan rendered 300px wide inside a
      // 1060×540 frame with every plot label piled into one smear. With no
      // snap the fitted view is exact: the plan fills the frame's height and
      // the labels have room to read. The ±/wheel controls still step by 1.
      zoomSnap: 0,
    });
    map.fitBounds([
      [0, 0],
      [H, W],
    ]);
    overviewZoomRef.current = map.getZoom();
    mapRef.current = map;
    groupRef.current = L.layerGroup().addTo(map);

    map.on("mousemove", onMapMove);
    map.on("mouseup", onMapUp);
    map.on("click", onMapClick);
    map.on("zoomend", updateCrisp);
    map.on("zoomend", updateLabelDensity);
    map.on("resize", updateCrisp);

    // Initial framing: the map is built before layout settles, so the first
    // fitBounds can be computed against a much smaller box and leave the image
    // tiny in a large frame. Re-fit while the box grows, until the visitor
    // takes control (pan/zoom/keys) — after that their view is left alone.
    let userMoved = false;
    const noteUserIntent = () => {
      userMoved = true;
    };
    const box = holder.current;
    box.addEventListener("wheel", noteUserIntent, { passive: true });
    box.addEventListener("pointerdown", noteUserIntent);
    box.addEventListener("touchstart", noteUserIntent, { passive: true });
    box.addEventListener("keydown", noteUserIntent);
    const refit = () => {
      const current = mapRef.current;
      if (!current || userMoved || !box.clientWidth || !box.clientHeight) return;
      current.invalidateSize();
      current.fitBounds([
        [0, 0],
        [H, W],
      ]);
      overviewZoomRef.current = current.getZoom();
      updateCrisp();
      updateLabelDensity();
    };
    const observer = new ResizeObserver(refit);
    observer.observe(box);
    refit();

    // The ResizeObserver only catches a box that changes AFTER it is attached.
    // When the effect runs before the page's first full layout (the map band on
    // the home page, or a page reached with the viewport already settled), the
    // first fitBounds lands on a smaller measured box than the one the visitor
    // sees and nothing fires later: the frame stayed 300px wide inside a
    // 1062px panel with every plot label piled into one smear (craft pass,
    // 2026-09-18). Two post-layout refits are idempotent — they are skipped the
    // moment the visitor pans or zooms.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      refit();
      raf2 = requestAnimationFrame(refit);
    });
    const settleTimer = window.setTimeout(refit, 320);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      box.removeEventListener("wheel", noteUserIntent);
      box.removeEventListener("pointerdown", noteUserIntent);
      box.removeEventListener("touchstart", noteUserIntent);
      box.removeEventListener("keydown", noteUserIntent);
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
      overlayRef.current = null;
      dragRef.current = null;
      layersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === "place" || mode === "move") {
      map.dragging.disable();
      map.touchZoom?.disable();
    } else {
      map.dragging.enable();
      map.touchZoom?.enable();
    }
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((l) => {
      if (l instanceof L.ImageOverlay) map.removeLayer(l);
    });
    const overlay = L.imageOverlay(image, [
      [0, 0],
      [H, W],
    ]).addTo(map);
    overlayRef.current = overlay;
    const el = overlay.getElement();
    if (!el) return;
    const onLoad = () => {
      fitOverlayToImage(el);
      el.addEventListener("load", updateCrisp);
    };
    if (el.complete && el.naturalWidth) fitOverlayToImage(el);
    else el.addEventListener("load", onLoad);
    updateCrisp();
  }, [parkId, image, scale, fitOverlayToImage, updateCrisp]);

  // Redraw plots + labels, keeping live layer references for smooth dragging.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    layersRef.current = new Map();
    const brass = cssToken("--brass-500", "#a8873f");
    for (const area of areas) {
      const selected = area.code === selectedCode;
      const statusFill = statusColor(area.status);
      const type = area.typeId ? legendById[area.typeId] : undefined;
      const fill = type?.color ?? statusFill;
      const opts: L.PathOptions = {
        // Outline keeps the STATUS colour; the fill shows the legend TYPE colour.
        color: selected ? brass : statusFill,
        weight: selected ? 4 : 2,
        fillColor: fill,
        fillOpacity: selected ? 0.45 : type ? 0.3 : 0.16,
      };
      let shape: L.Path;
      let center: [number, number];
      if (area.circle) {
        shape = L.circle([area.circle.y, area.circle.x], { ...opts, radius: area.circle.r });
        center = [area.circle.y, area.circle.x];
      } else {
        const pts = (area.outline ?? []).map(([x, y]) => [y, x] as [number, number]);
        shape = L.polygon(pts, opts);
        center = centerOf(area.outline ?? []);
      }

      shape.on("mousedown", (e: L.LeafletMouseEvent) => {
        if (modeRef.current !== "move") {
          selectRef.current(area);
          return;
        }
        const src = areasRef.current.find((a) => a.id === area.id) ?? area;
        dragRef.current = {
          id: src.id,
          startX: e.latlng.lng,
          startY: e.latlng.lat,
          curX: e.latlng.lng,
          curY: e.latlng.lat,
          outline: src.outline ? src.outline.map((p) => [p[0], p[1]] as [number, number]) : [],
          circle: src.circle ? { ...src.circle } : null,
        };
        e.originalEvent.stopPropagation();
      });
      shape.addTo(group);

      const owner = area.owner?.trim();
      // Label = legend TYPE (coloured) + lot number + owner when recorded.
      const typeName = area.typeId ? legendById[area.typeId]?.name : undefined;
      const typeColor = area.typeId ? legendById[area.typeId]?.color : undefined;
      const html =
        `<div class="plot-label">` +
        (typeName
          ? `<span class="plot-label__type" style="--plt:${typeColor}">${escapeHtml(typeName)}</span>`
          : "") +
        `<span class="plot-label__code">${escapeHtml(area.code)}</span>` +
        (owner ? `<span class="plot-label__owner">${escapeHtml(owner)}</span>` : "") +
        `</div>`;
      const label = L.marker(center, {
        icon: L.divIcon({
          className: "plot-label-marker",
          html,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
      });
      label.addTo(group);
      layersRef.current.set(area.id, { shape, label });
    }
  }, [areas, selectedCode, parkId, mode, legendById]);

  // ---- Smooth drag: update geometry LIVE, commit on mouseup ----
  function applyDragToShape(d: DragState) {
    const layers = layersRef.current.get(d.id);
    if (!layers) return;
    const dx = d.curX - d.startX;
    const dy = d.curY - d.startY;
    if (d.circle) {
      const nx = d.circle.x + dx;
      const ny = d.circle.y + dy;
      (layers.shape as L.Circle).setLatLng([ny, nx]);
      layers.label.setLatLng([ny, nx]);
    } else {
      const pts = d.outline.map(([x, y]) => [y + dy, x + dx] as [number, number]);
      (layers.shape as L.Polygon).setLatLngs(pts);
      layers.label.setLatLng(centerOf(d.outline.map(([x, y]) => [x + dx, y + dy] as [number, number])));
    }
  }

  function onMapMove(e: L.LeafletMouseEvent) {
    const d = dragRef.current;
    if (!d) return;
    d.curX = e.latlng.lng;
    d.curY = e.latlng.lat;
    applyDragToShape(d);
  }

  function onMapUp() {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const dx = d.curX - d.startX;
    const dy = d.curY - d.startY;
    if (Math.abs(dx) >= 0.05 || Math.abs(dy) >= 0.05) {
      moveRef.current(d.id, dx, dy);
    } else {
      const area = areasRef.current.find((a) => a.id === d.id);
      if (area) selectRef.current(area);
    }
  }

  function onMapClick(e: L.LeafletMouseEvent) {
    if (modeRef.current !== "place") return;
    placeRef.current(e.latlng.lng, e.latlng.lat, sizeRef.current);
  }

  return (
    <div
      ref={holder}
      className={
        mode === "place" ? "geo-map geo-map--place" : mode === "move" ? "geo-map geo-map--move" : "geo-map"
      }
      aria-label="Park plots map"
    />
  );
}
