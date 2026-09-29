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
 * Client-side cart (localStorage persisted). SKU + quantity + a display snapshot
 * are persisted (no PII; and no prices are ever SENT to a server — checkout sends
 * only sku+quantity). Display fields are rehydrated from the catalogue store so
 * previews stay fresh: the bundled recorded seed hydrates instantly, then the
 * live published catalogue is read from GET /api/catalog/items (the SAME durable
 * store the staff catalogue admin writes), so an item an admin created — or a
 * price an admin changed — shows correctly after a reload. The authoritative
 * price always comes from the checkout response.
 *
 * Chapel booking lines additionally persist their reservation (`booking`): the
 * chapel, the range and the day count, so the cart can still show — and
 * release — the hold after a reload. A booking line is keyed by `lineId` (its
 * reservation id) rather than SKU, so two stays of the same chapel class can
 * coexist; every other line keeps the plain SKU identity.
 */
export type CartLine = {
  sku: string;
  name: string;
  itemType: "package" | "service" | "add_on" | "lot";
  unitPriceCents: number;
  currency: string;
  quantity: number;
  /** Stable identity for lines that may repeat a SKU (chapel bookings). */
  lineId?: string;
  /** The chapel reservation this line holds, when it is a chapel stay. */
  booking?: ChapelBookingLine;
};

/** The cart's line identity (booking lines use their reservation id). */
export function cartLineKey(line: Pick<CartLine, "sku" | "lineId">): string {
  return line.lineId ?? line.sku;
}

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  /** `key` is a `cartLineKey(line)` — never assume it is the SKU. */
  setQuantity: (key: string, quantity: number) => void;
  /** `key` is a `cartLineKey(line)` — never assume it is the SKU. */
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "im_cart_v1";
const MAX_QTY = 99;

// Persisted shape is sku+qty (+ the booking metadata for chapel holds);
// rehydrate display fields from fixture.
// Backward-compat: old stores contained full CartLine, so sanitize handles both.
type FixtureItem = {
  sku: string;
  name: string;
  item_type: CartLine["itemType"];
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

function sanitize(raw: unknown, catalog: CatalogMap): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.sku !== "string") continue;
    const sku = e.sku;
    const qty = Number(e.quantity);
    const quantity = Number.isInteger(qty) ? Math.min(Math.max(qty, 1), MAX_QTY) : 1;

    // New minimal form (sku+qty only) — hydrate from fixture
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

    if (hasDisplayFields) {
      lines.push({
        sku,
        name: e.name as string,
        itemType: (e.itemType as CartLine["itemType"]) ?? "service",
        unitPriceCents: e.unitPriceCents as number,
        currency: e.currency as string,
        quantity,
        ...(lineId ? { lineId } : {}),
        ...(booking ? { booking } : {}),
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
    });
  }
  return lines;
}

/**
 * Append one line to the CART — the priced basket (office, 2026-09-29: priced
 * items go to the cart, quote-only items to the quote basket; neither lands in
 * the other).
 *
 * THE RULE, enforced here rather than trusted to the callers: the cart accepts
 * only lines with a PUBLISHED figure (`unitPriceCents > 0`) that are not a lot
 * and not a chapel booking. A quote-only line (a lot, a chapel stay, a service
 * the office quotes by hand) is ignored — it belongs to the quote basket
 * (`lib/quote-basket/quote-basket-context.tsx`, which mirrors the guard).
 * Exported pure so the rule is unit-testable without a browser.
 */
export function addCartLine(
  lines: ReadonlyArray<CartLine>,
  line: Omit<CartLine, "quantity">,
  quantity = 1,
): CartLine[] {
  if (line.booking || line.itemType === "lot" || line.unitPriceCents <= 0) {
    return [...lines];
  }
  const qty = Math.min(Math.max(quantity, 1), MAX_QTY);
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<CatalogMap>(RECORDED_CATALOG);

  // Persisted lines hydrate immediately from the bundled recorded catalogue.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setLines(sanitize(raw ? JSON.parse(raw) : [], RECORDED_CATALOG));
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
      const persisted = lines.map((l) => ({
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
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // storage unavailable (private mode) — cart stays in-memory
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => addCartLine(prev, line, quantity));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => cartLineKey(l) !== key)
        : prev.map((l) =>
            cartLineKey(l) === key ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => cartLineKey(l) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, ready, add, setQuantity, remove, clear }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
