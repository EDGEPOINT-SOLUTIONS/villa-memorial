import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingRecordPayment() {
  return (
    <>
      <PageHeader eyebrow="Finance" title="Record payment" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "18rem" }} />
        <div className="skeleton" style={{ height: "18rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
