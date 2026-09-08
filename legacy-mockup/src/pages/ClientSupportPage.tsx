// ============================================================================
// ClientSupportPage — Client (family) portal → Support & Tickets.
// Lists open support tickets and lets the visitor open a new one (demo).
// ============================================================================

import { useState, type FormEvent } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_TICKETS, type ClientTicket } from "../lib/portalData";
import { useToast } from "../components/toast";

const CHIP: Record<ClientTicket["status"], string> = {
  Open: "bg-red-100 text-red-800",
  "In progress": "bg-amber-100 text-amber-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

export function ClientSupportPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !detail.trim()) {
      toast("Please include a subject and a message.", "danger");
      return;
    }
    toast("Ticket opened — our support team will follow up by email.", "success");
    setSubject("");
    setDetail("");
    setOpen(false);
  }

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-primary">
            Family portal
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-on-surface md:text-4xl">
            Support &amp; Tickets
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Reach our care team. We're available 24/7 for urgent needs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="self-start rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer sm:self-auto"
        >
          {open ? "Cancel" : "+ New support ticket"}
        </button>
      </div>

      {/* 24/7 banner */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-container/40 bg-primary-fixed/20 p-6">
        <div>
          <h2 className="font-serif text-lg font-semibold text-on-surface">Immediate assistance</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            For an active arrangement or urgent need, call our 24/7 line.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-[#D4AF37] px-5 py-2.5 text-label-md font-label-md text-[#1b1c1c] transition-colors hover:bg-[#c29f32] hover:text-white cursor-pointer"
            onClick={() => toast("Dialing 24/7 care line (demo).", "default")}
          >
            Call now
          </button>
        </div>
      </section>

      {/* New ticket form */}
      {open ? (
        <form
          onSubmit={submit}
          className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient"
        >
          <div>
            <label htmlFor="st-subject" className="block text-label-md font-label-md text-on-surface-variant mb-1">
              Subject
            </label>
            <input
              id="st-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your concern"
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="st-detail" className="block text-label-md font-label-md text-on-surface-variant mb-1">
              How can we help?
            </label>
            <textarea
              id="st-detail"
              rows={4}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Tell us the details — we'll take it from there."
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="mt-5 rounded-full bg-[#D4AF37] px-6 py-3 text-label-md font-label-md text-[#1b1c1c] transition-colors hover:bg-[#c29f32] hover:text-white cursor-pointer"
          >
            Open ticket
          </button>
        </form>
      ) : null}

      {/* Ticket list */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_TICKETS.map((t) => (
          <article
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-lg font-semibold text-on-surface">{t.subject}</h3>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[t.status]}`}>
                  {t.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">{t.detail}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant/70">
                {t.id} · updated {t.updated}
              </p>
            </div>
            <button
              type="button"
              className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
              onClick={() => toast(`Opening ticket ${t.id} (demo).`, "default")}
            >
              View thread
            </button>
          </article>
        ))}
      </section>
    </PortalFrame>
  );
}
