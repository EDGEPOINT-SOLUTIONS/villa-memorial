"use client";

import { ErrorState } from "@/components/ui/states";

/**
 * PageError — the ONE Admin Portal route error state.
 *
 * A route error boundary used to repeat the same three lines (an `ErrorState`,
 * a "Try again" button wired to the boundary's `reset`, and the wrapper). This
 * is the settled shape so every staff route recovers identically with the
 * product's secondary control (UI/UX renovation, 2026-09-25). The message is
 * the route's own sentence — the wording belongs to the screen.
 */
export function PageError({ message, reset }: { message: string; reset: () => void }) {
  return (
    <div className="stack-4">
      <ErrorState message={message} />
      <div>
        <button className="btn btn--secondary btn--sm" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
