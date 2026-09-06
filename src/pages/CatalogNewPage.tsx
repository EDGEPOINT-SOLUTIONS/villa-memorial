// New catalog item — Module C (services, merchandise, packages).

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { CATALOG } from "../lib/data";

export function CatalogNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Service");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const ref = `cat-${CATALOG.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price.trim()) {
      toast("Please add a name and a price.", "danger");
      return;
    }
    setDone(true);
    toast(`Catalog item created · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/catalog">Catalog & packages</Link>} title={done ? "Item created" : "New catalog item"} />

      {done ? (
        <Card title="Catalog item created">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> ({category.toLowerCase()}) is now listed in this tenant's
              catalog. Pricing and availability are configurable per tenant.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/catalog")}>Back to catalog</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Add a catalog item">
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Item name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chapel viewing (per day)" />
              </Field>
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Service</option>
                  <option>Merchandise</option>
                  <option>Package</option>
                </Select>
              </Field>
              <Field label="Price">
                <Input required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₱ 6,000" />
              </Field>
              <Field label="Stock (optional)">
                <Input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="In stock / 3 left" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/catalog")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Create item
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
