import type { Metadata } from "next";

/**
 * /cart is retired: it redirects to the quote page. The URL stays noindex so a
 * stale link never surfaces in search, with no canonical of its own.
 */
export const metadata: Metadata = {
  title: "Quote — Villa Funeraria",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
