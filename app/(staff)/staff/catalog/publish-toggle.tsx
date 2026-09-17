"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminCatalogItem } from "@/lib/api-client/commerce";

/**
 * One-click storefront switch for a catalogue row. Deactivating never deletes:
 * the item keeps its record and history, but leaves every public reader (and
 * checkout refuses it) until it is put back.
 *
 * The write goes through PATCH /api/catalog/items/:id (scope `catalog:write`)
 * with the record's full draft — the store re-validates every field, so this is
 * the same rule the edit form runs, not a second one.
 */
export function CatalogPublishToggle({ record }: { record: AdminCatalogItem }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/items/${record.item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: record.item.sku,
          name: record.item.name,
          description: record.item.description,
          item_type: record.item.item_type,
          unit_price_cents: record.item.unit_price_cents,
          currency: record.item.currency,
          image: record.item.image,
          published: !record.published,
        }),
      });
      if (!res.ok) {
        const payload: unknown = await res.json().catch(() => null);
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The change did not stick.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the catalog store.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant={record.published ? "ghost" : "secondary"}
        size="sm"
        disabled={pending}
        onClick={toggle}
      >
        {record.published ? "Take off storefront" : "Put back on storefront"}
      </Button>
      {error ? (
        <span className="text-sm text-muted" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
