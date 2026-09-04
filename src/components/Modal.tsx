// Modal + confirmation dialog (L1/L2/L3 escalation pattern).

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./ui";

export function Modal({
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <span>{title}</span>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "primary",
  requireType,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  requireType?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const typedOk = !requireType || typed.trim().toUpperCase() === requireType.toUpperCase();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArmed(false);
    const t = setTimeout(() => setArmed(true), 500);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={!armed || !typedOk}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div>{message}</div>
        {requireType ? (
          <div>
            <label className="field__label" htmlFor="confirm-type">
              Type <strong>{requireType}</strong> to confirm
            </label>
            <input
              id="confirm-type"
              className="input"
              style={{ marginTop: "var(--space-2)" }}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
