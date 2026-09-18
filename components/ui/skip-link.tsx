/**
 * Skip link — the first focusable element on a portal/sign-in surface, so a
 * keyboard user goes straight past the chrome to the page's main content.
 * The public site renders the anchored-header equivalent (`.anchored-skip`).
 */
export function SkipLink({ target = "#main" }: { target?: string }) {
  return (
    <a className="skip-link" href={target}>
      Skip to main content
    </a>
  );
}
