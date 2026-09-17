"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker } from "@/components/landing/editor-pickers";
import type { AdminCatalogItem, CatalogDraftErrors } from "@/lib/api-client/commerce";
import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_TYPE_LABEL,
  CATALOG_NAME_MAX_LENGTH,
  CATALOG_SKU_MAX_LENGTH,
  catalogDisplayPrice,
  parseMajorToMinorUnits,
  validateCatalogDraft,
  type CatalogItemType,
} from "@/lib/catalog-admin";

/**
 * Create/edit form for one catalogue item — the fields the storefront actually
 * consumes: sku · name · description · item_type · unit_price_cents · currency ·
 * photo · published state.
 *
 * Validation is ONE rule shared with the BFF route and the durable store
 * (lib/catalog-admin.ts): the price control takes pesos and converts to integer
 * minor units, so a float never crosses the API; the server re-validates and
 * returns per-field messages that this form renders under the same controls.
 * Every write needs `catalog:write` — the page gated the session before this
 * form rendered, and the route re-checks.
 */
type FormState = {
  sku: string;
  name: string;
  description: string;
  item_type: CatalogItemType;
  price: string;
  currency: string;
  image: string;
  published: boolean;
};

function formOf(record?: AdminCatalogItem): FormState {
  if (!record) {
    return {
      sku: "",
      name: "",
      description: "",
      item_type: "service",
      price: "",
      currency: "PHP",
      image: "",
      published: true,
    };
  }
  return {
    sku: record.item.sku,
    name: record.item.name,
    description: record.item.description ?? "",
    item_type: record.item.item_type,
    // The control edits pesos; the record's integer centavos are the truth.
    price: (record.item.unit_price_cents / 100).toFixed(2),
    currency: record.item.currency,
    image: record.item.image ?? "",
    published: record.published,
  };
}

