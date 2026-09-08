/**
 * Prefab park plot TYPES — server/client-safe single source for the seeded
 * Legend entries and for public surfaces (/lots, cards) that must render the
 * legend type names/colours without access to the browser store.
 *
 * Staff may rename/add legend entries demo-locally (browser); public pages
 * show these seeded names until real legend persistence arrives with the dev
 * geometry/media contract.
 */
import { LOT_TYPE_PHOTOS } from "@/lib/media";

export type ParkTypePrefab = {
  id: string;
  name: string;
  color: string;
  /** Optional built-in photo (also the photo shown on /lots cards). */
  image?: string;
};

export const PARK_TYPES: ParkTypePrefab[] = [
  { id: "lt-premium", name: "PREMIUM LOTS", color: "#a16207", image: LOT_TYPE_PHOTOS["lt-premium"] },
  { id: "lt-primary", name: "PRIMARY LOTS", color: "#1f6f8b", image: LOT_TYPE_PHOTOS["lt-primary"] },
  { id: "lt-garden", name: "GARDEN LOTS", color: "#5f8a3c", image: LOT_TYPE_PHOTOS["lt-niches"] },
  { id: "lt-niches", name: "GARDEN NICHES", color: "#4b7f52", image: LOT_TYPE_PHOTOS["lt-niches"] },
  { id: "lt-mausoleum", name: "MAUSOLEUM", color: "#6d5b8e", image: LOT_TYPE_PHOTOS["lt-mausoleum"] },
  { id: "lt-road", name: "MAIN ROAD", color: "#5b5f66" },
  { id: "lt-walk", name: "WALKING PATH", color: "#a89f8a" },
  { id: "lt-park", name: "PARK / LANDSCAPE", color: "#3d8b6d" },
  { id: "lt-standard", name: "STANDARD LOT", color: "#7c7a8c" },
];

/** Legend type by id (falls back to STANDARD LOT). */
export function parkType(id?: string): ParkTypePrefab {
  return PARK_TYPES.find((t) => t.id === id) ?? PARK_TYPES[PARK_TYPES.length - 1];
}
