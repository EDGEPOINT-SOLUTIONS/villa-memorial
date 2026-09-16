import Link from "next/link";
import { AppointmentForm } from "@/components/public-forms/appointment-form";

export const metadata = { title: "Book an appointment — Villa Memorial" };

/**
 * Public appointment request (forms-UI report row 6 · D2 short measure). The
 * form is a client component on the shared capture shell; the reason list is
 * provisional (no shared taxonomy exists). No scheduling service exists and
 * none is invented: a passed submission is confirmed as NOT sent.
 */
export default function Page() {
  return (
    <div className="stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>Book an appointment</h1>
          <p className="text-sm text-muted">
            Sit down with a coordinator at the park office — at a time that suits
            your family.
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/" className="back-link">← Back to home</Link>
          </nav>
        </div>
      </div>
      <div className="page-section" style={{ maxWidth: "46rem" }}>
        <AppointmentForm />
      </div>
    </div>
  );
}
