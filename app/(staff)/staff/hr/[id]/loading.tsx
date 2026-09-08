import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingEmployeeDetail() {
  return (
    <>
      <PageHeader eyebrow="Operations · Staff" title="Loading…" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
