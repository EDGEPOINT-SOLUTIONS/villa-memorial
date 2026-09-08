import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingDashboard() {
  return (
    <>
      <PageHeader eyebrow="Overview" title="Loading…" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
