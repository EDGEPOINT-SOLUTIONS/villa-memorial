"use client";

/**
 * Staff sidebar disclosure — the phone fix for the staff shell (craft pass,
 * 2026-09-18). The shell's sidebar turns static below 48rem, which left a
 * ~900px wall of wrapped nav links above the page: on a 390×844 phone the
 * content began below the fold, and the first thing a staff member saw was a
 * menu, never the screen they opened.
 *
 * Desktop is untouched: the toggle is `display: none` above 48rem and the nav
 * always shows. Below 48rem the toggle collapses the nav (closed by default, so
 * the page leads) and the same links expand on demand. The button is a plain
 * 44px target and carries `aria-expanded`/`aria-controls`.
 */
import { Menu, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export function SidebarDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="app-sidebar__nav-wrap" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="app-sidebar__nav-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        <span>{open ? "Close menu" : "Menu"}</span>
      </button>
      <div id={panelId} className="app-sidebar__nav-panel">
        {children}
      </div>
    </div>
  );
}
