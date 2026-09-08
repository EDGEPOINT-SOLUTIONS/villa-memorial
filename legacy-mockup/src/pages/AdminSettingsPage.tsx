import { useState } from "react";
import { PageHeader, Card, Badge, Button, Tabs, Field, Input, Select } from "../components/ui";
import { useDemo } from "../lib/demo";
import { MODULE_FLAGS, TERMINOLOGY } from "../lib/data";

const ACCENTS = ["#00658d", "#00aeef", "#fdc003", "#785900", "#1f8a70"];

export function AdminSettingsPage() {
  const { tenant } = useDemo();
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Tenant settings"
        actions={<Button size="sm">Save changes</Button>}
      />

      <div className="toolbar">
        <span className="chip">Tenant: {tenant.name}</span>
        <Badge tone="accent">Configure · don't rebuild</Badge>
      </div>

      <Tabs tabs={["Modules", "Terminology", "Branding", "Custom fields"]} active={tab} onChange={setTab} />

      {tab === 0 && (
        <Card title="Module flags (A–J)">
          <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
            Turn modules on or off per tenant. Off modules disappear from navigation, forms, and
            workflows — no separate build.
          </p>
          <table className="table" style={{ margin: "-1px" }}>
            <thead>
              <tr><th>Key</th><th>Module</th><th>Enabled</th></tr>
            </thead>
            <tbody>
              {MODULE_FLAGS.map((m) => (
                <tr key={m.key}>
                  <td className="table__name">{m.key}</td>
                  <td>{m.name}</td>
                  <td><input type="checkbox" defaultChecked={m.on} aria-label={`${m.name} enabled`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 1 && (
        <Card title="Terminology overrides">
          <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
            The shared UI uses label keys; the display string is tenant configuration. Change a
            label here and every screen updates instantly.
          </p>
          <table className="table" style={{ margin: "-1px" }}>
            <thead>
              <tr><th>Label key</th><th>Default</th><th>{tenant.name}</th></tr>
            </thead>
            <tbody>
              {TERMINOLOGY.map((t) => (
                <tr key={t.key}>
                  <td className="table__name">{t.key}</td>
                  <td>{t.default}</td>
                  <td>{tenant.id === "villa" ? t.villa : tenant.id === "loyola" ? t.loyola : t.default}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 2 && (
        <div className="split">
          <Card title="Branding">
            <Field label="Brand name">
              <Input defaultValue={tenant.name} />
            </Field>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Field label="Accent color">
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      aria-label={`Accent ${c}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: c,
                        border: c === "#00658d" ? "2px solid var(--granite-800)" : "1px solid var(--color-border)",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </Field>
            </div>
          </Card>
          <Card title="How theming works">
            <p className="small muted">
              Every visual decision flows through CSS custom properties (design tokens). A
              tenant-scoped token override re-skins the whole app without touching components.
            </p>
          </Card>
        </div>
      )}

      {tab === 3 && (
        <Card
          title="Custom fields"
          actions={<Button size="sm">+ Add field</Button>}
        >
          <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
            Tenant-specific fields are definitions (name, type, required, placement), rendered by a
            generic form engine — keeping schema drift out of shared components.
          </p>
          <div className="grid grid--2">
            <Field label="Field name"><Input placeholder="e.g. Parish" /></Field>
            <Field label="Type">
              <Select defaultValue=""><option value="" disabled>Select…</option><option>Text</option><option>Number</option><option>Date</option></Select>
            </Field>
          </div>
        </Card>
      )}
    </>
  );
}
