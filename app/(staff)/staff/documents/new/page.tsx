import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { documentsLiveModeEnabled } from "@/lib/api-client/documents";
import { DocumentUploadForm } from "./upload-form";

export const metadata = { title: "Upload a document — Admin Portal" };

/**
 * Upload a document (`/staff/documents/new`) — the Forms area's repository entry.
 *
 * WHAT WORKS: the office files a real repository row (title, type, the case or order
 * it belongs to, who filed it), and it appears in the repository and its detail page
 * like every other document.
 *
 * WHAT IS HONEST: `documents-api-v1` has no object store, so the file's bytes are not
 * kept — the detail page says "not stored" and names the object store as the missing
 * piece. A live deployment refuses the write outright (the service has no endpoint),
 * which the page states rather than offering a control that could only fail.
 */
export default async function NewDocumentPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["documents:write"])) {
    return (
      <>
        <PageHeader eyebrow="Forms & documents" title="Upload a document" />
        <PageSection>
          <ForbiddenState requiredScopes={["documents:write"]} />
        </PageSection>
      </>
    );
  }

  const live = documentsLiveModeEnabled();

  return (
    <>
      <PageHeader
        eyebrow="Forms · Documents"
        title="Upload a document"
        lead="File a paper against the office repository and the case or order it belongs to."
        actions={
          <Link href="/staff/documents" className="btn btn--secondary btn--sm">
            Back to repository
          </Link>
        }
      />

      <PageSection>
        <Alert tone={live ? "warning" : "info"} title={live ? "Upload is not available live" : "The file itself is not stored"}>
          {live ? (
            <>
              The documents service has no upload endpoint, so this page refuses rather
              than losing the paper. The office can keep filing contextually (receipts on
              payment, agreements from a lot).
            </>
          ) : (
            <>
              The repository row is real and searchable. The document&rsquo;s bytes are not
              kept — v1 has no object store — so its detail page says{" "}
              <strong>not stored</strong> beside the artifact. That is a dev-authored item,
              not a silent success.
            </>
          )}
        </Alert>
      </PageSection>

      {live ? null : (
        <PageSection>
          <DocumentUploadForm />
        </PageSection>
      )}
    </>
  );
}
