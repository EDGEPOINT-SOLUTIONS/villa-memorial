import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Notifications — Staff Portal" };

/** No frozen notification scope exists yet (the notification service contract is
 * dev-authored) — the page exists for route parity; gated open to signed-in
 * sessions until the real scope freezes. */
export default function NotificationsPage() {
  return gatedSectionPage(
    "Notifications",
    "Operations",
    [],
    "In-app staff notifications await the notification rule/event contract freeze; the service scaffold exists but has no outward API yet.",
  );
}
