// ============================================================================
// ClientPrivacyPage — Client (family) portal → Privacy Center.
// Explains data use, consent toggles (demo), and downloadable data / deletion
// options. No backend — actions are demo toasts.
// ============================================================================

import { useState } from "react";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { useToast } from "../components/toast";

const TOGGLES = [
  {
    id: "email",
    title: "Email updates",
    detail: "Payment reminders, document notifications, and service updates.",
    on: true,
  },
  {
    id: "sms",
    title: "SMS updates",
    detail: "Important time-sensitive notices about arrangements and visits.",
    on: true,
  },
  {
    id: "commemorations",
    title: "Memorial & anniversary reminders",
    detail: "Gentle reminders and options to leave tributes on memorial anniversaries.",
    on: true,
  },
  {
    id: "marketing",
    title: "News & planning tips",
    detail: "Occasional information about planning ahead and park news.",
    on: false,
  },
];

export function ClientPrivacyPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map((t) => [t.id, t.on])),
  );

  function toggle(id: string, value: boolean) {
    setSettings((prev) => ({ ...prev, [id]: value }));
    toast(value ? "Preference turned on." : "Preference turned off.", "success");
  }

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Page header */}
      <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-primary">
        Family portal
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-on-surface md:text-4xl">
        Privacy Center
      </h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        How Villa Memorial handles your family's data, and the choices you control.
      </p>

      {/* What we collect */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-ambient">
        <h2 className="font-serif text-xl font-semibold text-on-surface">Our privacy promise</h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          We keep your family's records private and use them only to deliver the services you've
          arranged: managing plans, lots, payments, documents, and memorials. We never sell your
          information. Access is limited to the staff who serve you, and every action in our
          systems is recorded in an audit trail.
        </p>
      </section>

      {/* Preference toggles */}
      <section className="mt-6 flex flex-col gap-4">
        {TOGGLES.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <span>
              <span className="block font-serif text-lg font-semibold text-on-surface">{t.title}</span>
              <span className="mt-1 block text-sm text-on-surface-variant">{t.detail}</span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-6 w-6 flex-shrink-0 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
              checked={settings[t.id]}
              onChange={(e) => toggle(t.id, e.target.checked)}
            />
          </label>
        ))}
      </section>

      {/* Data rights */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="font-serif text-lg font-semibold text-on-surface">Your data rights</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          You can request a copy of your records or ask us to close your account at any time.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
            onClick={() => toast("We'll email a copy of your records (demo).", "success")}
          >
            Request my data
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-primary px-6 py-3 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer"
            onClick={() => toast("Account deletion request opened (demo).", "default")}
          >
            Close account
          </button>
        </div>
      </section>
    </PortalFrame>
  );
}
