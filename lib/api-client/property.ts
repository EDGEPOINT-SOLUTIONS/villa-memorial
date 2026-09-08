/**
 * Typed data access for Module D property screens (lots, status, reservation).
 *
 * Contract: docs/08-delivery/contracts/lot-events-v1.md (KEB-D3-01, FROZEN).
 * The `Lot` type below IS the frozen response shape — property-gis ratified it rather
 * than forcing a rewrite here. Keep them byte-identical.
 *
 * Live mode: PROPERTY_BASE_URL set → requests hit `${PROPERTY_BASE_URL}/property/api/v1/...`
 * through the edge gateway, authenticated with the staff session cookie. Unset → recorded
 * fixtures, so the app still demos standalone. Screens call these functions identically
 * in both modes.
 */
import lotsFile from "@/lib/fixtures/property/lots.json";
import { ApiError } from "@/lib/api-client/api-error";
import { getAuthedJson, itemsOf, postAuthedJson } from "@/lib/api-client/staff-fetch";

const BASE_URL = process.env.PROPERTY_BASE_URL ?? "";

export function propertyLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type LotStatus =
  | "available"
  | "reserved"
  | "sold"
  | "occupied"
  | "for_transfer"
  | "on_hold"
  | "maintenance_hold";

export type LotType = "individual" | "family" | "estate";

export type Lot = {
  id: string;
  lot_number: string;
  section: string;
  block: string;
  type: LotType;
  status: LotStatus;
  area_sqm: number;
  price_cents: number;
  currency: string;
  owner_name: string | null;
  reserved_at: string | null;
  sold_at: string | null;
};

type LotStore = {
  tenant_id: string;
  lots: Lot[];
};

/** Tolerant reader: extra upstream fields are ignored, missing ones surface as a 502. */
function toLot(raw: unknown): Lot {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed lot", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.lot_number !== "string") {
    throw new ApiError("malformed lot", 502);
  }
  return {
    id: r.id,
    lot_number: r.lot_number,
    section: String(r.section ?? ""),
    block: String(r.block ?? ""),
    type: r.type as LotType,
    status: r.status as LotStatus,
    area_sqm: Number(r.area_sqm ?? 0),
    price_cents: Number(r.price_cents ?? 0),
    currency: String(r.currency ?? "PHP"),
    owner_name: typeof r.owner_name === "string" ? r.owner_name : null,
    reserved_at: typeof r.reserved_at === "string" ? r.reserved_at : null,
    sold_at: typeof r.sold_at === "string" ? r.sold_at : null,
  };
}

export async function listLots(): Promise<Lot[]> {
  if (propertyLiveModeEnabled()) {
    const payload = await getAuthedJson(BASE_URL, "/property/api/v1/lots");
    return itemsOf(payload).map(toLot);
  }
  const store = lotsFile as unknown as LotStore;
  return store.lots.map((l) => withFixtureOverlay(l));
}

export async function getLot(id: string): Promise<Lot> {
  if (propertyLiveModeEnabled()) {
    return toLot(await getAuthedJson(BASE_URL, `/property/api/v1/lots/${encodeURIComponent(id)}`));
  }
  const store = lotsFile as unknown as LotStore;
  const lot = store.lots.find((l) => l.id === id);
  if (!lot) {
    throw new ApiError("not_found", 404);
  }
  return withFixtureOverlay(lot);
}

/**
 * Reserve an available lot for a named party (scenario F, first UI hop).
 *
 * The service is the authority on the transition: `available → reserved` only, enforced
 * in property-gis with the state change and its `lot.reserved` outbox row in ONE
 * transaction. A double-reserve comes back 422 with a message this function passes
 * through untouched, so the screen never has to guess the rule.
 */
export async function reserveLot(id: string, ownerName: string): Promise<Lot> {
  const owner = ownerName.trim();
  if (!owner) {
    throw new ApiError("owner name is required", 422);
  }

  if (propertyLiveModeEnabled()) {
    return toLot(
      await postAuthedJson(
        BASE_URL,
        `/property/api/v1/lots/${encodeURIComponent(id)}/reserve`,
        { owner_name: owner },
      ),
    );
  }
  return fixtureReserveLot(id, owner);
}

/* ----------------------------- fixture mode ----------------------------- */

// Next.js compiles route handlers into separate bundles, so demo mutations have to live
// on globalThis to be visible from both the BFF route and the screen that re-renders
// after it (same reasoning as commerce's fixture order store).
type FixtureGlobal = typeof globalThis & { __imFixtureLots?: Map<string, Lot> };
const fixtureGlobal = globalThis as FixtureGlobal;
const reservedLots = (fixtureGlobal.__imFixtureLots ??= new Map<string, Lot>());

/** Applies any fixture-mode mutation recorded for this lot. */
function withFixtureOverlay(lot: Lot): Lot {
  return { ...(reservedLots.get(lot.id) ?? lot) };
}

function fixtureReserveLot(id: string, ownerName: string): Lot {
  const store = lotsFile as unknown as LotStore;
  const base = store.lots.find((l) => l.id === id);
  if (!base) {
    throw new ApiError("not_found", 404);
  }
  const current = reservedLots.get(id) ?? base;
  // Mirror the server rule rather than inventing a friendlier one: same status, same code.
  if (current.status !== "available") {
    throw new ApiError(`lot is ${current.status}, only available lots can be reserved`, 422);
  }
  const reserved: Lot = {
    ...current,
    status: "reserved",
    owner_name: ownerName,
    reserved_at: new Date().toISOString(),
  };
  reservedLots.set(id, reserved);
  return { ...reserved };
}
