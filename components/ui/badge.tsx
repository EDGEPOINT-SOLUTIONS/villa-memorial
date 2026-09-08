export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  children: React.ReactNode;
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
