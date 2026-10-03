"use client";

/**
 * The office's Prospects workspace — the browser half of `/staff/prospects`.
 *
 * WHAT IT DOES. The list leads (figures and actions, no prose): each row is a
 * prospect with the office's one-click Call and Email, the state, the assigned
 * agent and one Open. From Open comes the ONE detail panel for that prospect —
 * contact, what they asked, notes, the state advance, the assignment and the
 * record of what the office already did. An Add form starts the flow from the
 * empty state; an email blast writes one message to a selected set.
 *
 * HONEST WRITES. Nothing here re-implements a rule: every write posts to the
 * office's own BFF route, which runs the pure readings and persists through the
 * shared journal, then this screen re-reads what the server holds
 * (`router.refresh()`) — never an optimistic success. A refusal shows the
 * server's sentence and changes nothing. The email blast records the message in
 * the office's outbox and hands it to the browser's own mail client; the screen
 * says the notification service is not connected rather than claiming delivery.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { DataTable, EmptyState, StatusChip, type DataTableColumn } from "@/components/kit";
import type { Prospect } from "@/lib/api-client/agent";
import type { OfficeAgent } from "@/lib/api-client/agent-roster";
import type { ProspectAssignment, ProspectBlast } from "@/lib/agent/acquisition";
import { interestLabel, manilaDay, stageMeta } from "@/lib/agent/agent-view";
import {
  PROSPECT_STATES,
  PROSPECT_SERVICE_NOTE,
  mailtoBlastHref,
  mailtoHref,
  nextProspectState,
  prospectSourceLabel,
  prospectState,
  prospectStateLabel,
  prospectStateTone,
  telHref,
  type ProspectState,
} from "@/lib/crm/prospect-view";
import { PROSPECT_INTERESTS, PROSPECT_SOURCES } from "@/lib/crm/prospect-actions";
import { formatMinorUnits } from "@/lib/money";

type WriteResult = { ok: boolean; error?: string };

/** POST one JSON body and read the `{ error }` line a refusal carries. */
async function postJson(url: string, body: unknown): Promise<WriteResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const payload: unknown = await response.json().catch(() => null);
    const record =
      typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    return {
      ok: false,
      error: typeof record.error === "string" ? record.error : "The change could not be saved.",
    };
  } catch {
    return { ok: false, error: "The change could not be saved — check your connection." };
  }
}

/* ------------------------------- the dialog ------------------------------ */

/**
 * The one modal shell for every dialog on this screen: the shared focus contract
 * (focus in, Tab trapped, Escape closes, scroll locked, focus returns) and the
 * same panel grammar the ops board and the editors use.
 */
