import type { Metadata } from "next";

/**
 * Checkout is a public URL but transactional — never indexed, and with no
 * canonical URL of its own (the shared public layout deliberately sets none).
 * The page itself is a client component and cannot export metadata, hence this
 * pass-through layout.
 */
export const metadata: Metadata = {
  title: "Checkout — Villa Funeraria",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
