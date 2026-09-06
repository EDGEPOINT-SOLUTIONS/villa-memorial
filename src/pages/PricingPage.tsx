// Pricing rules — Module C price list & discount rules (config per tenant).

import { PageHeader, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { PRICING_RULES, type PricingRule } from "../lib/data";

const columns: Column<PricingRule>[] = [
  { key: "scope", label: "Applies to", render: (r) => <span className="table__name">{r.scope}</span> },
  { key: "appliesTo", label: "Type", render: (r) => <Badge tone="neutral">{r.appliesTo}</Badge> },
  { key: "base", label: "Base price", numeric: true },
  { key: "rule", label: "Rule" },
];

export function PricingPage() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Pricing rules" />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Base prices and discount rules are configured per tenant — they live in configuration, not
        in code. Money calculations are owned by the finance services in the full system.
      </p>
      <DataTable columns={columns} rows={PRICING_RULES} rowKey={(r) => r.id} />
    </>
  );
}
