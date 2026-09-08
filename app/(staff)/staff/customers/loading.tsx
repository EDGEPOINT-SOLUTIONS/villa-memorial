import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingCustomers() {
  return (
    <>
      <PageHeader eyebrow="Relationships" title="Customers" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "22rem" }} />
        <div className="skeleton" style={{ height: "10rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
