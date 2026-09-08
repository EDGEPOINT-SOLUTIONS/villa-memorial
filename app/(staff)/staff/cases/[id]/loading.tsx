import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingCaseDetail() {
  return (
    <>
      <PageHeader eyebrow="Operations · Case" title="Loading…" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
