"use client";

import { useState } from "react";

/**
 * CopyAddress — the one interaction the /contact visit band adds (captain's
 * Lavish plan, 2026-09-30, decision Q5-A: "Copy address" with a "Copied"
 * state).
 *
 * It is a real `<button>`, keyboard reachable and labelled by its visible text,
 * so the accessibility gate reads it like any other control. It uses the async
 * clipboard API; when the browser refuses (no permission, an insecure context,
 * or a user who blocks it) it fails SOFT — the label simply does not change and
 * the address stays on screen to select by hand. It never throws and never
 * invents a success it did not get.
 *
 * The address comes in as a prop from the page (the recorded landing content),
 * never typed here.
 */
export function CopyAddress({
  address,
  label = "Copy address",
  className = "btn btn--secondary",
}: {
  /** The exact recorded address string to copy. */
  address: string;
  /** The resting label; the copied state replaces it for two seconds. */
  label?: string;
  /** The button's classes — defaults to the outline support rung. */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail soft: leave the resting label in place. The address is visible.
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}
