"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import catalogFixture from "@/lib/fixtures/commerce/catalog-items.json";
import { toChapelBookingLine } from "@/lib/chapel-booking";
import {
  quoteLineDescriptor,
  type QuoteLine,
  type QuoteLineDescriptor,
  type QuoteLinePricing,
} from "@/lib/quote-basket/quote-line";

export type { QuoteLine, QuoteLineDescriptor, QuoteLinePricing } from "@/lib/quote-basket/quote-line";

/**
 * The QUOTE BASKET — client-side, localStorage persisted (the office's own
 * direction: the office takes inquiries, not orders, and a family may want to
 * ask about several things at once).
 *
 * A line is described by its OWN data (`lib/quote-basket/quote-line.ts`): an open
 * `kind`, a `descriptor` (the badge, unit, detail shape and actions) and an
 * explicit `pricing` mode. The page renders the descriptor — never a switch on
 * the kind — so a new item joins `/quote` with no page change.
 *
 * PRICING IS NEVER INFERRED HERE. A line's `pricing` is decided by the surface
 * that added it and is persisted with the line. The catalogue refresh below
 * updates a line's display NAME only; it must never re-price an `on_request`
 * line from the catalogue (the bug where Retrieval and chapel use acquired the
 * sheet's ₱2,500/₱1,500 after a reload). A quote-only line keeps
 * `{ mode: "on_request" }` for its whole life.
 *
 * CHURCH/STATE. The basket persists the family's own detail and a display
 * snapshot (no PII beyond the sender details they choose to give; no prices are
 * SENT to a server — the send posts the lines as one inquiry, never an order).
 *
 * CHAPEL BOOKINGS carry their reservation (`booking`): the chapel, the range and
 * the day count, so the basket still shows — and releases — the hold after a
 * reload. A booking line is keyed by `lineId` (its reservation id) rather than
 * SKU, so two stays of the same chapel class coexist.
 */

/** The contact details the quote is sent under (the family's own words). */
export type QuoteSender = {
  full_name: string;
  email: string;
  phone: string;
};

/** The quote basket's line identity (booking lines use their reservation id). */
export function quoteLineKey(line: Pick<QuoteLine, "sku" | "lineId">): string {
  return line.lineId ?? line.sku;
}

type QuoteBasketValue = {
  lines: QuoteLine[];
  ready: boolean;
  /** The contact details the family last gave (prefills the send step). */
  sender: QuoteSender | null;
  setSender: (sender: QuoteSender | null) => void;
  add: (line: Omit<QuoteLine, "quantity">, quantity?: number) => void;
  /** `key` is a `quoteLineKey(line)` — never assume it is the SKU. */
  setQuantity: (key: string, quantity: number) => void;
  /** `key` is a `quoteLineKey(line)` — never assume it is the SKU. */
  remove: (key: string) => void;
  clear: () => void;
};

const QuoteBasketContext = createContext<QuoteBasketValue | null>(null);
const STORAGE_KEY = "im_quote_v1";
const MAX_QTY = 99;

type FixtureItem = {
  sku: string;
  name: string;
  item_type: string;
  unit_price_cents: number;
  currency: string;
};

type CatalogMap = Map<string, FixtureItem>;

function buildCatalogMap(items: FixtureItem[]): CatalogMap {
  return new Map(items.map((i) => [i.sku, i]));
}

