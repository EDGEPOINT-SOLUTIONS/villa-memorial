import type { Metadata } from "next";

/**
 * Cart/checkout are public URLs but transactional — never indexed, and with no
 * canonical URL of their own (the shared public layout deliberately sets none,
 * so /cart cannot canonicalise to the home). The pages themselves are client
 * components and cannot export metadata, hence this pass-through layout.
 */
export const metadata: Metadata = {
  title: "Cart — Villa Funeraria",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
