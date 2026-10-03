"use client";

/**
 * Roles editor — the working half of Users & roles (S30).
 *
 * The captain asked to tick permissions (2026-10-02), so each recorded role's
 * frozen permission set is one group of checkboxes. The ticked state is the
 * CURRENT recorded role; changing a box and pressing the one Save writes the
 * whole set through POST /api/access-control/roles into the durable role store
 * (`lib/api-client/access-control.ts`), which validates every token against the
 * frozen `rbac-scopes-v1` vocabulary. A refused save changes nothing.
 *
 * WHAT A SAVE MEANS, HONESTLY. It edits the ROLE RECORD this screen reads. It
 * does not provision a user, and it does not change a sign-in gate: the gates
 * keep reading the identity provider's own session scopes (rbac-scopes-v1 rule
 * 1). The screen says this in one line so nobody reads the tick boxes as live
 * access control.
 *
 * The role's identity (label, detail, holders) and every account's door are
 * recorded seed data and are not editable here.
 */
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/kit";
import { permissionCountLabel, type AccessRole } from "@/lib/access-control";
import { orderScopes } from "@/lib/rbac/scope-vocabulary";
import { ScopeCheckboxes } from "./scope-checkboxes";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type Notice = { tone: "success" | "danger"; msg: string } | null;

function messageFrom(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error: unknown }).error;
    if (typeof error === "string" && error.trim().length > 0) return error;
  }
  return null;
}

function formatStamp(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scopesEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  return a.length === b.length && a.every((scope, index) => scope === b[index]);
}

type SavedRoleState = {
  roles: AccessRole[];
  updated_at: string | null;
  updated_by: string | null;
};

export function RolesEditor({
  initialRoles,
  initialUpdatedAt,
  initialUpdatedBy,
}: {
  initialRoles: AccessRole[];
  initialUpdatedAt: string | null;
  initialUpdatedBy: string | null;
}) {
  const [roles, setRoles] = useState<AccessRole[]>(() => clone(initialRoles));
  // The comparison baseline follows successful saves/discards: after Save the
  // screen is clean, and Discard returns to the LAST SAVED record.
  const [baseline, setBaseline] = useState<AccessRole[]>(() => clone(initialRoles));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [stamp, setStamp] = useState({ at: initialUpdatedAt, by: initialUpdatedBy });

  const dirty = useMemo(
    () =>
      roles.some((role, index) => {
        const before = baseline[index];
        return !before || !scopesEqual(role.scopes, before.scopes);
      }),
    [roles, baseline],
  );

  function toggle(roleKey: string, scope: string, checked: boolean) {
    setRoles((prev) =>
      prev.map((role) =>
        role.key === roleKey
          ? {
              ...role,
              scopes: orderScopes(
                checked
                  ? [...role.scopes, scope]
                  : role.scopes.filter((current) => current !== scope),
              ),
            }
          : role,
      ),
    );
    setNotice((prev) => (prev?.tone === "success" ? null : prev));
  }

  function discard() {
    setRoles(clone(baseline));
    setNotice(null);
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/access-control/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roles: roles.map((role) => ({ key: role.key, scopes: role.scopes })),
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({
          tone: "danger",
          msg: messageFrom(payload) ?? "The save was refused — nothing changed.",
        });
        return;
      }
      const saved = payload as SavedRoleState;
      setRoles(clone(saved.roles));
      setBaseline(clone(saved.roles));
      setStamp({ at: saved.updated_at, by: saved.updated_by });
      setNotice({
        tone: "success",
        msg: `Saved. The role record now carries these permissions${
          saved.updated_by ? ` (${saved.updated_by})` : ""
        }; sign-in gates are unchanged.`,
      });
    } catch {
      setNotice({
        tone: "danger",
        msg: "The role record could not be reached — nothing changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-4">
      <div className="row row--space row--wrap">
        <div className="row row--wrap">
          {dirty ? (
            <Badge tone="warning">Unsaved changes</Badge>
          ) : (
            <Badge tone="success">Saved</Badge>
          )}
          {stamp.at ? (
            <span className="text-sm text-muted">
              Last saved {formatStamp(stamp.at)}
              {stamp.by ? ` by ${stamp.by}` : ""}
            </span>
          ) : (
            <span className="text-sm text-muted">Recorded seed — not yet edited.</span>
          )}
        </div>
        <div className="row">
          <Button variant="secondary" size="sm" onClick={discard} disabled={busy || !dirty}>
            Discard changes
          </Button>
          <Button onClick={save} disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save permissions"}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}>{notice.msg}</Alert> : null}

      {roles.map((role) => (
        <section className="card" key={role.key} aria-labelledby={`role-${role.key}`}>
          <div className="card__header">
            <div className="row row--space row--wrap">
              <h3 id={`role-${role.key}`}>{role.label}</h3>
              <StatusChip tone="neutral">{permissionCountLabel(role.scopes.length)}</StatusChip>
            </div>
          </div>
          <div className="card__body stack-3">
            <p className="text-sm text-muted mb-0">
              {role.detail} Held by {role.holder_emails.join(" · ") || "no recorded account"}.
            </p>
            <ScopeCheckboxes
              selected={role.scopes}
              idPrefix={`role-${role.key}`}
              onToggle={(scope, checked) => toggle(role.key, scope, checked)}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

export default RolesEditor;
