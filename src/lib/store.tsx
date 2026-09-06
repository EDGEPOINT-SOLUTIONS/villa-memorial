// ============================================================================
// store.tsx — the in-browser "admin's shelf". Holds the canonical catalogue
// (from catalog.ts) as editable state plus the editable site copy, so the admin
// Store screen and every public/consumer surface read ONE source. Generic on
// purpose (ⓡ): it only knows "records", "price", "active", "copy". Domain shape
// (what a Plan/Lot/Product IS) lives in catalog.ts seeds and the pages.
// Frontend-only — nothing persists; a refresh restores the seeded defaults.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_CATALOG,
  SITE_COPY_DEFAULTS,
  type CatalogRecord,
  type ItemKind,
  type SiteCopy,
  type SiteCopyKey,
} from "./catalog";

type StoreState = {
  /** All catalogue records (active and inactive). */
  records: CatalogRecord[];
  /** Editable public-site copy. */
  copy: SiteCopy;
  /** Look up one record. */
  get: (sku: string) => CatalogRecord | undefined;
  /** Records of one kind (plans, lots, products, ...). */
  byKind: (kind: ItemKind, opts?: { activeOnly?: boolean }) => CatalogRecord[];
  /** Patch a record's editable fields. */
  update: (sku: string, patch: Partial<Pick<CatalogRecord, "name" | "blurb" | "detail" | "price" | "image" | "imageSeed" | "features" | "category" | "chip" | "active">>) => void;
  /** Append a new record (admin "New" screens). */
  add: (record: CatalogRecord) => void;
  /** Set a record's on-sale flag. */
  setActive: (sku: string, active: boolean) => void;
  /** Edit a site-copy string. */
  setCopy: (key: SiteCopyKey, value: string) => void;
  /** Restore seeded defaults (demo "reset"). */
  reset: () => void;
};

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<CatalogRecord[]>(ALL_CATALOG);
  const [copy, setCopyState] = useState<SiteCopy>(SITE_COPY_DEFAULTS);

  const get = useCallback(
    (sku: string) => records.find((r) => r.sku === sku),
    [records],
  );

  const byKind = useCallback(
    (kind: ItemKind, opts?: { activeOnly?: boolean }) =>
      records.filter(
        (r) => r.kind === kind && (opts?.activeOnly ? r.active : true),
      ),
    [records],
  );

  const update = useCallback<StoreState["update"]>((sku, patch) => {
    setRecords((prev) => prev.map((r) => (r.sku === sku ? { ...r, ...patch } : r)));
  }, []);

  const add = useCallback<StoreState["add"]>((record) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.sku === record.sku);
      return exists ? prev : [...prev, record];
    });
  }, []);

  const setActive = useCallback((sku: string, active: boolean) => {
    setRecords((prev) => prev.map((r) => (r.sku === sku ? { ...r, active } : r)));
  }, []);

  const setCopy = useCallback((key: SiteCopyKey, value: string) => {
    setCopyState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setRecords(ALL_CATALOG);
    setCopyState(SITE_COPY_DEFAULTS);
  }, []);

  const value = useMemo<StoreState>(
    () => ({ records, copy, get, byKind, update, add, setActive, setCopy, reset }),
    [records, copy, get, byKind, update, add, setActive, setCopy, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