function Dialog({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { panelRef } = useModalFocus<HTMLDivElement>(true, onClose);
  return (
    <div className="ops-modal" role="presentation">
      <div className="ops-modal__backdrop" onClick={onClose} />
      <div
        className="ops-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="ops-modal__head">
          <div>
            <p className="ops-modal__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <div className="ops-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- add form -------------------------------- */

const NEED_LABELS: Record<(typeof PROSPECT_INTERESTS)[number], string> = {
  plan: "A pre-need plan",
  lot: "A memorial lot",
  services: "Funeral services",
  unsure: "Not sure yet",
};

export function AddProspectDialog({
  agents,
  onClose,
  onCreated,
}: {
  agents: OfficeAgent[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "walk_in",
    need: "unsure",
    want: "",
    note: "",
    agent: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const result = await postJson("/api/staff/prospects", form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "The prospect could not be saved.");
      return;
    }
    onCreated();
  }

  return (
    <Dialog eyebrow="Messages & inquiries" title="Add a prospect" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        {error ? (
          <Alert tone="danger" title="Could not save">
            {error}
          </Alert>
        ) : null}

        <div className="field-grid field-grid--2">
          <Field label="Name" htmlFor="prospect-name" hint="Optional if the number is enough.">
            <input
              id="prospect-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Contact number" htmlFor="prospect-phone">
            <input
              id="prospect-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="prospect-email" hint="Used by the email blast.">
            <input
              id="prospect-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="How they reached us" htmlFor="prospect-source">
            <select
              id="prospect-source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              {PROSPECT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {prospectSourceLabel(source)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What they are considering" htmlFor="prospect-need">
            <select
              id="prospect-need"
              value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })}
            >
              {PROSPECT_INTERESTS.map((need) => (
                <option key={need} value={need}>
                  {NEED_LABELS[need]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Assign to"
            htmlFor="prospect-agent"
            hint="Optional — recorded on the assignment. No notice is sent yet."
          >
            <select
              id="prospect-agent"
              value={form.agent}
              onChange={(e) => setForm({ ...form, agent: e.target.value })}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.email} value={agent.name}>
                  {agent.name} — {agent.role_label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="What did they ask about?" htmlFor="prospect-want">
          <input
            id="prospect-want"
            placeholder="e.g. Monthly plan amount, a lot near the chapel"
            value={form.want}
            onChange={(e) => setForm({ ...form, want: e.target.value })}
          />
        </Field>
        <Field label="Notes" htmlFor="prospect-note" hint="What was said, in your words.">
          <textarea
            id="prospect-note"
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>

        <div className="ops-modal__actions">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add prospect"}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ------------------------------ detail panel ----------------------------- */

const STATE_ORDER: readonly ProspectState[] = PROSPECT_STATES;

function statesAfter(current: ProspectState): ProspectState[] {
  const index = STATE_ORDER.indexOf(current);
  return STATE_ORDER.filter((_, i) => i > index);
}

export function ProspectDetailPanel({
  prospect,
  assignments,
  blasts,
  agents,
  canWrite,
  onClose,
  onChanged,
}: {
  prospect: Prospect;
  assignments: ProspectAssignment[];
  blasts: ProspectBlast[];
  agents: OfficeAgent[];
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const state = prospectState(prospect);
  const nextState = nextProspectState(state);
  const knownOwner = agents.some((agent) => agent.name === prospect.owner) ? prospect.owner : "";
  const [assignAgent, setAssignAgent] = useState(knownOwner);
  const [assignNote, setAssignNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // After an assignment the server sends a new owner; keep the control in step.
  useEffect(() => {
    setAssignAgent(knownOwner);
  }, [knownOwner]);

  const history = [...prospect.stage_history].reverse();
  const myAssignments = assignments.filter((a) => a.prospect_id === prospect.id).reverse();
  const myBlasts = blasts.filter((b) => b.prospect_ids.includes(prospect.id)).reverse();

  async function advance(target: ProspectState) {
    setError(null);
    setBusy(`advance-${target}`);
    const result = await postJson(`/api/staff/prospects/${prospect.id}`, {
      action: "advance",
      state: target,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "The state could not be moved.");
      return;
    }
    onChanged();
  }

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy("assign");
    const result = await postJson(`/api/staff/prospects/${prospect.id}`, {
      action: "assign",
      agent: assignAgent,
      note: assignNote,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "The prospect could not be assigned.");
      return;
    }
    setAssignNote("");
    onChanged();
  }

  const tel = telHref(prospect.phone);
  const mail = mailtoHref(
    prospect.email,
    "Villa Memorial",
    `Hello${prospect.name ? ` ${prospect.name}` : ""},`,
  );

  return (
    <Dialog
      eyebrow={`${prospectStateLabel(state)} · ${prospectSourceLabel(prospect.source)}`}
      title={prospect.name}
      onClose={onClose}
    >
      <div className="stack">
        {error ? (
          <Alert tone="danger" title="Could not save">
            {error}
          </Alert>
        ) : null}

        <div className="row row--wrap">
          <a className="btn btn--primary" href={tel}>
            Call
          </a>
          {mail ? (
            <a className="btn btn--secondary" href={mail}>
              Email
            </a>
          ) : (
            <span className="text-sm text-muted">No email address recorded.</span>
          )}
          <StatusChip tone={prospectStateTone(state)}>{prospectStateLabel(state)}</StatusChip>
        </div>

        <dl className="prospect-facts">
          <div>
            <dt>Phone</dt>
            <dd>{prospect.phone || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{prospect.email || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Considering</dt>
            <dd>{interestLabel(prospect.interest)}</dd>
          </div>
          <div>
            <dt>Assigned to</dt>
            <dd>{prospect.owner || "Unassigned"}</dd>
          </div>
          <div>
            <dt>Came in</dt>
            <dd>{manilaDay(prospect.first_contact_at)}</dd>
          </div>
          <div>
            <dt>Last contact</dt>
            <dd>{manilaDay(prospect.last_contact_at)}</dd>
          </div>
        </dl>

        <section className="stack-2">
          <h3 className="text-md">What they asked about</h3>
          <p className="text-sm">{prospect.want || "Nothing recorded yet."}</p>
          <h3 className="text-md">Notes</h3>
          <p className="text-sm">{prospect.notes || "No notes yet."}</p>
        </section>

        {canWrite ? (
          <section className="stack-2">
            <h3 className="text-md">Move the state forward</h3>
            {nextState ? (
              <div className="row row--wrap">
                {statesAfter(state).map((target) => (
                  <Button
                    key={target}
                    variant={target === nextState ? "primary" : "secondary"}
                    disabled={busy === `advance-${target}`}
                    onClick={() => advance(target)}
                  >
                    Mark {prospectStateLabel(target).toLowerCase()}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Converted — the prospect is a client.</p>
            )}
          </section>
        ) : null}

        <section className="stack-2">
          <h3 className="text-md">Assigned agent</h3>
          {canWrite ? (
            <form className="stack-2" onSubmit={assign}>
              <div className="field-grid field-grid--2">
                <Field label="Agent" htmlFor="assign-agent">
                  <select
                    id="assign-agent"
                    value={assignAgent}
                    onChange={(e) => setAssignAgent(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.email} value={agent.name}>
                        {agent.name} — {agent.role_label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Note"
                  htmlFor="assign-note"
                  hint="Optional — recorded with the assignment. No notice is sent yet."
                >
                  <input
                    id="assign-note"
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                  />
                </Field>
              </div>
              <div className="row">
                <Button type="submit" disabled={busy === "assign" || assignAgent.length === 0}>
                  {busy === "assign" ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm">{prospect.owner || "Unassigned"}</p>
          )}
        </section>

        {myAssignments.length > 0 ? (
          <section className="stack-2">
            <h3 className="text-md">Assignment history</h3>
            <ul className="prospect-history">
              {myAssignments.map((entry) => (
                <li key={`${entry.agent}-${entry.at}`}>
                  <span>{entry.agent}</span>
                  <span className="text-sm text-muted">
                    {manilaDay(entry.at)} · by {entry.by}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {history.length > 0 ? (
          <section className="stack-2">
            <h3 className="text-md">Pipeline history</h3>
            <ul className="prospect-history">
              {history.map((entry) => (
                <li key={`${entry.stage}-${entry.at}`}>
                  <span>{stageMeta(entry.stage).label}</span>
                  <span className="text-sm text-muted">
                    {manilaDay(entry.at)} · by {entry.by}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {myBlasts.length > 0 ? (
          <section className="stack-2">
            <h3 className="text-md">Emails sent</h3>
            <ul className="prospect-history">
              {myBlasts.map((blast) => (
                <li key={blast.id}>
                  <span>{blast.subject}</span>
                  <span className="text-sm text-muted">
                    Queued {manilaDay(blast.at)} · {blast.by}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-sm text-muted">Possible value {formatMinorUnits(prospect.possible_value_cents)}</p>
      </div>
    </Dialog>
  );
}

/* ------------------------------ blast dialog ----------------------------- */

export function BlastDialog({
  prospects,
  onClose,
  onSent,
}: {
  prospects: Prospect[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const withEmail = prospects.filter((p) => p.email.trim());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const result = await postJson("/api/staff/prospects/blast", {
      subject,
      message,
      prospectIds: withEmail.map((p) => p.id),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "The email could not be sent.");
      return;
    }
    // Hand the one message to the office's own mail client — the demo transport.
    const href = mailtoBlastHref(
      withEmail.map((p) => p.email),
      subject,
      message,
    );
    if (href && typeof window !== "undefined") window.location.href = href;
    onSent();
  }

  return (
    <Dialog eyebrow="Email blast" title={`Email ${withEmail.length} prospects`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        {error ? (
          <Alert tone="danger" title="Could not send">
            {error}
          </Alert>
        ) : null}
        {withEmail.length === 0 ? (
          <Alert tone="warning" title="No email addresses">
            None of the selected prospects has an email address recorded.
          </Alert>
        ) : null}

        <Field label="Subject" htmlFor="blast-subject">
          <input
            id="blast-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Message" htmlFor="blast-message">
          <textarea
            id="blast-message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>

        <ul className="prospect-recipients">
          {withEmail.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className="text-sm text-muted">{p.email}</span>
            </li>
          ))}
        </ul>

        <p className="text-sm text-muted">{PROSPECT_SERVICE_NOTE}</p>

        <div className="ops-modal__actions">
          <Button type="submit" disabled={saving || withEmail.length === 0}>
            {saving ? "Sending…" : `Send to ${withEmail.length}`}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* --------------------------------- board --------------------------------- */

export function ProspectsBoard({
  prospects,
  assignments,
  blasts,
  agents,
  canWrite,
}: {
  prospects: Prospect[];
  assignments: ProspectAssignment[];
  blasts: ProspectBlast[];
  agents: OfficeAgent[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) =>
      [p.name, p.phone, p.email, p.want, p.notes, p.owner]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [prospects, query]);

  const openProspect = openId ? prospects.find((p) => p.id === openId) ?? null : null;
  const selectedProspects = prospects.filter((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)),
    );
  }

  function refresh() {
    router.refresh();
  }

  const columns: ReadonlyArray<DataTableColumn<Prospect>> = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          aria-label="Select all prospects in this view"
          checked={filtered.length > 0 && selected.size === filtered.length}
          onChange={toggleAll}
        />
      ),
    },
    { key: "name", header: "Name" },
    { key: "ask", header: "Asked about" },
    { key: "source", header: "Source", className: "text-sm" },
    { key: "state", header: "State" },
    { key: "agent", header: "Agent", className: "text-sm" },
    { key: "actions", header: <span className="visually-hidden">Actions</span> },
  ];

  return (
    <div className="stack-4">
      <div className="row row--wrap row--space">
        <input
          className="input"
          style={{ maxWidth: "22rem" }}
          type="search"
          placeholder="Search name, phone, what they asked…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search prospects"
        />
        <div className="row row--wrap">
          <Button
            variant="secondary"
            disabled={selectedProspects.length === 0}
            onClick={() => setBlastOpen(true)}
          >
            Email selected{selectedProspects.length > 0 ? ` (${selectedProspects.length})` : ""}
          </Button>
          {canWrite ? <Button onClick={() => setAddOpen(true)}>Add prospect</Button> : null}
        </div>
      </div>

      {prospects.length === 0 ? (
        <EmptyState
          title="No prospects yet"
          hint="Every enquiry the office or an agent captures lands here. Add the first one to start."
          action={
            canWrite ? (
              <Button onClick={() => setAddOpen(true)}>Add the first prospect</Button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No prospects match"
          hint="Clear the search to see everyone in play."
          action={
            <Button variant="secondary" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <DataTable
          label="Prospects"
          caption={<span className="visually-hidden">Prospects, newest first</span>}
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          emptyTitle="No prospects match"
          emptyHint="Clear the search to see everyone in play."
          renderCell={(p, column) => {
            switch (column.key) {
              case "select":
                return (
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                );
              case "name":
                return (
                  <span className="prospect-cell">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setOpenId(p.id)}
                    >
                      {p.name}
                    </button>
                    <span className="text-sm text-muted">
                      {p.phone || "No number"} · {interestLabel(p.interest)}
                    </span>
                  </span>
                );
              case "ask":
                return (
                  <span className="prospect-cell">
                    <span className="text-sm">{p.want || "Not recorded"}</span>
                    <span className="text-xs text-muted">
                      came in {manilaDay(p.first_contact_at)}
                    </span>
                  </span>
                );
              case "source":
                return prospectSourceLabel(p.source);
              case "state":
                return (
                  <StatusChip tone={prospectStateTone(prospectState(p))}>
                    {prospectStateLabel(prospectState(p))}
                  </StatusChip>
                );
              case "agent":
                return p.owner || "Unassigned";
              case "actions":
                return (
                  <div className="row row--wrap">
                    <a className="btn btn--primary btn--sm" href={telHref(p.phone)}>
                      Call
                    </a>
                    {p.email ? (
                      <a
                        className="btn btn--secondary btn--sm"
                        href={mailtoHref(p.email, "Villa Memorial")}
                      >
                        Email
                      </a>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(p.id)}>
                      Open
                    </Button>
                  </div>
                );
              default:
                return null;
            }
          }}
        />
      )}

      <p className="text-sm text-muted">{PROSPECT_SERVICE_NOTE}</p>

      {openProspect ? (
        <ProspectDetailPanel
          key={openProspect.id}
          prospect={openProspect}
          assignments={assignments}
          blasts={blasts}
          agents={agents}
          canWrite={canWrite}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      ) : null}

      {addOpen ? (
        <AddProspectDialog
          agents={agents}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      ) : null}

      {blastOpen ? (
        <BlastDialog
          prospects={selectedProspects}
          onClose={() => setBlastOpen(false)}
          onSent={() => {
            setBlastOpen(false);
            setSelected(new Set());
            refresh();
          }}
        />
      ) : null}

    </div>
  );
}
