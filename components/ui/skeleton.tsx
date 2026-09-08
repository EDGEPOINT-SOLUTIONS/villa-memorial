export function Skeleton({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div aria-hidden="true" data-loading="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton skeleton--text" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}
