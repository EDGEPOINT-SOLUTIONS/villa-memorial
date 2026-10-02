/**
 * The home gateway's title rotation — the timing, as a plain controller.
 *
 * The office asks for an UNLIMITED, ordered set of gateway title pairs, the band
 * showing one at a time and cross-fading to the next on an interval the office
 * sets (captain, 2026-10-02). The React client (`components/public/home-title-
 * rotator.tsx`) owns the markup and the cross-fade; this module owns WHEN the
 * shown set changes, so the timing can be driven under fake timers in CI without
 * a DOM.
 *
 * Rules it encodes:
 *   · start on the FIRST set and advance through the list in order, looping back
 *     to the first after the last;
 *   · one set is never a rotation — a single title set shows forever;
 *   · `still` (the reader's `prefers-reduced-motion: reduce`) shows the first set
 *     and never starts the timer;
 *   · pausing clears the timer and KEEPS the shown set, so a pointer resting on
 *     the band does not skip a title when it leaves; resuming starts a fresh
 *     interval from the set on screen.
 *
 * The interval is authored in whole seconds (the editor's field); it is floored
 * at one second so a typo can never spin every animation frame.
 */

export type TitleRotationOptions = {
  /** How many title sets the band rotates through. */
  count: number;
  /** Seconds each set stays on screen (the office's field). */
  intervalSeconds: number;
  /** `prefers-reduced-motion: reduce` — show the first set and never rotate. */
  still: boolean;
  /** Called with the new index whenever the shown set changes. */
  onChange: (index: number) => void;
};

export type TitleRotation = {
  /** The set currently on screen (the rotation starts at 0). */
  readonly index: number;
  /** Stop the timer but keep the shown set (pointer over the band, tab hidden). */
  pause(): void;
  /** Start a fresh interval from the shown set (pointer left, tab visible). */
  resume(): void;
  /** Stop for good (unmount). Same as `pause`; named for the effect's cleanup. */
  stop(): void;
};

export function createTitleRotation(options: TitleRotationOptions): TitleRotation {
  let index = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const clear = () => {
    running = false;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const resume = () => {
    // A still reader never rotates; a single set has nowhere to go; an already
    // running timer must not be doubled.
    if (options.still || running || options.count <= 1) return;
    running = true;
    const seconds = Math.max(1, options.intervalSeconds);
    timer = setInterval(() => {
      index = (index + 1) % options.count;
      options.onChange(index);
    }, seconds * 1000);
  };

  return {
    get index() {
      return index;
    },
    pause: clear,
    resume,
    stop: clear,
  };
}
