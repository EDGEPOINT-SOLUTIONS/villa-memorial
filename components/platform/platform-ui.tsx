/**
 * Platform operator surface — the shared pieces of the three platform screens
 * (tenant management · platform sign-in · tenant sign-up).
 *
 * Presentational only: the vocabulary, requirement lists and honest-state
 * wording all come from `lib/platform-admin.ts`, the surface's one home. These
 * components render the platform's own class set (`platform-*`, declared in
 * styles/components.css) — never the product's chrome classes — so the
 * operator surface cannot be confused with the studio, and a product page
 * cannot accidentally render a platform control.
 */
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PLATFORM_SAMPLE_NOTE, PLATFORM_SERVICE_NOTE } from "@/lib/platform-admin";

/** The surface's standing line: what the platform owns that this build does not. */
export function PlatformServiceNote() {
  return <p className="platform-service-note">{PLATFORM_SERVICE_NOTE}</p>;
}

/** The sample-records marker every tenant screen carries above its rows. */
export function PlatformSampleNotice() {
  return (
    <Alert tone="info" title="Sample records">
      {PLATFORM_SAMPLE_NOTE}
    </Alert>
  );
}

/**
 * A titled list of requirement rows. Details render inside the list item (not
 * a nested paragraph): the reading budget counts list items too, and every
 * line here stays short enough to read at a glance.
 */
export function PlatformRequirementList({
  id,
  heading,
  items,
}: {
  id: string;
  heading: string;
  items: ReadonlyArray<{ title: string; detail: string }>;
}) {
  return (
    <Card header={<h2 id={id}>{heading}</h2>}>
      <ul className="platform-reqs" aria-labelledby={id}>
        {items.map((item) => (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The deferred-work list — named so a reader never assumes it exists. */
export function PlatformDeferredList({
  id,
  heading,
  items,
  note = null,
}: {
  id: string;
  heading: string;
  items: ReadonlyArray<string>;
  note?: ReactNode;
}) {
  return (
    <Card header={<h2 id={id}>{heading}</h2>}>
      <ul className="platform-reqs platform-reqs--plain" aria-labelledby={id}>
        {items.map((item) => (
          <li key={item}>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {note ? <p className="platform-card-note">{note}</p> : null}
    </Card>
  );
}

/** The numbered onboarding sequence (Configure → Import → Train → Go live). */
export function PlatformSequence({
  id,
  heading,
  items,
}: {
  id: string;
  heading: string;
  items: ReadonlyArray<{ title: string; detail: string }>;
}) {
  return (
    <Card header={<h2 id={id}>{heading}</h2>}>
      <ol className="platform-sequence" aria-labelledby={id}>
        {items.map((item) => (
          <li key={item.title}>
            <div>
              <h3 className="platform-sequence__title">{item.title}</h3>
              <span className="platform-sequence__detail">{item.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
