import Link from "next/link";

/**
 * The four lot records share one subject — the lot and the people connected to
 * it (captain checklist F-11) — so they share one tab row. Server-rendered
 * links with `aria-current`, 2.5 rem tall, wrapping at 390 px; nothing is
 * client-side, so the screen works before hydration.
 */
export type LotRecordKey = "ownership" | "transfers" | "interments" | "exhumations";

const TABS: ReadonlyArray<{ key: LotRecordKey; label: string }> = [
  { key: "ownership", label: "Ownership" },
  { key: "transfers", label: "Transfers" },
  { key: "interments", label: "Interments" },
  { key: "exhumations", label: "Exhumations" },
];

export function LotRecordTabs({
  lotId,
  current,
}: {
  lotId: string;
  current: LotRecordKey;
}) {
  const base = `/staff/property/${encodeURIComponent(lotId)}`;
  return (
    <nav className="lot-rec-tabs" aria-label="Lot records">
      <ul>
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link
              href={`${base}/${tab.key}`}
              aria-current={tab.key === current ? "page" : undefined}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
