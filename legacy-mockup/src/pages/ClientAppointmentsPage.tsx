// ============================================================================
// ClientAppointmentsPage — Client (family) portal → My Appointments.
// Lists upcoming/requested/completed appointments; a "Book new" quick action
// opens a small inline form (demo). No backend.
// ============================================================================

import { useState, type FormEvent } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_APPOINTMENTS, type ClientAppointment } from "../lib/portalData";
import { useToast } from "../components/toast";

const CHIP: Record<ClientAppointment["status"], string> = {
  Upcoming: "bg-emerald-100 text-emerald-800",
  Completed: "bg-gray-100 text-gray-600",
  Requested: "bg-amber-100 text-amber-800",
};

const REASONS = [
  "Visit a memorial lot",
  "Planning consultation",
  "Chapel / facility viewing",
  "Other",
];

export function ClientAppointmentsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      toast("Please choose a date first.", "danger");
      return;
    }
    toast(`Appointment requested — ${reason} on ${date}${time ? ` at ${time}` : ""}.`, "success");
    setOpen(false);
    setDate("");
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
            My Appointments
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Upcoming visits and consultations with our care team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="self-start rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer sm:self-auto"
        >
          {open ? "Cancel" : "+ Book an appointment"}
        </button>
      </div>

      {/* Inline book form */}
      {open ? (
        <form
          onSubmit={submit}
          className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="ca-reason" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                Purpose
              </label>
              <select
                id="ca-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ca-date" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                Date
              </label>
              <input
                id="ca-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="ca-time" className="block text-label-md font-label-md text-on-surface-variant mb-1">
                Preferred time
              </label>
              <select
                id="ca-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Anytime</option>
                <option value="10:00">10:00 am</option>
                <option value="11:00">11:00 am</option>
                <option value="14:00">2:00 pm</option>
                <option value="16:00">4:00 pm</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 rounded-full bg-[#D4AF37] px-6 py-3 text-label-md font-label-md text-[#1b1c1c] transition-colors hover:bg-[#c29f32] hover:text-white cursor-pointer"
          >
            Request appointment
          </button>
        </form>
      ) : null}

      {/* Appointment list */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_APPOINTMENTS.map((ap) => (
          <article
            key={ap.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  event
                </span>
              </span>
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-semibold text-on-surface">{ap.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {ap.date}{ap.time ? ` · ${ap.time}` : ""} · with {ap.with}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[ap.status]}`}>
                {ap.status}
              </span>
              <button
                type="button"
                className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
                onClick={() => toast(`Opening appointment ${ap.id} (demo).`, "default")}
              >
                Manage
              </button>
            </div>
          </article>
        ))}
      </section>
    </PortalFrame>
  );
}
