/**
 * The client's brand names — the ONE home for the two strings that used to be
 * copy-pasted across the chrome (client minute 2026-09-21, item 3: brand the
 * product "Villa Funeraria", and keep it consistent).
 *
 * The review found three copies of "Villa Funeraria" (the landing wordmark,
 * `lib/seo.ts` and the root metadata) beside a separately hardcoded
 * "Villa Memorial" in the staff eyebrow, the portal frames and the `(public)`
 * fallback title. Those surfaces now read this module, and
 * `tests/unit/brand-consistency.test.tsx` fails a "Villa Memorial" that is used
 * as the COMPANY brand again.
 *
 * NOTE the distinction the audit drew: **Villa Funeraria is the company**;
 * **Villa Memorial Park is the place**. A park name or a page title that names
 * the park legitimately says "Villa Memorial Park" — only the brand/company
 * surfaces read `BRAND_NAME`.
 */

/** The company — one brand string, used by the chrome, the portal frames and SEO. */
export const BRAND_NAME = "Villa Funeraria";

/** The memorial park's own name (a place, not the company). */
export const PARK_NAME = "Villa Memorial Park";

/** The app-wide page-title suffix: "<page> — Villa Funeraria". */
export function brandTitle(page: string): string {
  return `${page} — ${BRAND_NAME}`;
}