/** The bundled recorded catalogue — an instant, offline-safe hydration source. */
const RECORDED_CATALOG: CatalogMap = buildCatalogMap(
  (catalogFixture as { items: FixtureItem[] }).items ?? [],
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/** Read a persisted pricing mode, or derive the honest default for a legacy line. */
function toPricing(raw: Record<string, unknown>, kind: string, hasBooking: boolean): QuoteLinePricing {
  const pricing = raw.pricing;
  if (isRecord(pricing)) {
    if (pricing.mode === "on_request") return { mode: "on_request" };
    if (pricing.mode === "published") {
      const cents = Number(pricing.unitPriceCents);
      const currency = readString(pricing.currency) ?? "PHP";
      if (Number.isInteger(cents) && cents >= 0) {
        return { mode: "published", unitPriceCents: cents, currency };
      }
    }
  }
  // Legacy shape (before the pricing field existed): the old `unitPriceCents`.
  // A priced catalogue line is NOT a quote-basket line (D1-B — it lives in the
  // cart), so THIS basket records it as quoted by the office rather than
  // importing a figure the page must not show.
  void kind;
  void hasBooking;
  return { mode: "on_request" };
}

function toDescriptor(raw: Record<string, unknown>, kind: string): QuoteLineDescriptor {
  const descriptor = raw.descriptor;
  if (isRecord(descriptor)) {
    return quoteLineDescriptor(kind, {
      label: readString(descriptor.label),
      unit: readString(descriptor.unit),
      detailSchema:
        descriptor.detailSchema === "dates" || descriptor.detailSchema === "plot" || descriptor.detailSchema === "text"
          ? descriptor.detailSchema
          : undefined,
      actions: Array.isArray(descriptor.actions)
        ? (descriptor.actions.filter(
            (a): a is "remove" | "change" | "details" => a === "remove" || a === "change" || a === "details",
          ) as QuoteLineDescriptor["actions"])
        : undefined,
    });
  }
  return quoteLineDescriptor(kind);
}

/**
 * Read persisted lines field by field. A line whose display snapshot is
 * malformed is rehydrated from the recorded catalogue (name only) — never
 * re-priced. A line the recorded catalogue does not know and whose snapshot is
 * unusable is dropped.
 */
function sanitize(raw: unknown): QuoteLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: QuoteLine[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const sku = readString(entry.sku);
    if (!sku) continue;
    const qty = Number(entry.quantity);
    const quantity = Number.isInteger(qty) ? Math.min(Math.max(qty, 1), MAX_QTY) : 1;

    // Booking metadata is persisted alongside the identity; a line whose
    // booking no longer parses is dropped rather than shown without its stay.
    const rawBooking = entry.booking;
    const booking = rawBooking == null ? undefined : toChapelBookingLine(rawBooking);
    if (rawBooking != null && !booking) continue;
    const fixture = RECORDED_CATALOG.get(sku);

    const rawKind = readString(entry.kind) ?? readString(entry.itemType) ?? fixture?.item_type ?? "service";
    const kind = booking ? "chapel" : rawKind;

    const hasName = typeof entry.name === "string" && entry.name.trim() !== "";
    const name = hasName ? (entry.name as string) : fixture?.name;
    if (!name) continue;

    const descriptor = toDescriptor(entry, kind);
    const pricing = toPricing(entry, kind, Boolean(booking));
    const lineId =
      readString(entry.lineId) ?? (booking ? booking.bookingId : undefined);
    const detail = readString(entry.detail);
    const preferredDate = readString(entry.preferredDate);

    lines.push({
      sku,
      name,
      kind,
      descriptor,
      pricing,
      quantity,
      ...(lineId ? { lineId } : {}),
      ...(booking ? { booking } : {}),
      ...(detail ? { detail } : {}),
      ...(preferredDate ? { preferredDate } : {}),
    });
  }
  return lines;
}

function sanitizeSender(raw: unknown): QuoteSender | null {
  if (!isRecord(raw)) return null;
  const sender = {
    full_name: typeof raw.full_name === "string" ? raw.full_name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
  };
  return sender.full_name || sender.email || sender.phone ? sender : null;
}

/**
 * The mirror of the cart's rule (office, 2026-09-29; kept by D1-B, 2026-09-30): a
 * line with a PUBLISHED figure that is neither a lot nor a chapel booking
 * belongs in the CART, so the quote basket ignores it rather than holding the
 * same thing twice. Everything else accumulates — a chapel stay and a lot never
 * merge (two plots, two stays), every other line merges by SKU, quantity capped.
 *
 * The pure half of `add`, exported so the multi-kind accumulation is testable
 * without a browser.
 */
