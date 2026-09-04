// ============================================================================
// ClientDocumentsPage — Client (family) portal → My Documents.
// Lists CLIENT_DOCUMENTS inside the shared PortalFrame; Ready documents can be
// "downloaded" (demo toast), missing ones can be requested. No backend.
// ============================================================================

import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";
import { CLIENT_DOCUMENTS, type ClientDocument } from "../lib/portalData";
import { useToast } from "../components/toast";

const CHIP: Record<ClientDocument["status"], string> = {
  Ready: "bg-emerald-100 text-emerald-800",
  Processing: "bg-amber-100 text-amber-800",
  Requested: "bg-sky-100 text-sky-800",
};

const TYPE_ICON: Record<string, string> = {
  "Purchase agreement": "description",
  "Official receipt": "receipt_long",
  Certificate: "verified",
  Statement: "account_balance",
  Authorization: "edit_document",
};

export function ClientDocumentsPage() {
  const { toast } = useToast();

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Page header */}
      <p className="text-label-md font-label-md uppercase tracking-[0.14em] text-primary">
        Family portal
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-on-surface md:text-4xl">
        My Documents
      </h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Contracts, receipts, certificates, and authorizations tied to your family account.
      </p>

      {/* Document list */}
      <section className="mt-6 flex flex-col gap-4">
        {CLIENT_DOCUMENTS.map((doc) => (
          <article
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-ambient"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  {TYPE_ICON[doc.type] ?? "article"}
                </span>
              </span>
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-semibold text-on-surface">{doc.name}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {doc.type} · Ref {doc.related} · Issued {doc.issued}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CHIP[doc.status]}`}>
                {doc.status}
              </span>
              {doc.status === "Ready" ? (
                <button
                  type="button"
                  className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
                  onClick={() => toast(`Downloading ${doc.name} (demo).`, "success")}
                >
                  Download
                </button>
              ) : (
                <button
                  type="button"
                  className="text-label-md font-label-md text-primary transition-colors hover:text-primary-container cursor-pointer"
                  onClick={() => toast("Request filed — our team will notify you when it's ready.", "success")}
                >
                  Request copy
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* Help strip */}
      <section className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h3 className="font-serif text-lg font-semibold text-on-surface">Need a document we don't list?</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ask our care team for certified copies or other records.
        </p>
        <button
          type="button"
          className="mt-4 rounded-full bg-secondary px-6 py-3 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 cursor-pointer"
          onClick={() => toast("Opening Support & Tickets (demo).", "default")}
        >
          Contact support
        </button>
      </section>
    </PortalFrame>
  );
}
