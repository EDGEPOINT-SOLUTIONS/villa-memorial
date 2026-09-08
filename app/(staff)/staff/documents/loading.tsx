import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingDocuments() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Documents" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "22rem" }} />
        <div className="skeleton" style={{ height: "10rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
