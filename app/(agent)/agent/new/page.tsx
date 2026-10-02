import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { LeadCaptureForm } from "./lead-capture-form";

export const metadata = { title: "New lead — Villa Funeraria agent portal" };

/**
 * New lead — capture in the field (approved design page 12). The form posts to
 * the agent BFF and the lead appears in the pipeline; a capture with no signal
 * is kept on the device as a fallback, which the form states plainly.
 */
export default async function AgentNewLeadPage() {
  await requirePortalSessionOrRedirect("agent");

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="New lead · in the field"
        title="Capture them while you are with them."
        lead="One minute, one hand, one screen. The lead reaches your pipeline the moment you save it; if the signal drops it is kept on this phone instead, and the confirmation tells you exactly which happened."
        chips={
          <>
            <Chip>Phone number + what they need required</Chip>
            <Chip>Straight into your pipeline</Chip>
          </>
        }
      />

      <AgentSection title="New lead" sub="One question at a time. Saving puts the lead in your pipeline — or on this phone when there is no signal.">
        <LeadCaptureForm />
      </AgentSection>
    </div>
  );
}
