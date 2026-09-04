// Shared mobile/tablet navigation drawer for COO pages.
// Desktop layouts stay pixel-exact to the COO mockups; on small screens the
// hamburger opens this drawer so every COO page is navigable on phones/tablets.

import { Link } from "react-router-dom";

export type CooMenuLink = {
  key: string;
  label: string;
  to?: string;
  action?: () => void;
  active?: boolean;
  section?: string; // small uppercase group label
};

type Props = {
  open: boolean;
  onClose: () => void;
  links: CooMenuLink[];
  note?: string;
};

const ITEM =
  "block w-full text-left text-label-md font-label-md tracking-widest py-3 text-on-surface-variant hover:text-primary transition-colors duration-200";

export function CooMobileMenu({ open, onClose, links, note }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/25 backdrop-blur-[2px] cursor-default"
      />
      {/* drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col bg-white shadow-lift" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/40">
          <span className="text-headline-sm font-headline-sm font-bold text-primary">Villa Memorial</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 0' }}>
              close
            </span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-6 py-4" aria-label="Mobile">
          {links.map((l) => (
            <div key={l.key}>
              {l.section ? (
                <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant/70">
                  {l.section}
                </p>
              ) : null}
              {l.to ? (
                <Link
                  to={l.to}
                  onClick={onClose}
                  className={`${ITEM}${l.active ? " !text-primary font-bold" : ""}`}
                >
                  {l.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    l.action?.();
                  }}
                  className={`${ITEM}${l.active ? " !text-primary font-bold" : ""}`}
                >
                  {l.label}
                </button>
              )}
            </div>
          ))}
        </nav>
        <p className="px-6 py-4 border-t border-outline-variant/40 text-xs text-on-surface-variant/70">
          {note ?? "Demo · no backend"}
        </p>
      </aside>
    </div>
  );
}
