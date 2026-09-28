/**
 * BrandMark — the Villa Funeraria brand glyph used in the header, footer, hero
 * and the mobile quick-menu: an uploaded staff logo image when one is set,
 * otherwise a gold serif monogram fallback of the wordmark's first letter.
 * Pure presentational + framework-free so every surface (server-rendered home,
 * client chrome, unit renders) shares the exact same mark.
 */
export function BrandMark({
  wordmark,
  markImage,
  className = "",
}: {
  wordmark: string;
  markImage: string | null;
  className?: string;
}) {
  const glyph = (wordmark.trim().charAt(0) || "V").toUpperCase();
  if (markImage) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded staff logo
    return <img src={markImage} alt="" className={`brand-mark brand-mark--img ${className}`.trim()} />;
  }
  return (
    <span aria-hidden="true" className={`brand-mark brand-mark--mono ${className}`.trim()}>
      {glyph}
    </span>
  );
}