export function addQuoteLine(
  lines: ReadonlyArray<QuoteLine>,
  line: Omit<QuoteLine, "quantity">,
  quantity = 1,
): QuoteLine[] {
  const isLot = line.kind === "lot";
  const isChapel = Boolean(line.booking) || line.descriptor.detailSchema === "dates";
  if (line.pricing.mode === "published" && !isLot && !isChapel) {
    return [...lines];
  }
  const qty = Math.min(Math.max(quantity, 1), MAX_QTY);
  if (line.booking) {
    return [...lines, { ...line, lineId: line.lineId ?? line.booking.bookingId, quantity: qty }];
  }
  if (isLot) {
    return [...lines, { ...line, quantity: qty }];
  }
  const existing = lines.find((l) => !l.booking && l.sku === line.sku);
  if (existing) {
    return lines.map((l) =>
      !l.booking && l.sku === line.sku
        ? { ...l, quantity: Math.min(l.quantity + qty, MAX_QTY) }
        : l,
    );
  }
  return [...lines, { ...line, quantity: qty }];
}

export function QuoteBasketProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [sender, setSenderState] = useState<QuoteSender | null>(null);
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMap>(RECORDED_CATALOG);

  // Persisted lines hydrate immediately from the bundled recorded catalogue.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) {
        setLines(sanitize(parsed));
      } else if (isRecord(parsed)) {
        setLines(sanitize(parsed.lines));
        setSenderState(sanitizeSender(parsed.sender));
      } else {
        setLines([]);
      }
    } catch {
      setLines([]);
    }
    setReady(true);
  }, []);

  // Then the published catalogue arrives from the BFF, which reads the durable
  // store the staff admin writes. Failure keeps the recorded catalogue.
  useEffect(() => {
    let alive = true;
    fetch("/api/catalog/items")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: unknown) => {
        if (!alive || !isRecord(payload)) return;
        const items = payload.items;
        if (!Array.isArray(items)) return;
        setCatalog(buildCatalogMap(items as FixtureItem[]));
      })
      .catch(() => {
        // Offline or the store is unreadable — previews stay on the recorded catalogue.
      });
    return () => {
      alive = false;
    };
  }, []);

  // Refresh the display NAME for known SKUs when the catalogue changes. This is
  // the ONE field a catalogue refresh may touch: the line's pricing mode, kind,
  // descriptor, booking and detail all belong to the surface that added it, and
  // re-pricing an `on_request` line here was the recorded defect (D3-A).
  useEffect(() => {
    if (!ready) return;
    setLines((prev) =>
      prev.map((line) => {
        const item = catalog.get(line.sku);
        return item && item.name !== line.name ? { ...line, name: item.name } : line;
      }),
    );
  }, [catalog, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lines: lines.map((l) => ({
            sku: l.sku,
            quantity: l.quantity,
            // A display snapshot, so a line whose SKU is not in the bundled
            // recorded catalogue still shows after a reload; the published
            // catalogue refreshes the name on the next request.
            name: l.name,
            kind: l.kind,
            descriptor: l.descriptor,
            pricing: l.pricing,
            ...(l.lineId ? { lineId: l.lineId } : {}),
            ...(l.booking ? { booking: l.booking } : {}),
            ...(l.detail ? { detail: l.detail } : {}),
            ...(l.preferredDate ? { preferredDate: l.preferredDate } : {}),
          })),
          sender,
        }),
      );
    } catch {
      // storage unavailable (private mode) — the basket stays in-memory
    }
  }, [lines, sender, ready]);

  const add = useCallback((line: Omit<QuoteLine, "quantity">, quantity = 1) => {
    setLines((prev) => addQuoteLine(prev, line, quantity));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => quoteLineKey(l) !== key)
        : prev.map((l) =>
            quoteLineKey(l) === key ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => quoteLineKey(l) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const setSender = useCallback((next: QuoteSender | null) => setSenderState(next), []);

  const value = useMemo(
    () => ({ lines, ready, sender, setSender, add, setQuantity, remove, clear }),
    [lines, ready, sender, setSender, add, setQuantity, remove, clear],
  );

  return (
    <QuoteBasketContext.Provider value={value}>{children}</QuoteBasketContext.Provider>
  );
}

export function useQuoteBasket(): QuoteBasketValue {
  const ctx = useContext(QuoteBasketContext);
  if (!ctx) throw new Error("useQuoteBasket must be used within QuoteBasketProvider");
  return ctx;
}
