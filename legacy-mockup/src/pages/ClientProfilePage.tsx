// ============================================================================
// ClientProfilePage — Client (family) Portal → My Profile.
// Renders the logged-in family contact's account details inside the shared
// PortalFrame chrome (CLIENT_NAV sidebar). Data from CLIENT_PROFILE demo data;
// actions fire demo toasts (no backend).
// ============================================================================

import { useToast } from "../components/toast";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_PROFILE } from "../lib/portalData";

const FIELD_LABEL =
  "text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant/70";
const FIELD_VALUE = "mt-1 text-body-md font-body-md text-on-surface";
const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full border border-primary px-5 py-2.5 text-label-md font-label-md text-primary transition-colors hover:bg-primary-fixed cursor-pointer";

export function ClientProfilePage() {
  const { toast } = useToast();

  const p = CLIENT_PROFILE;
  const initials = p.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fields: { label: string; value: string }[] = [
    { label: "Email", value: p.email },
    { label: "Phone", value: p.phone },
    { label: "Address", value: p.address },
    { label: "Member since", value: p.memberSince },
  ];

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      <div className="space-y-6">
        <header>
          <p className="text-label-md font-label-md uppercase tracking-widest text-on-surface-variant">
            Family portal
          </p>
          <h1 className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-on-surface">
            My Profile
          </h1>
          <p className="mt-2 max-w-2xl text-body-md font-body-md text-on-surface-variant">
            Your account details at Villa Memorial.
          </p>
        </header>

        {/* Profile card */}
        <div className="max-w-2xl rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <span className="font-serif text-2xl font-semibold text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl font-semibold text-on-surface">{p.name}</p>
              <p className="mt-0.5 text-label-md font-label-md text-secondary">{p.familyAccount}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label}>
                <p className={FIELD_LABEL}>{f.label}</p>
                <p className={FIELD_VALUE}>{f.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => toast("Edit profile — coming soon in the demo.")}
              className={OUTLINE_BTN}
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => toast("Change password — coming soon in the demo.")}
              className={OUTLINE_BTN}
            >
              Change password
            </button>
          </div>

          <p className="mt-4 rounded-lg bg-surface-container-low px-4 py-3 text-body-md font-body-md text-on-surface-variant">
            Contact a funeral director to update the authorized family members list.
          </p>
        </div>

        {/* Family account link card */}
        <div className="max-w-2xl rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
          <p className="text-label-md font-label-md text-on-surface">Family account</p>
          <p className="mt-1 text-body-md font-body-md text-on-surface-variant">
            Manage who can view and act on {p.familyAccount}.
          </p>
          <button
            type="button"
            onClick={() => toast("Family members — coming soon in the demo.", "success")}
            className={`${OUTLINE_BTN} mt-4`}
          >
            View family members (demo)
          </button>
        </div>
      </div>
    </PortalFrame>
  );
}
