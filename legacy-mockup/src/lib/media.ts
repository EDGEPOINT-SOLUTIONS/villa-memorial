// Placeholder imagery for the mockup. Uses Lorem Picsum (stable per seed) so
// cards and heroes have real photos instead of gradient blocks. Swap these for
// real brand assets before production.

export function pic(seed: string, w = 640, h = 400): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
