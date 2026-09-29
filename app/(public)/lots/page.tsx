import { permanentRedirect } from "next/navigation";

/**
 * The old standalone lots listing lived here. The lots are now a view of the
 * park page (captain, 2026-09-30: "the lots page are now inside the map page,
 * please remove that old lots page"), so this route only forwards — old links
 * and bookmarks still land on the live Lots view at /map?tab=lots.
 */
export default function LotsPage(): never {
  permanentRedirect("/map?tab=lots");
}
