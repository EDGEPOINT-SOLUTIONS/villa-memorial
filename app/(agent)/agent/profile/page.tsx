import Link from "next/link";
import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

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
 * "Your details"). Real today: the sign-in email the session carries and the
 * shortcuts to the working pages. Name, branch and phone belong to the office's
 * agent record, so the screen says who to ask rather than inventing fields.
 */
export default async function AgentProfilePage() {
  const session = await requirePortalSessionOrRedirect("agent");

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Your account"
        title={session.displayName}
        lead="The details the office keeps for you, and the pages you use most."
        chips={
          <>
            <Chip>{session.email}</Chip>
            <Chip>Agent</Chip>
          </>
        }
      />

      <AgentSection title="How you sign in" sub="This is the email on your agent record.">
        <div className="ag-card">
          <div className="ag-card__body">
            <p className="ag-note">{session.email}</p>
          </div>
        </div>
      </AgentSection>

      <AgentSection title="Shortcuts" sub="The four pages you open most.">
        <div className="ag-quickgrid">
          {SHORTCUTS.map((shortcut) => (
            <Link className="ag-quick" href={shortcut.href} key={shortcut.href}>
              <span className="ag-quick__label">{shortcut.label}</span>
              <span className="ag-quick__hint">{shortcut.hint}</span>
            </Link>
          ))}
        </div>
      </AgentSection>

      <AgentSection title="Change your details">
        <p className="ag-note">
          Name, branch or email — tell the office and they update your record. Signing
          out lives at the bottom of the menu.
        </p>
      </AgentSection>
    </div>
  );
}
