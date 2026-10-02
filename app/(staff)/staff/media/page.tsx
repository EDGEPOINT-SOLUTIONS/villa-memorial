import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { DataTable, StatCard, StatusChip } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { LIBRARY_THUMB_WIDTHS, MEDIA_LIBRARY, libraryThumb, libraryThumbSet } from "@/lib/media";

export const metadata = { title: "Media library — Admin Portal" };

/**
 * Staff Media library (`/staff/media`) — the Pages & content area's asset shelf
 * (admin plan).
 *
 * The board's promise is “upload once, reference by id”. What ships today is the
 * other half: the client's own uploaded assets, already referenced by the page
 * editors and served as sized WebP derivatives. This screen shows that shelf
 * honestly — every entry is a real file the product paints, with its path and a
 * preview. Device uploads already land in the document editors; a shared library
 * with alt text, ids and reuse needs D7 public-web media, which is not frozen.
 */

export default async function MediaLibraryPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Pages & content" title="Media library" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  const rows = MEDIA_LIBRARY.map((entry) => ({ ...entry }));
  const largestThumb = LIBRARY_THUMB_WIDTHS[LIBRARY_THUMB_WIDTHS.length - 1];

  return (
    <>
      <PageHeader
        eyebrow="Pages & content"
        title="Media library"
        lead="The client's own photographs and artwork a page editor may attach."
        actions={<StatusChip tone="warning">Uploads need the media service</StatusChip>}
      />

      <div className="kpi-grid">
        <StatCard label="Library assets" value={rows.length} sub="shipped with the product" />
        <StatCard
          label="Sized derivatives"
          value={`${LIBRARY_THUMB_WIDTHS.length}×`}
          sub={`${LIBRARY_THUMB_WIDTHS.join(" / ")} px WebP`}
        />
        <StatCard
          label="Shared uploads"
          value="Off"
          sub="needs D7 public-web media"
        />
      </div>

      <PageSection>
        <p className="text-sm text-muted">
          Every asset below is a real file the public site paints. A device upload made in a
          document editor is used by that document, but is not yet a shared, reusable library
          entry — that needs the public-web media service (D7), which no contract has frozen.
        </p>
        <DataTable
          columns={[
            { key: "preview", header: "Preview" },
            { key: "label", header: "Name" },
            { key: "src", header: "Path", className: "text-sm" },
          ]}
          rows={rows}
          rowKey={(row) => row.src}
          emptyTitle="The library is empty"
          emptyHint="Uploaded assets appear here once the media service is connected."
          renderCell={(row, column) => {
            switch (column.key) {
              case "preview":
                return (
                  // A fixed 56px preview: the width/height attributes give it a
                  // definite box, so the sized derivative is not upscaled.
                  // eslint-disable-next-line @next/next/no-img-element -- shipped client asset
                  <img
                    src={libraryThumb(row.src, 320)}
                    srcSet={libraryThumbSet(row.src)}
                    sizes="56px"
                    width={56}
                    height={56}
                    alt=""
                    loading="lazy"
                    style={{ objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                  />
                );
              case "label":
                return <strong>{row.label}</strong>;
              case "src":
                return <code>{row.src}</code>;
              default:
                return null;
            }
          }}
          caption={
            <>
              {rows.length} assets, the widest published derivative at {largestThumb} px.
            </>
          }
        />
      </PageSection>
    </>
  );
}
