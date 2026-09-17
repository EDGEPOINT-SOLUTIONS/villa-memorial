import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingCatalog() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Catalog" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "22rem" }} />
        <div className="skeleton" style={{ height: "12rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
