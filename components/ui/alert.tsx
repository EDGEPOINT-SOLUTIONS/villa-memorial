export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "success" | "warning" | "danger" | "info";
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <div>
        {title ? <strong>{title}</strong> : null}
        {title && children ? <br /> : null}
        {children}
      </div>
    </div>
  );
}
