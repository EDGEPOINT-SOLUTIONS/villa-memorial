import Link from "next/link";
import { listAgentMaterials } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { WorkbenchPanel } from "@/components/agent/workbench";
import {
  CHAPEL_COMMON_IMAGE,
  DOC_PRICE_LIST_2026_III,
  DOC_TYPES_OF_COFFIN,
  libraryThumb,
  libraryThumbSet,
  PLAN_PACKAGES_IMAGE,
  VIEWING_CARE_IMAGE,
  VILLA_PARK_AERIAL,
} from "@/lib/media";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Marketing & materials — Villa Funeraria agent portal" };

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
 * Marketing & materials — the office's shelf as one grid (approved plan
 * §5.6/§15 PR 4). Every tile is a public page or 2026 sheet the office already
 * publishes, with the client's own cover; the share opens that page so the
 * family sees the same figure the office quotes. Per-link open tracking waits on
 * a share service, so the copy control is honestly disabled and says so.
 *
 * WHY THIS SHAPE. The page it replaces was a wordy shelf with an 90-word
 * explanation; the tiles carry the facts and one short line names the sharing
 * boundary. No cover is re-drawn and no stat is invented.
 */
export default async function AgentMarketingPage() {
  await requirePortalSessionOrRedirect("agent");
  const materials = await listAgentMaterials();

  return (
    <div className="workbench">
      {/* ── the compact header: the answer, then one action ──────────────── */}
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Marketing &amp; materials · what to send</p>
          <h1 className="wb-head__title">One shelf. Every family gets the same true sheet.</h1>
          <p className="wb-head__lead">{materials.length} of the office&apos;s own pages and 2026 sheets.</p>
        </div>
        <div className="wb-head__actions">
          <a className="btn btn--secondary" href={FAMILY_HELP.phoneHref}>
            Ask the office for something new
          </a>
        </div>
      </header>

      {/* ── the shelf: one covers grid ───────────────────────────────────── */}
      <WorkbenchPanel role="neutral" label="Share" title="Materials" count={`${materials.length}`}>
        {materials.length === 0 ? (
          <p className="wb-empty">No material is published yet. The office can prepare one.</p>
        ) : (
          <div className="wb-materials">
          {materials.map((m) => {
            const cover = COVER[m.id] ?? PLAN_PACKAGES_IMAGE;
            return (
              <article className="wb-material wb-clickable" key={m.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="wb-material__cover"
                  src={libraryThumb(cover, 640)}
                  srcSet={libraryThumbSet(cover)}
                  sizes="(max-width: 40rem) 100vw, (max-width: 64rem) 45vw, 22rem"
                  width={640}
                  height={480}
                  loading="lazy"
                  alt={m.title}
                />
                <div className="wb-material__body">
                  <h3 className="wb-material__title">{m.title}</h3>
                  <p className="wb-material__desc">{m.description}</p>
                  <span className="wb-material__stat">
                    {m.example ? "Example: " : ""}shared {m.shares} · opened {m.opens}
                  </span>
                  <div className="wb-material__actions">
                    <Link className="btn btn--primary btn--sm" href={m.href}>
                      Open &amp; share
                    </Link>
                    <button
                      className="btn btn--secondary btn--sm"
                      type="button"
                      disabled
                      title="Copying a tracked share link waits on a share service"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        )}
      </WorkbenchPanel>

      <p className="wb-foot">
        A share opens the office&apos;s own page — the same figure you see. Tracking is not
        connected; send the link from your phone.
      </p>
    </div>
  );
}
