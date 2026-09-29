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
import { toChapelBookingLine, type ChapelBookingLine } from "@/lib/chapel-booking";

/**
 * The QUOTE BASKET — client-side, localStorage persisted (the office's own
 * direction: the cart becomes a quote basket, because the office takes
 * inquiries, not orders, and a family may want to ask about several things at
 * once).
 *
 * A line can be a product, a service, a lot, or a chapel stay. SKU + quantity,
 * the line's own detail (the dates a family prefers, the lot's section) and a
 * display snapshot are persisted (no PII beyond the sender details the family
 * chooses to give; no prices are SENT to a server — the send posts the lines as
 * one inquiry, never an order). Display fields are rehydrated from the
 * catalogue store so previews stay fresh: the bundled recorded seed hydrates
 * instantly, then the live published catalogue is read from
 * GET /api/catalog/items (the SAME durable store the staff catalogue admin
 * writes). A line the office no longer sells keeps its snapshot and says so.
 *
 * Chapel booking lines additionally persist their reservation (`booking`): the
 * chapel, the range and the day count, so the basket can still show — and
 * release — the hold after a reload. A booking line is keyed by `lineId` (its
 * reservation id) rather than SKU, so two stays of the same chapel class can
 * coexist; every other line keeps the plain SKU identity.
 */
export type QuoteLineKind = "package" | "service" | "add_on" | "lot";

export type QuoteLine = {
  sku: string;
  name: string;
  itemType: QuoteLineKind;
  unitPriceCents: number;
  currency: string;
  quantity: number;
  /** Stable identity for lines that may repeat a SKU (chapel bookings). */
  lineId?: string;
  /** The chapel reservation this line holds, when it is a chapel stay. */
  booking?: ChapelBookingLine;
  /** What this line is about — the family's own detail (service notes, plot). */
  detail?: string;
  /** The date the family prefers, when the line carries one. */
  preferredDate?: string;
};

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
/** The pre-rename key — read once so an existing basket survives the rename. */
const LEGACY_STORAGE_KEY = "im_cart_v1";
const MAX_QTY = 99;

type FixtureItem = {
  sku: string;
  name: string;
  item_type: QuoteLine["itemType"];
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

const KINDS: ReadonlySet<string> = new Set(["package", "service", "add_on", "lot"]);

function sanitize(raw: unknown, catalog: CatalogMap): QuoteLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: QuoteLine[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.sku !== "string") continue;
    const sku = e.sku;
    const qty = Number(e.quantity);
    const quantity = Number.isInteger(qty) ? Math.min(Math.max(qty, 1), MAX_QTY) : 1;

    const hasDisplayFields =
      typeof e.name === "string" &&
      Number.isInteger(e.unitPriceCents) &&
      (e.unitPriceCents as number) >= 0 &&
      typeof e.currency === "string";

    // Booking metadata is persisted alongside the identity; a line whose
    // booking no longer parses is dropped rather than shown without its stay.
    const rawBooking = e.booking;
    const booking = rawBooking == null ? undefined : toChapelBookingLine(rawBooking);
    if (rawBooking != null && !booking) continue;
    const lineId =
      typeof e.lineId === "string" && e.lineId.trim()
        ? e.lineId
        : booking
          ? booking.bookingId
          : undefined;
    const detail = typeof e.detail === "string" && e.detail.trim() ? e.detail : undefined;
    const preferredDate =
      typeof e.preferredDate === "string" && e.preferredDate.trim() ? e.preferredDate : undefined;

    if (hasDisplayFields) {
      const rawKind = typeof e.itemType === "string" ? e.itemType : "service";
      lines.push({
        sku,
        name: e.name as string,
        itemType: (KINDS.has(rawKind) ? rawKind : "service") as QuoteLineKind,
        unitPriceCents: e.unitPriceCents as number,
        currency: e.currency as string,
        quantity,
        ...(lineId ? { lineId } : {}),
        ...(booking ? { booking } : {}),
        ...(detail ? { detail } : {}),
        ...(preferredDate ? { preferredDate } : {}),
      });
      continue;
    }

    const fixture = catalog.get(sku);
    if (!fixture) continue;
    lines.push({
      sku,
      name: fixture.name,
      itemType: fixture.item_type,
      unitPriceCents: fixture.unit_price_cents,
      currency: fixture.currency,
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
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const sender = {
    full_name: typeof r.full_name === "string" ? r.full_name : "",
    email: typeof r.email === "string" ? r.email : "",
    phone: typeof r.phone === "string" ? r.phone : "",
  };
  return sender.full_name || sender.email || sender.phone ? sender : null;
}

/**
 * Append one line to the basket — the pure half of `add`, exported so the
 * multi-kind accumulation (product + service + lot + chapel stay) is testable
 * without a browser. The rules:
 *  · a CHAPEL line is a unique reservation and never merges (two stays of the
 *    same class are two lines, each releasing its own hold);
 *  · a LOT line is one plot and never merges by SKU;
 *  · every other line merges by SKU, quantity capped.
 */
export function addQuoteLine(
  lines: ReadonlyArray<QuoteLine>,
  line: Omit<QuoteLine, "quantity">,
  quantity = 1,
): QuoteLine[] {
  // THE MIRROR OF THE CART'S RULE (office, 2026-09-29): a line with a published
  // figure that is neither a lot nor a chapel booking belongs in the CART, so
  // the quote basket ignores it rather than holding the same thing twice.
  if (!line.booking && line.itemType !== "lot" && line.unitPriceCents > 0) {
    return [...lines];
  }
  const qty = Math.min(Math.max(quantity, 1), MAX_QTY);
  if (line.booking) {
    return [...lines, { ...line, lineId: line.lineId ?? line.booking.bookingId, quantity: qty }];
  }
  if (line.itemType === "lot") {
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
  // The pre-rename `im_cart_v1` store is read too, so a basket a visitor
  // already had is not lost by the rename.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) {
        setLines(sanitize(parsed, RECORDED_CATALOG));
      } else if (parsed && typeof parsed === "object") {
        const store = parsed as Record<string, unknown>;
        setLines(sanitize(store.lines, RECORDED_CATALOG));
        setSenderState(sanitizeSender(store.sender));
      } else {
        setLines([]);
      }
      if (window.localStorage.getItem(LEGACY_STORAGE_KEY) && !window.localStorage.getItem(STORAGE_KEY)) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
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
        if (!alive || typeof payload !== "object" || payload === null) return;
        const items = (payload as { items?: unknown }).items;
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

  // Refresh display fields for known SKUs when the catalogue changes. Lines are
  // never dropped here: a customer's line survives until they remove it.
  useEffect(() => {
    if (!ready) return;
    setLines((prev) =>
      prev.map((line) => {
        const item = catalog.get(line.sku);
        return item
          ? {
              ...line,
              name: item.name,
              itemType: item.item_type,
              unitPriceCents: item.unit_price_cents,
              currency: item.currency,
            }
          : line;
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
            // A display snapshot, so a line whose SKU is not in the bundled recorded
            // catalogue (an item the office just created) still shows after a reload;
            // the published catalogue refreshes these on the next request.
            name: l.name,
            itemType: l.itemType,
            unitPriceCents: l.unitPriceCents,
            currency: l.currency,
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
