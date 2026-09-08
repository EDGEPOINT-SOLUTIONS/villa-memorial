import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingPurchaseApplication() {
  return (
    <>
      <PageHeader eyebrow="Operations · Purchase application" title="Loading…" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
