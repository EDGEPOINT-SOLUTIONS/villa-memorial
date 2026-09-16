import Link from "next/link";
import { ContactForm } from "@/components/public-forms/contact-form";

export const metadata = { title: "Contact us — Villa Memorial" };

/**
 * Public contact capture (forms-UI report row 4 · D2 short measure). The form
 * is a client component on the shared capture shell; no records service exists,
 * so a submission is kept demo-locally and the confirmation says plainly that
 * nothing was sent. The inquiries board on the staff side reads the same store.
 */
export default function Page() {
  return (
    <div className="stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>Contact us</h1>
          <p className="text-sm text-muted">
            Coordinated, caring support for every step — reach out and a coordinator
            will guide you.
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/" className="back-link">← Back to home</Link>
          </nav>
        </div>
      </div>
      <div className="page-section" style={{ maxWidth: "46rem" }}>
        <ContactForm />
      </div>
    </div>
  );
}
