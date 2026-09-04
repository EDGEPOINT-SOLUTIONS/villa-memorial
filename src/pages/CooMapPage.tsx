// ============================================================================
// CooMapPage — pixel port of the COO Stitch mockup
//   stitch_villa_memorial_digital_platform/sanctuario_interactive_map_with_master_plan/code.html
// Rendered one-to-one (verbatim copy, exact hex colors, exact layout, same
// images/remote URLs). Demo interactivity on top: lot selection, search,
// availability + property-type filters, and toast feedback for business actions.
// Mounted via a route added by the integrator — this file only exports CooMapPage.
// ============================================================================

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useToast } from "../components/toast";
import { useCart } from "../lib/cart";
import { parseMoney } from "../lib/shop";

type LotStatus = "available" | "reserved" | "occupied";
type LotKind = "lawn" | "mausoleum";

type Lot = { code: string; kind: LotKind; status: LotStatus };

// The board cells exactly as drawn in the mockup (Section A - Serenity Lawns).
const LOT_BY_CODE: Record<string, Lot> = {
  "A-1": { code: "A-1", kind: "lawn", status: "available" },
  "A-2": { code: "A-2", kind: "lawn", status: "available" },
  "A-3": { code: "A-3", kind: "lawn", status: "occupied" },
  "A-4": { code: "A-4", kind: "lawn", status: "reserved" },
  "A-5": { code: "A-5", kind: "lawn", status: "available" },
  "A-6": { code: "A-6", kind: "lawn", status: "available" },
  "M-1": { code: "M-1", kind: "mausoleum", status: "occupied" },
  "M-2": { code: "M-2", kind: "mausoleum", status: "available" },
};

// showLotDetails logic in the source: mausoleum lots show ₱450,000 / Family
// Mausoleum; lawn lots show ₱75,000 / Premium Lawn.
const KIND_PRICE: Record<LotKind, string> = { lawn: "₱75,000", mausoleum: "₱450,000" };
const KIND_TYPE: Record<LotKind, string> = { lawn: "Premium Lawn", mausoleum: "Family Mausoleum" };

// Status pill classes (exact hexes) — full literals so Tailwind JIT keeps them.
const STATUS_BADGE: Record<LotStatus, string> = {
  available: "bg-emerald-100 text-emerald-800",
  reserved: "bg-yellow-100 text-yellow-800",
  occupied: "bg-gray-200 text-gray-700",
};

const STATUS_LABEL: Record<LotStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
};

const CHIPS = ["All Types", "Lawn", "Mausoleum", "Columbarium"] as const;
type Chip = (typeof CHIPS)[number];

const MEMORIAL = {
  name: "Eleanor Grace Vance",
  sunrise: "Sunrise: March 12, 1945",
  sunset: "Sunset: October 05, 2022",
};

const MASTER_PLAN_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBQSx9LmIps_GSUzhmQSJHoyv0MqhyRZtMd3KiZuR7fRmEKKYa7RFgUJUkLAw9VTKmatd0BvhP3AflrdvzhvwyVLNkAbbLAax_D5IoQB97Ggeh5XtU83WkaRScIsCWqG7ODPPi8_ffGCgmbF1E8uQlIZjio3PuAapMfRDI-wMFzMCeMoS5FlgnpaXlYxo2Q6T26IN8oIX1BsLacUcVeKqbQK7SlKh6vCKnRCRmUi-UfsZBv5MMgwHuDyy-7WX1inu4SRg";

// Overlay geometry for interactive plots, as PERCENT of the map area. Plots
// sit on top of the same master-plan image shown in "Master Plan Overview"
// below, so the interactive map and the master plan are one and the same
// picture. Tune x/y/w/h here if a plot should sit elsewhere on the park image.
type Pos = { x: number; y: number; w: number; h: number };
const LOT_POS: Record<string, Pos> = {
  "A-1": { x: 19, y: 40, w: 8, h: 13 },
  "A-2": { x: 28, y: 40, w: 8, h: 13 },
  "A-3": { x: 37, y: 40, w: 8, h: 13 },
  "A-4": { x: 52, y: 40, w: 8, h: 13 },
  "A-5": { x: 61, y: 40, w: 8, h: 13 },
  "A-6": { x: 70, y: 40, w: 8, h: 13 },
  "M-1": { x: 81, y: 28, w: 14, h: 14 },
  "M-2": { x: 81, y: 46, w: 14, h: 14 },
};

