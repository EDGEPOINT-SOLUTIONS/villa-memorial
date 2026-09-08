import { PageHeader, PageSection } from "@/components/ui/page";

export default function LoadingInquiries() {
  return (
    <>
      <PageHeader eyebrow="Relationships" title="Inquiries" />
      <PageSection>
        <div className="skeleton skeleton--text" style={{ width: "18rem" }} />
        <div className="skeleton" style={{ height: "12rem", marginTop: "var(--space-4)" }} />
      </PageSection>
    </>
  );
}
