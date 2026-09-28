import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { LeadCaptureForm } from "./lead-capture-form";

export const metadata = { title: "New lead — Villa Funeraria agent portal" };

/**
 * New lead — capture in the field (approved design page 12). The form is a real
 * device-local capture (lib/demo-agent-captures.ts); the sync to the office
 * waits on the crm-families write contract, which the page states plainly.
 */
export default async function AgentNewLeadPage() {
  await requirePortalSessionOrRedirect("agent");

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="New lead · in the field"
        title="Capture them while you are with them."
        lead="One minute, one hand, one screen. The lead is kept on this phone if the signal drops — it is never lost, and the confirmation tells you exactly where it is."
        chips={
          <>
            <Chip>Phone number + what they need required</Chip>
            <Chip>Kept on this phone</Chip>
          </>
        }
      />

      <AgentSection title="New lead" sub="One question at a time. Nothing here is sent until the CRM write contract lands.">
        <LeadCaptureForm />
      </AgentSection>
    </div>
  );
}
