import { PageHeader, PageSection } from "@/components/ui/page";

export default function Loading() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Work orders" />
      <PageSection>
        <div className="skeleton" style={{ height: "10rem" }} />
      </PageSection>
    </>
  );
}
