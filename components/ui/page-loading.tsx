import { PageHeader, PageSection } from "@/components/ui/page";

/**
 * PageLoading — the ONE Admin Portal route-loading state.
 *
 * Every `/staff/*` route used to re-derive the same block: a `PageHeader`, a
 * `PageSection` and two `.skeleton` placeholders whose width/height drifted
 * route by route. This is the settled shape, so a route's loading state is one
 * call and the pages cannot fall out of step (UI/UX renovation, 2026-09-25).
 *
 * The header keeps the route's real eyebrow/title so the loading frame is the
 * page's own chrome, not a generic "Loading…" wall; `width` is optional (omit
 * it for a block-only state on a detail route).
 */
export function PageLoading({
  eyebrow,
  title,
  width,
  height = "10rem",
}: {
  eyebrow: string;
  title: string;
  /** Width of the lead text placeholder; omit for a block-only skeleton. */
  width?: string;
  height?: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <PageSection>
        {width ? (
          <div className="skeleton skeleton--text" style={{ width }} />
        ) : null}
        <div
          className="skeleton"
          style={{ height, marginTop: width ? "var(--space-4)" : undefined }}
        />
      </PageSection>
    </>
  );
}
