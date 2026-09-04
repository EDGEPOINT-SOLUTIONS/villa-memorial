// Demo-only global state: active tenant + active role (for the switchers in the
// app shell). Determines branding and the role's scope set.

import { createContext, useContext, useState, type ReactNode } from "react";
import { TENANTS, ROLES, type Role, type Tenant } from "./data";

type DemoState = {
  tenant: Tenant;
  role: Role;
  tenants: Tenant[];
  roles: Role[];
  setTenant: (id: string) => void;
  setRole: (id: string) => void;
};

const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState("villa");
  const [roleId, setRoleId] = useState("executive");

  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];

  return (
    <DemoContext.Provider
      value={{
        tenant,
        role,
        tenants: TENANTS,
        roles: ROLES,
        setTenant: setTenantId,
        setRole: setRoleId,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoState {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
