import Link from "next/link";
import { getAgentWorkspace } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { monogram } from "@/lib/family/family-view";
import { Avatar } from "@/components/portal/avatar";
import { PortalKv } from "@/components/portal/portal-ui";
import { WorkbenchPanel } from "@/components/agent/workbench";

export const metadata = { title: "Profile — Villa Funeraria agent portal" };

/** The four pages an agent opens most, offered as one-tap shortcuts here too. */
const SHORTCUTS = [
  { href: "/agent/prospects", label: "Prospects", hint: "Your pipeline" },
  { href: "/agent/appointments", label: "Appointments & tasks", hint: "Your day" },
  { href: "/agent/lots", label: "Lot availability", hint: "What to show" },
  { href: "/agent/marketing", label: "Marketing & materials", hint: "What to send" },
] as const;

/**
 * Profile — the agent's own account screen (the counterpart of the family's
 * "Your details"), on the agent workbench's approved material model (plan §9).
 *
 * IDENTITY FROM THE OFFICE'S RECORD. The name, email and office number are the
 * office's own agent record (`lib/fixtures/agent/workspace.json` `agent`), the
 * same record the frame's account chip reads; the session only stands in if that
 * read ever fails. Nothing the record does not hold is printed — no branch, no
 * license, no personal phone.
 *
 * THE PICTURE IS HONEST. There is no recorded agent picture and no agent image
 * store, so the shared Avatar renders its initials disc. A client's photograph is
 * never borrowed for the agent.
 *
 * CHANGES GO THROUGH THE OFFICE. The office number on the "change your details"
 * line is read from `lib/family/contact.ts` (the published line), not from the
 * record's own copy, so the call action and the printed number stay one source.
 */
export default async function AgentProfilePage() {
  const session = await requirePortalSessionOrRedirect("agent");

  let record: { display_name: string; email: string; office_number: string } | null = null;
  try {
    record = (await getAgentWorkspace()).agent;
  } catch {
    record = null;
  }

  const name = record?.display_name?.trim() || session.displayName;
  const email = record?.email?.trim() || session.email;
  const officeNumber = record?.office_number?.trim() || null;
  const initials = monogram(name) || "A";

  return (
    <div className="workbench wb-profile">
      {/* ── the account header: the picture disc beside the identity ───── */}
      <header className="wb-head">
        <div className="wb-account">
          <Avatar initials={initials} size={56} />
          <div className="wb-account__id">
            <p className="wb-head__eyebrow">Your account · Agent</p>
            <h1 className="wb-head__title">{name}</h1>
            <p className="wb-head__lead">{email}</p>
          </div>
        </div>
        <div className="wb-head__actions">
          <a className="btn btn--primary" href={FAMILY_HELP.phoneHref}>
            Call the office
          </a>
          <Link className="btn btn--secondary" href="/agent/dashboard">
            Back to Today
          </Link>
        </div>
      </header>

      <div className="wb-grid">
        <WorkbenchPanel
          role="place"
          className="wb-span-7"
          label="Your record"
          title="What the office keeps"
        >
          <PortalKv label="Name" value={name} />
          <PortalKv label="Email — this is how you sign in" value={email} />
          {officeNumber ? <PortalKv label="Office number" value={officeNumber} /> : null}
          <p className="wb-note">
            Your picture is your initials. The office&apos;s record holds no picture for you yet.
          </p>
          <p className="wb-note">
            To change any of these, call{" "}
            <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> — the office updates your
            record, and it takes a minute.
          </p>
        </WorkbenchPanel>

        <WorkbenchPanel
          role="tools"
          className="wb-span-5"
          label="Shortcuts"
          title="The four pages you use most"
        >
          <div className="wb-tools">
            {SHORTCUTS.map((shortcut) => (
              <Link className="wb-tool" href={shortcut.href} key={shortcut.href}>
                <span className="wb-tool__label">{shortcut.label}</span>
                <span className="wb-tool__hint">{shortcut.hint}</span>
              </Link>
            ))}
          </div>
        </WorkbenchPanel>
      </div>

      <p className="wb-foot">
        Signed in as {email}. Nothing is written from this page. Ask the office at{" "}
        {FAMILY_HELP.phone}.
      </p>
    </div>
  );
}
