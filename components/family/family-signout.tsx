"use client";

/**
 * Family sign-out — one real control used by the More sheet (the phone's only
 * account door) and by Your details (the desktop path). The family portal has
 * no sidebar, so the sign-out action needs a named home on both sizes.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function FamilySignOut({ to = "/client/login" }: { to?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="fv-quietlink fv-quietlink--button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        router.replace(to);
      }}
    >
      <LogOut size={20} aria-hidden="true" />
      <span>Sign out of this device</span>
    </button>
  );
}