const LEGEND: { hex: string; label: string }[] = [
  { hex: "#88b04b", label: "Premium Lots" },
  { hex: "#a8c67d", label: "Garden Lots" },
  { hex: "#c8dbaf", label: "Primary Lots" },
  { hex: "#003e58", label: "Mausoleum" },
  { hex: "#3a8d8d", label: "Garden Niches" },
  { hex: "#d1d1d1", label: "Main Road" },
  { hex: "#f4d376", label: "Walking Path" },
  { hex: "#92b558", label: "Park / Landscape" },
];


export function CooMapPage() {
  const { toast } = useToast();
  const { add } = useCart();

  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("All Types");
  const [statuses, setStatuses] = useState<Record<LotStatus, boolean>>({
    available: true,
    reserved: true,
    occupied: true,
  });
  const [selected, setSelected] = useState<Lot | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const q = query.trim().toLowerCase();

  function isVisible(lot: Lot): boolean {
    const kindOk =
      chip === "All Types" || (chip === "Lawn" && lot.kind === "lawn") || (chip === "Mausoleum" && lot.kind === "mausoleum");
    const statusOk = statuses[lot.status];
    const textOk = q.length === 0 || lot.code.toLowerCase().includes(q) || lot.kind.includes(q);
    return kindOk && statusOk && textOk;
  }

  function selectLot(lot: Lot) {
    setSelected(lot);
    // On phones/tablets (below the lg sidebar breakpoint) keep the filter
    // sheet open so the Lot Info Panel is actually visible; on the desktop
    // two-pane layout the panel lives in the sidebar.
    if (typeof window !== "undefined") {
      setMobileOpen(window.innerWidth < 1024);
    } else {
      setMobileOpen(false);
    }
  }

  function clickChip(next: Chip) {
    if (next === "Columbarium") {
      toast("Demo: section not loaded", "default");
      return;
    }
    setChip(next);
  }

  function toggleStatus(s: LotStatus) {
    setStatuses((prev) => ({ ...prev, [s]: !prev[s] }));
  }

  // --- Fit the master-plan image inside the canvas (contain), so overlay
  // coordinates map 1:1 to the picture regardless of screen size -------------
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ nw: number; nh: number } | null>(null);
  const [fit, setFit] = useState<{ l: number; t: number; w: number; h: number } | null>(null);

  function handleImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    setDims({ nw: el.naturalWidth || 1, nh: el.naturalHeight || 1 });
  }

  useEffect(() => {
    function apply() {
      const box = canvasRef.current;
      if (!box || !dims) return;
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const scale = Math.min(cw / dims.nw, ch / dims.nh);
      const w = dims.nw * scale;
      const h = dims.nh * scale;
      setFit({ l: (cw - w) / 2, t: (ch - h) / 2, w, h });
    }
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [dims]);

  // --- Sidebar content (desktop aside + mobile bottom sheet share it) --------
  const sidebarContent = (
    <>
      <div>
        <h1 className="mb-2 font-headline-sm text-headline-sm text-primary">Sanctuario Memorial Park</h1>
        <p className="text-sm text-on-surface-variant">Interactive Memorial Map</p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-10 pr-4 outline-none transition-all placeholder:text-outline focus:border-primary-container focus:ring-1 focus:ring-primary-container"
            placeholder="Search Lot ID, Section, Block..."
            type="text"
            aria-label="Search Lot ID, Section, Block"
          />
        </div>

        {/* Property Type */}
        <div className="mt-4">
          <h3 className="mb-3 font-label-md text-label-md text-on-surface uppercase">Property Type</h3>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) =>
              chip === c ? (
                <button
                  key={c}
                  type="button"
                  onClick={() => clickChip(c)}
                  className="rounded-full border border-transparent bg-primary-fixed px-4 py-2 text-sm font-medium text-on-primary-container"
                >
                  {c}
                </button>
              ) : (
                <button
                  key={c}
                  type="button"
                  onClick={() => clickChip(c)}
                  className="rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-variant"
                >
                  {c}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Availability Status */}
        <div className="mt-4">
          <h3 className="mb-3 font-label-md text-label-md text-on-surface uppercase">Availability Status</h3>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container-low">
              <input
                type="checkbox"
                checked={statuses.available}
                onChange={() => toggleStatus("available")}
                className="h-5 w-5 rounded border-outline text-primary focus:ring-primary"
              />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-on-surface">Available</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container-low">
              <input
                type="checkbox"
                checked={statuses.reserved}
                onChange={() => toggleStatus("reserved")}
                className="h-5 w-5 rounded border-outline text-primary focus:ring-primary"
              />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="text-on-surface">Reserved</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-container-low">
              <input
                type="checkbox"
                checked={statuses.occupied}
                onChange={() => toggleStatus("occupied")}
                className="h-5 w-5 rounded border-outline text-primary focus:ring-primary"
              />
              <span className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-on-surface">Occupied</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lot Info Panel (dynamic) */}
      {selected && (
        <div className="mt-auto flex flex-col border-t border-outline-variant pt-6">
          <div className="mb-2 flex items-start justify-between">
            <h2 className="font-headline-sm text-headline-sm text-primary">{selected.code}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[selected.status]}`}>
              {STATUS_LABEL[selected.status]}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="mb-1 block text-on-surface-variant">Section</span>
              <strong className="text-on-surface">Section A</strong>
            </div>
            <div>
              <span className="mb-1 block text-on-surface-variant">Block</span>
              <strong className="text-on-surface">Block 3</strong>
            </div>
            <div>
              <span className="mb-1 block text-on-surface-variant">Type</span>
              <strong className="text-on-surface">{KIND_TYPE[selected.kind]}</strong>
            </div>
            <div>
              <span className="mb-1 block text-on-surface-variant">Price</span>
              <strong className="text-lg text-primary">{KIND_PRICE[selected.kind]}</strong>
            </div>
          </div>

          {/* Action buttons: available / reserved */}
          {selected.status === "available" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  add({
                    id: `lot-${selected.code}`,
                    name: `Lot ${selected.code} · Section A`,
                    kindLabel: "Memorial lot",
                    detail: `${KIND_TYPE[selected.kind]} · reservation`,
                    unit: parseMoney(KIND_PRICE[selected.kind]),
                  });
                  toast(`Reservation started for ${selected.code} — added to your cart.`, "success");
                }}
                className="min-h-[48px] w-full rounded-lg bg-secondary px-4 py-3 font-semibold text-on-secondary shadow-sm transition-colors hover:bg-secondary-fixed-dim"
              >
                RESERVE
              </button>
              <button
                type="button"
                onClick={() => {
                  add({
                    id: `lot-${selected.code}`,
                    name: `Lot ${selected.code} · Section A`,
                    kindLabel: "Memorial lot",
                    detail: KIND_TYPE[selected.kind],
                    unit: parseMoney(KIND_PRICE[selected.kind]),
                  });
                  toast(`${selected.code} added to your cart.`, "success");
                }}
                className="min-h-[48px] w-full rounded-lg border border-primary-container bg-surface px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary-fixed"
              >
                ADD TO CART
              </button>
              <button
                type="button"
                onClick={() => toast(`Inquiry sent for ${selected.code}.`, "success")}
                className="min-h-[48px] w-full rounded-lg border border-outline-variant bg-transparent px-4 py-3 font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant"
              >
                INQUIRE
              </button>
            </div>
          )}
          {selected.status === "reserved" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => toast(`Status inquiry sent for ${selected.code}.`, "default")}
                className="min-h-[48px] w-full rounded-lg border border-outline-variant bg-transparent px-4 py-3 font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant"
              >
                INQUIRE STATUS
              </button>
            </div>
          )}

          {/* Memorial Information (occupied lots) */}
          {selected.status === "occupied" && (
            <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container p-4">
              <h4 className="mb-2 border-b border-outline-variant pb-2 font-label-md text-label-md text-on-surface uppercase">
                Memorial Information
              </h4>
              <div>
                <p className="text-lg font-semibold text-on-surface">{MEMORIAL.name}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{MEMORIAL.sunrise}</p>
                <p className="text-sm text-on-surface-variant">{MEMORIAL.sunset}</p>
              </div>
              <button
                type="button"
                onClick={() => toast(`Flower / tribute request sent for ${MEMORIAL.name}.`, "success")}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded py-2 px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-sm">local_florist</span>
                Send Flowers / Tribute
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  // --- One clickable plot overlay (positioned over the master-plan image) ----
  function renderLot(lot: Lot) {
    if (!isVisible(lot)) return null;
    const pos = LOT_POS[lot.code];
    if (!pos) return null;
    const base =
      lot.status === "available"
        ? "rounded-md border border-emerald-600/60 bg-emerald-500/85 shadow-sm hover:bg-emerald-400 flex items-center justify-center"
        : lot.status === "reserved"
          ? "rounded-md border border-yellow-500/60 bg-yellow-400/85 shadow-sm hover:bg-yellow-300 flex items-center justify-center"
          : "relative overflow-hidden rounded-md border border-gray-500/60 bg-gray-400/85 shadow-sm hover:bg-gray-300 flex items-center justify-center";
    const labelTone = lot.status === "reserved" ? "text-yellow-900" : "text-white";
    return (
      <button
        key={lot.code}
        type="button"
        aria-label={`Lot ${lot.code} — ${STATUS_LABEL[lot.status]}`}
        onClick={() => selectLot(lot)}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%` }}
        className={`absolute cursor-pointer transition-all ${base}`}
      >
        {lot.kind === "mausoleum" && (
          <span className="material-symbols-outlined absolute inset-x-0 -top-[2px] text-sm text-white/60" style={{ fontSize: "inherit" }}>
            account_balance
          </span>
        )}
        <span className={`text-[10px] font-bold opacity-90 ${labelTone}`}>{lot.code}</span>
        {lot.status === "occupied" && (
          <div className="pointer-events-none absolute inset-0 -skew-x-12 bg-white/20" />
        )}
      </button>
    );
  }

  return (
    <div>
      {/* Main Content Area */}
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-grow flex-col gap-gutter px-margin-mobile pb-section-gap h-[calc(100vh-76px)] md:flex-row md:px-margin-desktop">
        {/* Sidebar Filters & Search (desktop) */}
        <aside className="hidden h-full w-full flex-shrink-0 flex-col gap-gutter overflow-y-auto rounded-xl bg-surface-container-lowest p-6 pr-4 shadow-ambient lg:flex md:w-80">
          {sidebarContent}
        </aside>

        {/* Interactive Map Canvas */}
        <div className="relative flex-grow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-ambient md:h-full h-[calc(100vh-120px)]">
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              type="button"
              aria-label="Zoom In"
              onClick={() => toast("Demo: the map view is fixed on Section A.", "default")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-on-surface-variant shadow transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button
              type="button"
              aria-label="Zoom Out"
              onClick={() => toast("Demo: the map view is fixed on Section A.", "default")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-on-surface-variant shadow transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button
              type="button"
              aria-label="Reset View"
              onClick={() => toast("Demo: view reset to Section A.", "default")}
              className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-on-surface-variant shadow transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>

                    {/* Interactive map = the SAME master-plan image used below, with plots overlaid */}
          <div ref={canvasRef} className="relative h-full w-full overflow-hidden bg-surface-container-low">
            {fit ? (
              <div className="absolute" style={{ left: fit.l, top: fit.t, width: fit.w, height: fit.h }}>
                <img
                  src={MASTER_PLAN_IMG}
                  alt="Sanctuario Memorial Park interactive map (master plan)"
                  draggable={false}
                  onLoad={handleImageLoad}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
                {/* Section label chip */}
                <div className="absolute left-2 top-2 z-20 rounded-full bg-white/85 px-4 py-2 text-xs font-bold tracking-widest text-primary shadow-sm backdrop-blur-sm">
                  SECTION A · SERENITY LAWNS
                </div>
                {/* Clickable plots overlaid on the image */}
                {Object.values(LOT_BY_CODE).map((lot) => renderLot(lot))}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
                Loading park map…
              </div>
            )}
          </div>

          {/* Mobile Bottom Sheet Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-lg lg:hidden"
          >
            <span className="material-symbols-outlined">tune</span>
            Filters &amp; Search
          </button>
        </div>

        {/* Mobile / tablet filters & lot-info slide-over (shared sidebar content) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* backdrop */}
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-black/25 backdrop-blur-[2px]"
            />
            {/* sheet */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filters & Search"
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-outline-variant bg-surface-container-lowest p-6 pb-8 shadow-ambient"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="font-headline-sm text-headline-sm text-primary">Filters &amp; Search</span>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-gutter">{sidebarContent}</div>
            </div>
          </div>
        )}
      </div>

      {/* Master Plan Overview */}
      <section className="mx-auto w-full max-w-[1200px] bg-surface-bright px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="flex flex-col gap-gutter">
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-headline-md text-headline-md text-primary">Master Plan Overview</h2>
            <p className="mx-auto max-w-3xl text-on-surface-variant">
              This map provides a complete bird's-eye view of Sanctuario Memorial Park's sectors, facilities, and
              beautifully landscaped grounds.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start lg:grid-cols-8" style={{ gap: "24px" }}>
            {/* Map Image Container */}
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-ambient lg:col-span-6">
              <img
                alt="Sanctuario Memorial Park Master Plan"
                className="h-auto w-full rounded-lg"
                src={MASTER_PLAN_IMG}
              />
            </div>

            {/* Legend Container */}
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 lg:col-span-2">
              <h3 className="mb-4 font-label-md text-label-md text-on-surface uppercase tracking-wider">Map Legend</h3>
              <ul className="flex flex-col gap-3">
                {LEGEND.map((item) => (
                  <li key={item.hex} className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded" style={{ backgroundColor: item.hex }} />
                    <span className="text-sm text-on-surface-variant">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

