// Non-modal side drawer (lot detail, record context).

import { useEffect, type ReactNode } from "react";

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer__header">
          <span className="drawer__title">{title}</span>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer ? (
          <div className="modal__footer" style={{ position: "sticky", bottom: 0 }}>
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