export function CatalogItemForm({ record }: { record?: AdminCatalogItem }) {
  const editing = Boolean(record);
  const router = useRouter();
  const skuId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const typeId = useId();
  const priceId = useId();
  const currencyId = useId();
  const imageId = useId();
  const publishedId = useId();

  const [form, setForm] = useState<FormState>(() => formOf(record));
  const [errors, setErrors] = useState<CatalogDraftErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    const errorKey = (field === "price" ? "unit_price_cents" : field) as keyof CatalogDraftErrors;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  }

  const priceCents = parseMajorToMinorUnits(form.price);
  const currency = form.currency.trim().toUpperCase() || "PHP";
  const priceHint =
    priceCents === null
      ? "Enter the amount in pesos, e.g. 6000 or 6000.50. The catalog stores integer centavos (minor units)."
      : `${priceCents.toLocaleString("en-US")} centavos — shows as ${catalogDisplayPrice(
          priceCents,
          currency,
          record?.price_unit ?? "",
        )} on the storefront.`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSummary(null);

    const cents = parseMajorToMinorUnits(form.price);
    const candidate = {
      sku: form.sku,
      name: form.name,
      description: form.description,
      item_type: form.item_type,
      unit_price_cents: cents,
      currency: form.currency,
      image: form.image,
      published: form.published,
    };
    const check = validateCatalogDraft(candidate);
    if (!check.ok) {
      setErrors(check.errors);
      setSummary("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const res = await fetch(
        editing ? `/api/catalog/items/${record!.item.id}` : "/api/catalog/items",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(check.draft),
        },
      );
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const fieldErrors =
          typeof payload === "object" &&
          payload !== null &&
          "fieldErrors" in payload &&
          typeof (payload as { fieldErrors: unknown }).fieldErrors === "object"
            ? ((payload as { fieldErrors: CatalogDraftErrors }).fieldErrors)
            : undefined;
        if (fieldErrors) setErrors(fieldErrors);
        setSummary(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "The item could not be saved.",
        );
        return;
      }
      const saved = (payload as { item: AdminCatalogItem }).item;
      router.push(
        `/staff/catalog?${editing ? "updated" : "created"}=${encodeURIComponent(saved.item.sku)}`,
      );
    } catch {
      setSummary("Could not reach the catalog store. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  const attachedDataUrl = form.image.startsWith("data:");

  return (
    <form className="card" onSubmit={submit} noValidate>
      <div className="card__header">
        <h3>{editing ? `Edit ${record!.item.sku}` : "New catalog item"}</h3>
        <p className="text-sm text-muted">
          {editing
            ? "Changes reach the storefront, cart and checkout on their next request."
            : "The item appears on the public catalogs as soon as it is published."}
        </p>
      </div>
      <div className="card__body stack-4">
        {summary ? (
          <Alert tone="danger" title="The item was not saved">
            {summary}
          </Alert>
        ) : null}

        <div className="field-grid field-grid--2">
          <Field
            label="SKU"
            htmlFor={skuId}
            hint={`The item's identity the cart and orders carry (max ${CATALOG_SKU_MAX_LENGTH} characters, unique).`}
            error={errors.sku}
          >
            <input
              id={skuId}
              type="text"
              disabled={pending}
              value={form.sku}
              onChange={(e) => update("sku", e.target.value)}
              placeholder="SRV-NEW-ITEM"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Name"
            htmlFor={nameId}
            hint={`What the storefront shows (max ${CATALOG_NAME_MAX_LENGTH} characters).`}
            error={errors.name}
          >
            <input
              id={nameId}
              type="text"
              disabled={pending}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Cremation service"
            />
          </Field>
        </div>

        <Field
          label="Description (optional)"
          htmlFor={descriptionId}
          hint={`The card's one-line explanation (max ${CATALOG_DESCRIPTION_MAX_LENGTH} characters). Leave empty when no description is published.`}
          error={errors.description}
        >
          <textarea
            id={descriptionId}
            rows={3}
            disabled={pending}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        <div className="field-grid field-grid--3">
          <Field
            label="Type"
            htmlFor={typeId}
            hint="How the public catalogs group it."
            error={errors.item_type}
          >
            <select
              id={typeId}
              disabled={pending}
              value={form.item_type}
              onChange={(e) => update("item_type", e.target.value as CatalogItemType)}
            >
              {CATALOG_ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CATALOG_ITEM_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit price (₱)" htmlFor={priceId} hint={priceHint} error={errors.unit_price_cents}>
            <input
              id={priceId}
              type="text"
              inputMode="decimal"
              disabled={pending}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="6000.00"
            />
          </Field>
          <Field
            label="Currency"
            htmlFor={currencyId}
            hint="Three-letter code — PHP for the peso price list."
            error={errors.currency}
          >
            <input
              id={currencyId}
              type="text"
              maxLength={3}
              disabled={pending}
              value={form.currency}
              onChange={(e) => update("currency", e.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <Field
          label="Photo (optional)"
          htmlFor={imageId}
          hint="From the park's media library, a device upload or a public URL. Leave empty to publish no photo."
          error={errors.image}
        >
          <div className="cat-image">
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- library/uploaded photo
              <img className="cat-image__thumb" src={form.image} alt="" />
            ) : (
              <span className="cat-image__thumb cat-image__thumb--empty">No photo</span>
            )}
            <div className="cat-image__meta">
              {attachedDataUrl ? (
                <span className="text-sm text-muted">
                  Device photo attached ({Math.round(form.image.length / 1024)} KB) — stored
                  with the item, no upload service needed.
                </span>
              ) : (
                <input
                  id={imageId}
                  type="text"
                  disabled={pending}
                  value={form.image}
                  onChange={(e) => update("image", e.target.value)}
                  placeholder="/media/…  or  https://…"
                />
              )}
              <div className="row">
                <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)} disabled={pending}>
                  Choose photo
                </Button>
                {form.image ? (
                  <Button variant="ghost" size="sm" onClick={() => update("image", "")} disabled={pending}>
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Field>

        <label className="row text-sm" htmlFor={publishedId}>
          <input
            id={publishedId}
            type="checkbox"
            disabled={pending}
            checked={form.published}
            onChange={(e) => update("published", e.target.checked)}
          />
          Published — offered on the storefront
        </label>
        <p className="text-sm text-muted">
          Unchecking takes the item off every public catalog and checkout without deleting it;
          orders that already carry it are untouched.
        </p>

        <div className="capture-actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create item"}
          </Button>
          <Link href="/staff/catalog" className="btn btn--ghost">
            Cancel
          </Link>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(src) => {
          update("image", src);
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
