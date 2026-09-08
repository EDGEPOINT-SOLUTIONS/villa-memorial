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

/**
 * Client-side cart (localStorage persisted). Only SKU + quantity are persisted
 * (no prices sent to servers, no PII); display fields (name/price) are
 * rehydrated from the seeded catalog fixture so previews stay fresh.
 * The authoritative price always comes from the checkout response.
 */
export type CartLine = {
  sku: string;
  name: string;
  itemType: "package" | "service" | "add_on";
  unitPriceCents: number;
  currency: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "im_cart_v1";
const MAX_QTY = 99;

// Persisted shape is sku+qty only; rehydrate display fields from fixture.
// Backward-compat: old stores contained full CartLine, so sanitize handles both.
type FixtureItem = {
  sku: string;
  name: string;
  item_type: CartLine["itemType"];
  unit_price_cents: number;
  currency: string;
};

const CATALOG_BY_SKU = new Map<string, FixtureItem>(
  ((catalogFixture as { items: FixtureItem[] }).items ?? []).map((i) => [i.sku, i]),
);

function sanitize(raw: unknown): CartLine[] {
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

    if (hasDisplayFields) {
      lines.push({
        sku,
        name: e.name as string,
        itemType: (e.itemType as CartLine["itemType"]) ?? "service",
        unitPriceCents: e.unitPriceCents as number,
        currency: e.currency as string,
        quantity,
      });
      continue;
    }

    const fixture = CATALOG_BY_SKU.get(sku);
    if (!fixture) continue;
    lines.push({
      sku,
      name: fixture.name,
      itemType: fixture.item_type,
      unitPriceCents: fixture.unit_price_cents,
      currency: fixture.currency,
      quantity,
    });
  }
  return lines;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setLines(sanitize(raw ? JSON.parse(raw) : []));
    } catch {
      setLines([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      const persisted = lines.map((l) => ({ sku: l.sku, quantity: l.quantity }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // storage unavailable (private mode) — cart stays in-memory
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.sku === line.sku);
      if (existing) {
        return prev.map((l) =>
          l.sku === line.sku
            ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) }
            : l,
        );
      }
      return [...prev, { ...line, quantity: Math.min(Math.max(quantity, 1), MAX_QTY) }];
    });
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) =>
            l.sku === sku ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l,
          ),
    );
  }, []);

  const remove = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => l.sku !== sku));
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
