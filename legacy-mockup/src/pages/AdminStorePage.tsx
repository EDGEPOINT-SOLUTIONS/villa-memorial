// Admin → Store & content. This is the WRITE side of the demo catalogue: the
// admin edits what the funeral home sells (name, price in ₱, description,
// image, on-sale) and the public-site copy. Every change lands in the shared
// Store context, so the storefront pages, cart, checkout and receipts reflect
// it instantly. Demo only — a refresh restores the seeded defaults.

import { useState } from "react";
import { PageHeader, Card, Badge, Button, Field, Input, Textarea } from "../components/ui";
import { useToast } from "../components/toast";
import { useStore } from "../lib/store";
import { money, type CatalogRecord, type ItemKind, type SiteCopyKey } from "../lib/catalog";

const KINDS: ItemKind[] = ["Plan", "Lot", "Package", "Product", "Transport"];

const KIND_TONE: Record<ItemKind, "info" | "accent" | "neutral" | "success" | "warning"> = {
  Plan: "info",
  Lot: "accent",
  Package: "neutral",
  Product: "success",
  Transport: "warning",
  Service: "neutral",
};

const COPY_FIELDS: { key: SiteCopyKey; label: string }[] = [
  { key: "home.heroTitle", label: "Home — hero title" },
  { key: "home.heroSubtitle", label: "Home — hero subtitle" },
  { key: "site.tagline", label: "Site tagline (footer)" },
  { key: "plans.headline", label: "Plans — headline" },
  { key: "lots.headline", label: "Lots — headline" },
  { key: "map.title", label: "Park map — title" },
  { key: "contact.blurb", label: "Contact — blurb" },
];

function Row({
  record,
  onSave,
}: {
  record: CatalogRecord;
  onSave: (patch: Partial<CatalogRecord>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(record.name);
  const [price, setPrice] = useState(record.price === null ? "" : String(record.price));
  const [blurb, setBlurb] = useState(record.blurb);
  const [detail, setDetail] = useState(record.detail);
  const [image, setImage] = useState(record.image ?? record.imageSeed ?? "");
  const [category, setCategory] = useState(record.category ?? "");
  const { toast } = useToast();

  function save() {
    const parsed = price.trim() === "" ? null : Number(price.replace(/[^\d]/g, ""));
    onSave({
      name: name.trim() || record.name,
      price: parsed === null || Number.isNaN(parsed) ? null : parsed,
      blurb: blurb.trim(),
      detail: detail.trim(),
      category: category.trim() || undefined,
      image: image.startsWith("http") ? image : undefined,
      imageSeed: image.startsWith("http") ? undefined : image || undefined,
    });
    toast(`${record.name} updated.`, "success");
  }

  return (
    <div className="card" style={{ marginBottom: "var(--space-3)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="table__name">{record.name}</span>
            <Badge tone={KIND_TONE[record.kind]}>{record.kind}</Badge>
            {record.active ? (
              <Badge tone="success">On sale</Badge>
            ) : (
              <Badge tone="danger">Hidden</Badge>
            )}
          </div>
          <div className="small muted" style={{ marginTop: "var(--space-1)" }}>
            {record.sku} · {record.price === null ? "Price on arrangement" : money(record.price)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSave({ active: !record.active });
              toast(record.active ? `${record.name} hidden from storefront.` : `${record.name} is now on sale.`, "success");
            }}
          >
            {record.active ? "Hide" : "Show"}
          </Button>
          <span className="material-symbols-outlined" style={{ color: "var(--color-text-muted)" }}>
            {open ? "expand_less" : "expand_more"}
          </span>
        </div>
      </div>

      {open ? (
        <div className="stack" style={{ padding: "var(--space-4)", borderTop: "1px solid var(--color-border)" }}>
          <div className="form-grid">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Price (₱)" hint="Leave blank for 'price on arrangement'">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 120000" />
            </Field>
            {record.kind === "Product" || record.kind === "Lot" || record.kind === "Plan" ? (
              <Field label="Category / chip">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Caskets" />
              </Field>
            ) : null}
            <Field label="Image URL or seed" hint="Paste an http URL, or a short picsum seed">
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://… or seed-name" />
            </Field>
          </div>
          <Field label="Short blurb">
            <Input value={blurb} onChange={(e) => setBlurb(e.target.value)} />
          </Field>
          <Field label="Long description">
            <Textarea rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={save}>
              Save item
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminStorePage() {
  const { copy, byKind, update, setCopy, reset } = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<ItemKind | "Copy">("Product");
  const counts = KINDS.map((k) => [k, byKind(k).length] as const);
  const items = tab === "Copy" ? [] : byKind(tab);

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Store & content"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              reset();
              toast("Store reset to seeded defaults.", "default");
            }}
          >
            Reset demo
          </Button>
        }
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        This is the single source of truth for the demo store. Edit what the funeral home sells
        and the public pages, cart, and receipts update immediately. (Frontend demo — resets on
        refresh.)
      </p>

      {/* Kind tabs */}
      <div className="tabs" role="tablist">
        {counts.map(([kind, n]) => (
          <button
            key={kind}
            role="tab"
            aria-selected={tab === kind}
            className={`tab${tab === kind ? " tab--active" : ""}`}
            onClick={() => setTab(kind)}
          >
            {kind} ({n})
          </button>
        ))}
        <button
          role="tab"
          aria-selected={tab === "Copy"}
          className={`tab${tab === "Copy" ? " tab--active" : ""}`}
          onClick={() => setTab("Copy")}
        >
          Site copy
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid--5" style={{ marginBottom: "var(--space-5)" }}>
        {counts.map(([kind, n]) => {
          const active = byKind(kind, { activeOnly: true }).length;
          return (
            <div key={kind} className="kpi" style={{ cursor: "default" }}>
              <div className="kpi__label">{kind}s</div>
              <div className="kpi__value">{n}</div>
              <div className="small muted">{active} on sale</div>
            </div>
          );
        })}
      </div>

      {tab === "Copy" ? (
        <Card title="Public site copy">
          <div className="stack">
            <p className="small muted">
              Edit the hero titles, subtitles and taglines shown on the public pages.
            </p>
            {COPY_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input value={copy[key]} onChange={(e) => setCopy(key, e.target.value)} />
              </Field>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button size="sm" onClick={() => toast("Site copy saved.", "success")}>
                Save copy
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          {items.length === 0 ? (
            <Card>
              <p className="muted">No {tab.toLowerCase()} items.</p>
            </Card>
          ) : (
            items.map((r) => (
              <Row key={r.sku} record={r} onSave={(patch) => update(r.sku, patch)} />
            ))
          )}
        </div>
      )}
    </>
  );
}
