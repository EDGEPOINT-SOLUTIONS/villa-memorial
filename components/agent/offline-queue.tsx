"use client";

/**
 * The “captured offline” vitals entry — the one dashboard figure that lives on
 * the device, not on a server.
 *
 * WHY A CLIENT COMPONENT. Field captures are kept in this browser
 * (lib/demo-agent-captures.ts) until the crm-families write contract exists, so
 * the server cannot know the count. The tile renders the stable empty state on
 * the server and fills the real number after mount — never a guessed figure, and
 * never a hydration mismatch. The link always opens the capture screen, where
 * the queued leads are listed in full.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { listAgentLeads } from "@/lib/demo-agent-captures";

export function OfflineQueueVital() {
  const [queued, setQueued] = useState(0);
  useEffect(() => {
    setQueued(listAgentLeads().filter((lead) => lead.state === "queued").length);
  }, []);
  return (
    <Link className="wb-vital" href="/agent/new" data-tone="neutral" data-blank="no">
      <span className="wb-vital__label">Captured offline</span>
      <span className="wb-vital__value">{queued}</span>
      <span className="wb-vital__basis">queued on this phone</span>
    </Link>
  );
}
