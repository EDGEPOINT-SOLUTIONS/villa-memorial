"use client";

/**
 * Tenant switcher — villa-memorial parity: a quiet, compact select in the top
 * bar (label only via aria, no chrome). Cosmetic demo control only — it never
 * changes the signed-in tenant context (see lib/demo-tenants.ts).
 *
 * It renders nothing while the demo list holds a single tenant: the product
 * carries Villa Memorial only, so there is nothing to switch between.
 */
import { useEffect, useState } from "react";
import { DEMO_TENANTS } from "@/lib/demo-tenants";

const STORAGE_KEY = "im_demo_tenant";

export function TenantSwitcher() {
  const [tenantId, setTenantId] = useState<string>("villa");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && DEMO_TENANTS.some((t) => t.id === saved)) setTenantId(saved);
    } catch {
      // storage unavailable — keep default
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, tenantId);
    } catch {
      // ignore
    }
  }, [tenantId, ready]);

  const tenant = DEMO_TENANTS.find((t) => t.id === tenantId) ?? DEMO_TENANTS[0];

  // A one-entry list is not a switch (the product carries Villa Memorial only).
  // Placed after the hooks so the hook order never changes.
  if (DEMO_TENANTS.length < 2) return null;

  return (
    <select
      className="select topbar-select"
      aria-label="Active tenant (demo)"
      title={`${tenant.name} — ${tenant.branch} · ${tenant.facility}`}
      value={tenant.id}
      onChange={(e) => setTenantId(e.target.value)}
    >
      {DEMO_TENANTS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
