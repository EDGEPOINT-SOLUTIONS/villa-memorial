import { EmptyState } from "@/components/ui/empty-state";

/**
 * Honest "coming soon" state for family surfaces whose real data path does not
 * exist yet (the family-facing API is dev-authored; nothing is fake-wired).
 * The screen exists so the portal IA and design are reviewable; the label says
 * exactly what is missing.
 */
export function FamilyComingSoon({
  area,
  whatUnblocks,
}: {
  area: string;
  whatUnblocks: string;
}) {
  return (
    <EmptyState
      title={`${area} — coming soon`}
      hint={`This area is not wired yet: ${whatUnblocks}. The portal frame and design are in place so nothing is silently missing.`}
    />
  );
}
