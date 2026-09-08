import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingCases() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Cases" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "22rem" }} />
        <div className="skeleton" style={{ height: "10rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
