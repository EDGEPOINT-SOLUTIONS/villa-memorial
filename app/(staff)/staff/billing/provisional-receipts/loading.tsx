import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingProvisionalReceipts() {
  return (
    <>
      <PageHeader eyebrow="Finance" title="Provisional receipts" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "18rem" }} />
        <div className="skeleton" style={{ height: "18rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
