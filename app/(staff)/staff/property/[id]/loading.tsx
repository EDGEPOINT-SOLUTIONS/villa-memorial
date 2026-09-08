import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingLotDetail() {
  return (
    <>
      <PageHeader eyebrow="Operations · Lot" title="Loading…" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
