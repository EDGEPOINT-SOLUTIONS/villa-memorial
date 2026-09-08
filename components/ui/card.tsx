import type { ReactNode } from "react";

export function Card({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      {header ? <div className="card__header">{header}</div> : null}
      <div className="card__body">{children}</div>
      {footer ? <div className="card__footer">{footer}</div> : null}
    </div>
  );
}
