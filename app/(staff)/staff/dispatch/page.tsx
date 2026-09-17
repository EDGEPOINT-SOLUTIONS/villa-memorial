import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Dispatch — Staff Portal" };

export default function dispatchPage() {
  return gatedSectionPage(
    "Dispatch",
    "Operations",
    ["scheduling:read"],
    "Vehicles are scheduling resources and bookings already live on the Schedule screen; the dispatch board UX arrives with scheduling delivery.",
  );
}
