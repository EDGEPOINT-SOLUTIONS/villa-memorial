import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingSchedule() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Schedule" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "24rem" }} />
        <div className="skeleton" style={{ height: "12rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
