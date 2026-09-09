import type { Metadata } from "next";
import { PublicShell } from "@/components/ui/public-shell";
import "../globals.css";

export const metadata: Metadata = {
  title: "Villa Memorial — Plans & services",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
