import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingOrderDetail() {
  return (
    <>
      <PageHeader eyebrow="Commerce · Order" title="Order" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "20rem" }} />
        <div className="skeleton" style={{ height: "14rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
