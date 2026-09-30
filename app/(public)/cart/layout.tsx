import type { Metadata } from "next";

/**
 * /cart is the priced basket (priced catalogue lines only — quote-only lines
 * belong to /quote). The URL stays noindex so a stale link never surfaces in
 * search, with no canonical of its own.
 */
export const metadata: Metadata = {
  title: "Your cart — Villa Funeraria",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
