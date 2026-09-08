// Client (family) portal → My Requests.
// Renders the CLIENT_REQUESTS demo data inside the shared PortalFrame, with a
// working "New request" inline form (demo: success toast + local pending entry).

import { useState, type FormEvent } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import {
  CLIENT_REQUESTS,
  type ClientRequest,
} from "../lib/portalData";
import { useToast } from "../components/toast";

type RequestKind = "Flowers" | "Maintenance" | "Documents";

const KIND_TITLE: Record<RequestKind, string> = {
  Flowers: "Floral Arrangement",
  Maintenance: "Maintenance Request",
  Documents: "Document Request",
};

function iconFor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("maintenance")) return "cleaning_services";
  if (t.includes("document")) return "article";
  return "local_florist";
}

function Chip({ status }: { status: ClientRequest["status"] }) {
  const styles: Record<ClientRequest["status"], string> = {
    Pending: "bg-amber-100 text-amber-700",
    "In Progress": "bg-secondary-fixed text-secondary",
    Completed: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function ClientRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ClientRequest[]>(CLIENT_REQUESTS);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<RequestKind>("Flowers");
  const [detail, setDetail] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = detail.trim();
    if (!trimmed) {
      toast("Please describe your request first.", "danger");
      return;
    }
    const entry: ClientRequest = {
      id: `REQ-3${30 + requests.length}`,
      title: KIND_TITLE[kind],
      detail: trimmed,
      status: "Pending",
      date: "Today",
    };
    setRequests((prev) => [entry, ...prev]);
    setDetail("");
    setShowForm(false);
    toast("Request submitted — our care team will follow up shortly.", "success");
  }

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Header */}
      <header className="mb-6">
        <p className="text-label-md font-label-md uppercase tracking-wider text-primary">
          Family portal
        </p>
        <h1 className="mt-1 font-serif text-headline-md text-on-surface">
          My Requests
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Flowers, maintenance, and document requests for your family's property.
        </p>
      </header>

      {/* Actions */}
      <div className="mb-6 flex justify-end">
        {showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-full border border-outline px-4 py-2 text-label-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-variant cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full bg-secondary px-5 py-2.5 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
          >
            + New request
          </button>
        )}
      </div>

      {/* New request inline form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-ambient"
        >
          <h2 className="font-serif text-headline-sm text-on-surface">
            New request
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-label-md font-label-md text-on-surface-variant">
                Type
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as RequestKind)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="Flowers">Flowers</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Documents">Documents</option>
              </select>
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-1">
            <span className="text-label-md font-label-md text-on-surface-variant">
              Details
            </span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="Tell us what you need…"
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-primary px-5 py-2.5 text-label-md font-label-md text-on-primary transition-opacity hover:opacity-90 cursor-pointer"
            >
              Submit request
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-outline px-5 py-2.5 text-label-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-variant cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Request list */}
      <div className="flex flex-col gap-4">
        {requests.map((r) => {
          const active = r.status !== "Completed";
          return (
            <div
              key={r.id}
              className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient sm:flex-row sm:items-center"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  {iconFor(r.title)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-on-surface">{r.title}</p>
                  <Chip status={r.status} />
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">{r.detail}</p>
                <p className="mt-1 text-xs text-on-surface-variant/70">
                  {r.id} · {r.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  active
                    ? toast(`Request ${r.id} — our care team is on it.`, "default")
                    : toast(`Opening details for ${r.id} (demo).`, "default")
                }
                className="rounded-full border border-primary px-4 py-2 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer sm:self-center"
              >
                {active ? "Track" : "View"}
              </button>
            </div>
          );
        })}
      </div>
    </PortalFrame>
  );
}
