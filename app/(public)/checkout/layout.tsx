import type { Metadata } from "next";

/**
 * /checkout is retired: the office takes inquiries, not orders, so it redirects
 * to the quote page. The URL stays noindex and nofollow.
 */
export const metadata: Metadata = {
  title: "Quote — Villa Funeraria",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
