"use client";

/**
 * Park maps store — 3 demo parks (Villa Memorial · Loyola Gardens · Golden
 * Haven), each with an image and NON-OVERLAPPING plot areas.
 *
 * Staff can draw/edit plot areas; customers see the SAME data (one store).
 * ⚠ Persistence is DEMO-LOCAL (localStorage): real multi-user sync across
 * devices needs the dev's geometry/maps contract (see
 * docs/08-delivery/notes/lot-geometry-contract-proposal.md). Flagged, not
 * faked.
 */
import { useSyncExternalStore } from "react";
import { LOT_TYPE_PHOTOS } from "@/lib/media";
import { PARK_TYPES } from "@/lib/park-types";
import parksFile from "@/lib/fixtures/property/parks.json";

export type CircleShape = { x: number; y: number; r: number };

export type PlotArea = {
  id: string;
  code: string;
  lot_id: string | null; // linked to a sellable Lot (Villa) when present
  status: "available" | "reserved" | "sold" | "occupied" | "maintenance";
  /** Polygon outline. Legacy/linked lots + square plots. */
  outline?: Array<[number, number]>;
  /** Circle plot (legacy support). */
  circle?: CircleShape;
  /** Owner display name (shown under the section/block line). */
  owner?: string;
  /** Display text like "A · 1" (section · block). */
  sectionBlock?: string;
  /** Legend/plot type (id from the legend store). Staff must pick one when adding. */
  typeId?: string;
};

export type PlotShape = { x: number; y: number; r: number };

export type ParkMap = {
  id: string;
  name: string;
  branch: string;
  image: string;
};

type RawSeed = {
  id: string;
  name: string;
  branch: string;
  image: string;
  plots: Array<{
    id: string;
    code: string;
    lot_id: string | null;
    status: PlotArea["status"];
    outline: number[][];
    owner?: string;
    sectionBlock?: string;
    typeId?: string;
  }>;
};

const SEED: RawSeed[] = (parksFile as { parks: RawSeed[] }).parks;

function normalize(areas: Array<{ outline: number[][]; } & Omit<PlotArea, "outline">>): PlotArea[] {
  return areas.map((a) => ({
    id: a.id,
    code: a.code,
    lot_id: a.lot_id,
    status: a.status,
    ...(a.outline ? { outline: a.outline.map((p) => [p[0], p[1]] as [number, number]) } : {}),
    ...(a.circle ? { circle: { x: a.circle.x, y: a.circle.y, r: a.circle.r } } : {}),
    ...(a.owner ? { owner: a.owner } : {}),
    ...(a.sectionBlock ? { sectionBlock: a.sectionBlock } : {}),
    ...(a.typeId ? { typeId: a.typeId } : {}),
  }));
}

/* ---------------------------------------------------------------------------
 * Legend — plot TYPES (unlimited, staff-defined). Each entry has a name,
 * a colour and an optional image (the uploaded lot photos). Plots reference
 * an entry via typeId; staff MUST choose the type when adding a plot.
 * Demo-local (localStorage); real persistence awaits the dev geometry
 * contract.
 * ------------------------------------------------------------------------- */

export type LegendEntry = {
  id: string;
  name: string;
  color: string;
  /** Optional image (built-in /media photo or none). */
  image?: string;
};

/** Built-in lot-type photos staff can attach to a legend entry. */
export const LEGEND_IMAGE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "No image", value: "" },
  { label: "Primary lot photo", value: LOT_TYPE_PHOTOS["lt-primary"] },
  { label: "Premium lot photo", value: LOT_TYPE_PHOTOS["lt-premium"] },
  { label: "Garden niches photo", value: LOT_TYPE_PHOTOS["lt-niches"] },
  { label: "Mausoleum photo", value: LOT_TYPE_PHOTOS["lt-mausoleum"] },
];

const LEGEND_PALETTE = [
  "#a16207", // premium — bronze
  "#1f6f8b", // primary — deep blue
  "#5f8a3c", // garden — moss
  "#4b7f52", // niches — green
  "#6d5b8e", // mausoleum — mauve
  "#5b5f66", // main road — slate
  "#a89f8a", // walking path — sand
  "#3d8b6d", // park — green
  "#c2554f", // accent
  "#7c7a8c", // standard — stone
];

let nextPalette = 0;

function paletteColor(): string {
  const c = LEGEND_PALETTE[nextPalette % LEGEND_PALETTE.length];
  nextPalette++;
  return c;
}

export const DEFAULT_LEGEND: LegendEntry[] = PARK_TYPES.map((t) => ({ ...t }));

const LEGEND_KEY = "im_legend_v2";

function cloneLegend(list: LegendEntry[]): LegendEntry[] {
  return list.map((e) => ({ ...e }));
}

function loadLegend(): LegendEntry[] {
  try {
    const raw = window.localStorage.getItem(LEGEND_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LegendEntry[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .filter((e) => e && typeof e.id === "string" && typeof e.name === "string")
          .map((e) => ({ id: e.id, name: e.name, color: e.color || paletteColor(), ...(e.image ? { image: e.image } : {}) }));
      }
    }
  } catch {
    // ignore
  }
  return cloneLegend(DEFAULT_LEGEND);
}

