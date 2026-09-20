import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * StatusChip — the ONE status word + colour for a row, a card or a header.
 *
 * The tone vocabulary is closed to the six roles the design system defines
 * (`Badge`), so a status can only be neutral · success · warning · danger ·
 * info · accent. The mapping from a domain state (out of stock, in flight,
 * unreadable) to a tone stays in the module that owns the state
 * (`INVENTORY_STATE_TONE`, `TRIP_STATUS_TONE`, …) — this component only makes
 * the rendering identical everywhere.
 *
 * A chip whose state has no recorded source prints the honest word ("Not
 * recorded") rather than borrowing a colour that implies a value; that wording
 * is the caller's, the colour is this vocabulary's.
 */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function StatusChip({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}
