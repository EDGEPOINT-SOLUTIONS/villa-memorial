"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/**
 * RailToggle — the collapsible rail's one control (plan §7.3).
 *
 * The choice is per device. To avoid a flash of the wrong width, the stored
 * preference is applied to `<html data-rail>` by a tiny inline script before
 * first paint (app/(family)/client/layout.tsx); the CSS reads that attribute, so
 * the rail is already the right width when it paints. This button only flips the
 * attribute and remembers the choice.
 *
 * `collapsed` starts as `null` (unknown) and resolves on mount: the server and
 * the first client render agree (no hydration mismatch), and the button's
 * `aria-expanded` fills in immediately after. The button is a real control with
 * `aria-controls` pointing at the nav it collapses.
 */
const STORAGE_KEY = "fv-rail";

function apply(collapsed: boolean): void {
  const root = document.documentElement;
  if (collapsed) root.dataset.rail = "collapsed";
  else delete root.dataset.rail;
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    /* private mode — the choice still applies until the tab closes */
  }
}

export function RailToggle({ controlsId = "portal-nav" }: { controlsId?: string }) {
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.rail === "collapsed");
  }, []);

  const isCollapsed = collapsed === true;
  return (
    <button
      type="button"
      className="rail-toggle"
      aria-expanded={collapsed === null ? undefined : !isCollapsed}
      aria-controls={controlsId}
      aria-label={isCollapsed ? "Expand the menu" : "Collapse the menu"}
      title={isCollapsed ? "Expand the menu" : "Collapse the menu"}
      onClick={() => {
        const next = !isCollapsed;
        apply(next);
        setCollapsed(next);
      }}
    >
      {isCollapsed ? (
        <PanelLeftOpen size={18} aria-hidden="true" />
      ) : (
        <PanelLeftClose size={18} aria-hidden="true" />
      )}
      <span className="rail-toggle__label">{isCollapsed ? "Expand" : "Collapse"}</span>
    </button>
  );
}