let legendCache: LegendEntry[] = typeof window === "undefined" ? cloneLegend(DEFAULT_LEGEND) : loadLegend();

function persistLegend() {
  try {
    window.localStorage.setItem(LEGEND_KEY, JSON.stringify(legendCache));
  } catch {
    // private mode — in-memory only
  }
  notify();
}

/** All legend entries (copies — mutate via the update helpers). */
export function legendList(): LegendEntry[] {
  return cloneLegend(legendCache);
}

/** Lookup id → legend entry. */
export function legendEntry(id?: string): LegendEntry | undefined {
  if (!id) return undefined;
  return legendCache.find((e) => e.id === id);
}

/** Add an unlimited legend entry; returns it (caller may re-render). */
export function addLegendEntry(name: string): LegendEntry {
  const clean = name.trim().toUpperCase();
  const entry: LegendEntry = {
    id: "lt-" + Math.random().toString(36).slice(2, 8),
    name: clean || "NEW TYPE",
    color: paletteColor(),
  };
  legendCache = [...legendCache, entry];
  persistLegend();
  return entry;
}

export function updateLegendEntry(id: string, patch: Partial<LegendEntry>) {
  const i = legendCache.findIndex((e) => e.id === id);
  if (i === -1) return;
  legendCache = legendCache.map((e, idx) => (idx === i ? { ...e, ...patch, id: e.id } : e));
  persistLegend();
}

/** Remove an entry; plots of that type fall back to their status colour. */
export function removeLegendEntry(id: string) {
  if (legendCache.length <= 1) return;
  const next = legendCache.filter((e) => e.id !== id);
  if (next.length === legendCache.length) return;
  legendCache = next;
  for (const key of Object.keys(cache)) {
    cache[key] = cache[key].map((a) => (a.typeId === id ? { ...a, typeId: undefined } : a));
  }
  persistLegend();
}

const STORAGE_KEY = "im_parks_v7";
const ACTIVE_KEY = "im_active_park_v7";

type Cache = Record<string, PlotArea[]>;

function loadCache(): Cache {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Cache;
      // Keep any parks added in newer seeds.
      const merged: Cache = {};
      for (const p of SEED) merged[p.id] = parsed[p.id] ? normalize(parsed[p.id] as never) : normalize(p.plots as never);
      return merged;
    }
  } catch {
    // ignore
  }
  const fresh: Cache = {};
  for (const p of SEED) fresh[p.id] = normalize(p.plots as never);
  return fresh;
}

const cache: Cache = typeof window === "undefined" ? {} : loadCache();
let version = 0;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // private mode — in-memory only
  }
}

function notify() {
  version++;
  for (const fn of listeners) fn();
}

export function parksList(): ParkMap[] {
  return SEED.map(({ id, name, branch, image }) => ({ id, name, branch, image }));
}

export function parkAreas(parkId: string): PlotArea[] {
  return (cache[parkId] ?? []).map((a) => ({
    ...a,
    ...(a.outline
      ? { outline: a.outline.map((p) => [p[0], p[1]] as [number, number]) }
      : {}),
  }));
}

export function saveParkAreas(parkId: string, areas: PlotArea[]) {
  cache[parkId] = areas.map((a) => ({
    ...a,
    ...(a.outline
      ? { outline: a.outline.map((p) => [p[0], p[1]] as [number, number]) }
      : {}),
  }));
  persist();
  notify();
}

export function activeParkId(): string {
  try {
    const saved = window.localStorage.getItem(ACTIVE_KEY);
    if (saved && SEED.some((p) => p.id === saved)) return saved;
  } catch {
    // ignore
  }
  return SEED[0].id;
}

export function setActiveParkId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
  notify();
}

