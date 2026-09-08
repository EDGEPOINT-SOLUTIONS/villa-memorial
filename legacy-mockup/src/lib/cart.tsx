// ============================================================================
// cart.tsx — shared client-side shopping state for the public demo.
// Generic on purpose (ⓡ): "line", "unit", "reference". Domain meaning (memorial
// plan vs lot vs package vs product) lives in the page that adds the line, not
// here. Frontend-only, no backend. A line with unit === null is "price on
// arrangement" (quote) — excluded from the computed subtotal.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  /** Unique within the cart (sku or code). */
  id: string;
  name: string;
  /** Domain bucket as a label only (e.g. "Memorial plan", "Lot") — used for grouping copy. */
  kindLabel?: string;
  detail?: string;
  image?: string;
  /** Amount in ₱. null = price on arrangement (excluded from subtotal). */
  unit: number | null;
  qty: number;
};

export type PlacedOrder = {
  reference: string;
  name: string;
  lineCount: number;
  total: number; // 0 when all lines were quote-only
  status: string;
  date: string;
  /** Snapshot of the cart at placement, for the confirmation/receipt page. */
  lines: {
    id: string;
    name: string;
    kindLabel?: string;
    detail?: string;
    image?: string;
    unit: number | null;
    qty: number;
  }[];
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number; // sum of priced lines only
  hasQuoteLines: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  placed: PlacedOrder[];
  place: (order: PlacedOrder) => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [placed, setPlaced] = useState<PlacedOrder[]>([]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === line.id);
      if (!existing) {
        return [...prev, { ...line, qty }];
      }
      return prev.map((l) => (l.id === line.id ? { ...l, qty: l.qty + qty } : l));
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const place = useCallback((order: PlacedOrder) => {
    setPlaced((prev) => [order, ...prev]);
  }, []);

  const { count, subtotal, hasQuoteLines } = useMemo(() => {
    let c = 0;
    let s = 0;
    let q = false;
    for (const l of lines) {
      c += l.qty;
      if (l.unit === null) {
        q = true;
      } else {
        s += l.unit * l.qty;
      }
    }
    return { count: c, subtotal: s, hasQuoteLines: q };
  }, [lines]);

  const value = useMemo<CartState>(
    () => ({
      lines,
      count,
      subtotal,
      hasQuoteLines,
      add,
      setQty,
      remove,
      clear,
      placed,
      place,
    }),
    [lines, count, subtotal, hasQuoteLines, add, setQty, remove, clear, placed, place],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/** Demo reference generator (ORD-xxxx), monotonic across the session. */
export function nextReference(existing: string[]): string {
  const max = existing.reduce((m, r) => {
    const n = Number(r.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 5000);
  return `ORD-${max + 1}`;
}
