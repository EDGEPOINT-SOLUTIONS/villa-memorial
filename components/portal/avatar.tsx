"use client";

import { useState } from "react";

/**
 * Avatar — one round identity disc, shared by the account chip and the
 * Remembering panel.
 *
 * The initials fallback is the shipped state everywhere in the portal (a
 * monogram, never a placeholder face). When a picture exists it is shown; if the
 * image fails to load, the disc falls back to the initials with no broken-image
 * glyph — one line of copy says so beside it where the caller wants it.
 *
 * The disc is decorative: the name is always right beside it (the chip's
 * `aria-label` carries it on a phone), so the image is `alt=""` and the initials
 * are hidden from assistive tech.
 */
export function Avatar({
  src,
  initials,
  size = 40,
  className,
}: {
  src?: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;
  return (
    <span
      className={["avatar", className].filter(Boolean).join(" ")}
      data-size={size >= 64 ? "lg" : size >= 36 ? "md" : "sm"}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- a guarded, private family picture (private, no-store)
        <img
          src={src ?? undefined}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="avatar__initials" aria-hidden="true">
          {initials || "·"}
        </span>
      )}
    </span>
  );
}
