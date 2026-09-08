import type { Lot } from "@/lib/api-client/property";

export type LotTone = "success" | "warning" | "info" | "neutral" | "danger";

/**
 * Lot display labels/tone — plain module (no "use client") so BOTH server
 * components (pages) and client components can use them safely.
 */

export const LOT_TONE: Record<Lot["status"], "success" | "warning" | "info" | "neutral" | "danger"> = {
  available: "success",
  reserved: "warning",
  sold: "info",
  occupied: "neutral",
  on_hold: "danger",
  maintenance_hold: "danger",
  for_transfer: "warning",
};

export const STATUS_LABEL: Record<Lot["status"], string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  occupied: "Occupied",
  on_hold: "On hold",
  maintenance_hold: "Maintenance",
  for_transfer: "For transfer",
};

/** Never crashes on unexpected/legacy status values. */
export function lotStatusLabel(status: string | undefined | null): string {
  return STATUS_LABEL[status as Lot["status"]] ?? String(status ?? "unknown");
}
