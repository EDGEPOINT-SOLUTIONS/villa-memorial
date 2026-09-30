import type { Metadata } from "next";

/**
 * /checkout is the priced cart's final step (priced catalogue lines only —
 * quote-only lines belong to /quote). The URL stays noindex and nofollow so a
 * stale link never surfaces in search, with no canonical of its own.
 */
export const metadata: Metadata = {
  title: "Checkout — Villa Funeraria",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
