import Link from "next/link";
import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { listAgentMaterials } from "@/lib/api-client/agent";
import {
  CHAPEL_COMMON_IMAGE,
  DOC_PRICE_LIST_2026_III,
  DOC_TYPES_OF_COFFIN,
  PLAN_PACKAGES_IMAGE,
  VIEWING_CARE_IMAGE,
  VILLA_PARK_AERIAL,
} from "@/lib/media";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Marketing & materials — Villa Memorial agent portal" };

/** Cover per material — the client's own assets, mapped in one place (lib/media.ts). */
const COVER: Record<string, string> = {
  "mat-plan": PLAN_PACKAGES_IMAGE,
  "mat-price-list": DOC_PRICE_LIST_2026_III,
  "mat-coffins": DOC_TYPES_OF_COFFIN,
  "mat-services": VIEWING_CARE_IMAGE,
  "mat-chapels": CHAPEL_COMMON_IMAGE,
  "mat-park": VILLA_PARK_AERIAL,
};

/**
 * Marketing & materials (approved design page 11): one shelf of client-ready
 * material, pointing at the office's own public pages rather than agent-made
 * copies. Share links with per-link open tracking wait on a service — the
 * buttons say so; the pages themselves are live today.
 */
export default async function AgentMarketingPage() {
  await requirePortalSessionOrRedirect("agent");
  const materials = await listAgentMaterials();
  const shares = materials.reduce((sum, m) => sum + m.shares, 0);

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Marketing &amp; materials · what to send"
        title="One shelf. Every family gets the same true sheet."
        lead="These are the office's own pages and 2026 sheets — not copies, not screenshots. Send the link so the family sees the same figure the office quotes."
        chips={
          <>
            <Chip>{materials.length} materials</Chip>
            <Chip>Shared {shares} times this month</Chip>
            <Chip>2026 sheets</Chip>
          </>
        }
      />

      <AgentSection
        title="Share with a family"
        sub="Open a material and send the office's own page. Share links with open-tracking wait on a service — nothing here pretends to track yet."
        more={
          <a className="btn btn--secondary btn--sm" href="tel:09176178489">
            Ask the office for something new
          </a>
        }
      >
        <div className="ag-materials">
          {materials.map((m) => (
            <article className="ag-material" key={m.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ag-material__cover" src={COVER[m.id] ?? PLAN_PACKAGES_IMAGE} alt={m.title} />
              <div className="ag-material__body">
                <h2 className="ag-material__title">{m.title}</h2>
                <p className="ag-material__desc">{m.description}</p>
                <p className="ag-material__stat">
                  {m.example
                    ? `Example stats: shared ${m.shares} · opened ${m.opens}`
                    : `Shared ${m.shares} · opened ${m.opens}`}
                </p>
                <div className="ag-material__actions">
                  <Link className="btn btn--primary btn--sm" href={m.href}>
                    Open &amp; share
                  </Link>
                  <button
                    className="btn btn--secondary btn--sm"
                    type="button"
                    disabled
                    title="Per-link open tracking waits on a share service"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="ag-card">
          <div className="ag-card__body">
            <p className="ag-note" style={{ margin: 0 }}>
              <strong>How sharing will work.</strong> A share opens the office&apos;s own public page — the
              family sees the same figure you do, and none of your other clients can see who else you sent it
              to. When the office updates a sheet, old links will show a short “updated on” note rather than
              an old price. Tracking will record opens, not people — the family is never profiled for opening
              a page. Until the share service exists, send the link through your own phone: it is still the
              office&apos;s own page and the right figure.
            </p>
          </div>
        </div>
      </AgentSection>
    </div>
  );
}
