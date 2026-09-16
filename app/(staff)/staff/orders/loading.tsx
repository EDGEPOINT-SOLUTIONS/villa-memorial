import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingOrders() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Orders" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "22rem" }} />
        <div className="skeleton" style={{ height: "12rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