function boundsOf(area: PlotArea): { minX: number; maxX: number; minY: number; maxY: number } {
  if (area.circle) {
    return { minX: area.circle.x - area.circle.r, maxX: area.circle.x + area.circle.r, minY: area.circle.y - area.circle.r, maxY: area.circle.y + area.circle.r };
  }
  const xs = area.outline!.map((p) => p[0]);
  const ys = area.outline!.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function rectsOverlap(a: { minX: number; maxX: number; minY: number; maxY: number }, b: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/** Distance check between a circle and an axis-aligned rectangle (conservative). */
function circleRectOverlap(cx: number, cy: number, r: number, rect: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  const nx = Math.max(rect.minX, Math.min(cx, rect.maxX));
  const ny = Math.max(rect.minY, Math.min(cy, rect.maxY));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/** True when two plots touch/overlap (handles circle and polygon plots). */
export function overlaps(a: PlotArea, b: PlotArea): boolean {
  const ba = boundsOf(a);
  const bb = boundsOf(b);
  if (a.circle && b.circle) {
    const dx = a.circle.x - b.circle.x;
    const dy = a.circle.y - b.circle.y;
    const r = a.circle.r + b.circle.r;
    return dx * dx + dy * dy <= r * r;
  }
  if (a.circle && !b.circle) return circleRectOverlap(a.circle.x, a.circle.y, a.circle.r, bb);
  if (!a.circle && b.circle) return circleRectOverlap(b.circle.x, b.circle.y, b.circle.r, ba);
  return rectsOverlap(ba, bb);
}

/** Would a proposed circle (center x/y, radius r) collide with anything? */
export function circleOverlapsAny(x: number, y: number, r: number, areas: PlotArea[]): PlotArea | null {
  return areas.find((area) => {
    if (area.circle) {
      const dx = x - area.circle.x;
      const dy = y - area.circle.y;
      const rr = r + area.circle.r;
      return dx * dx + dy * dy <= rr * rr;
    }
    return circleRectOverlap(x, y, r, boundsOf(area));
  }) ?? null;
}

export function nextAreaCode(areas: PlotArea[], parkName: string): string {
  const prefix = parkName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const max = areas.reduce((n, a) => {
    const m = a.code.match(/(\d+)$/);
    return m ? Math.max(n, parseInt(m[1], 10)) : n;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}

/** Subscribe hook: re-renders whenever park data or active park changes. */
export function useParkStore(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

/* ---------------------------------------------------------------------------
 * Park editor metadata (image upload/rescale + layout locks).
 * Demo-local (localStorage) — real per-tenant media + persistence await the
 * dev geometry/media contract.
 * ------------------------------------------------------------------------- */

export type ParkMeta = {
  customImage?: string; // data URL uploaded by admin (demo store)
  scale: number; // image display scale (0.5–2), centered
  imageLocked: boolean;
  plotsLocked: boolean;
};

const META_KEY = "im_park_meta_v7";

function defaultMeta(): ParkMeta {
  return { scale: 1, imageLocked: false, plotsLocked: false };
}

function loadMeta(): Record<string, ParkMeta> {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ParkMeta>;
      const out: Record<string, ParkMeta> = {};
      for (const p of SEED) {
        const m = parsed[p.id];
        out[p.id] = {
          customImage: m?.customImage,
          scale: typeof m?.scale === "number" ? m.scale : 1,
          imageLocked: Boolean(m?.imageLocked),
          plotsLocked: Boolean(m?.plotsLocked),
        };
      }
      return out;
    }
  } catch {
    // ignore
  }
  const fresh: Record<string, ParkMeta> = {};
  for (const p of SEED) fresh[p.id] = defaultMeta();
  return fresh;
}

const metaCache: Record<string, ParkMeta> = typeof window === "undefined" ? {} : loadMeta();

export function getParkMeta(parkId: string): ParkMeta {
  return { ...defaultMeta(), ...(metaCache[parkId] ?? {}) };
}

export function saveParkMeta(parkId: string, patch: Partial<ParkMeta>) {
  metaCache[parkId] = { ...getParkMeta(parkId), ...patch };
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(metaCache));
  } catch {
    // storage full/private — in-memory only
  }
  notify();
}

/* ---------------------------------------------------------------------------
 * Park image media — stored in INDEXEDDB (not localStorage) so uploads larger
 * than a few MB work. Demo-local; real media + persistence await the dev
 * geometry/media contract.
 * ------------------------------------------------------------------------- */

const DB_NAME = "im-park-media";
const DB_VERSION = 1;
const STORE = "images";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const imageKey = (parkId: string) => `park:${parkId}`;

/** Persist an uploaded park image (any reasonable size). */
export async function saveParkImage(parkId: string, dataUrl: string): Promise<void> {
  await idbSet(imageKey(parkId), dataUrl);
  notify();
}

/** Load the uploaded park image, or null. */
export async function loadParkImage(parkId: string): Promise<string | null> {
  const v = await idbGet(imageKey(parkId));
  return typeof v === "string" ? v : null;
}

/** Remove the uploaded park image (falls back to the seed image). */
export async function clearParkImage(parkId: string): Promise<void> {
  await idbDelete(imageKey(parkId));
  notify();
}

/** Reset ALL demo park data back to the seeded sample (plots, meta, images,
 * active park) — for reviewers whose browser cached older/broken shapes. */
export async function resetParkDemo(): Promise<void> {
  // Clear persisted layers.
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(META_KEY);
    window.localStorage.removeItem(ACTIVE_KEY);
    window.localStorage.removeItem(LEGEND_KEY);
  } catch {
    // ignore
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  // Rebuild in-memory caches from the seeds.
  const fresh: Cache = {};
  for (const p of SEED) fresh[p.id] = normalize(p.plots as never);
  Object.keys(cache).forEach((k) => delete cache[k]);
  Object.assign(cache, fresh);
  const freshMeta: Record<string, ParkMeta> = {};
  for (const p of SEED) freshMeta[p.id] = defaultMeta();
  Object.keys(metaCache).forEach((k) => delete metaCache[k]);
  Object.assign(metaCache, freshMeta);
  legendCache = cloneLegend(DEFAULT_LEGEND);
  persist();
  notify();
}
