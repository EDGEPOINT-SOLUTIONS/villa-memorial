import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTitleRotation } from "@/lib/home-title-rotation";

/**
 * The gateway title rotation's timing (captain, 2026-10-02).
 *
 * The captain asked the home gateway's title pair to become an UNLIMITED,
 * ordered set the office manages, the band showing one at a time and rotating on
 * an interval the office sets. `lib/home-title-rotation.ts` is the one home for
 * that timing: it starts on the first set, advances through the list in order,
 * loops, and never moves under `prefers-reduced-motion: reduce`. These drive it
 * with fake timers, so the interval is proven rather than assumed — no DOM, no
 * sleeping test.
 */

describe("the home gateway title rotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances one set per interval, in order, and loops back to the first", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 3,
      intervalSeconds: 5,
      still: false,
      onChange: (index) => seen.push(index),
    });

    expect(rotation.index, "starts on the first set").toBe(0);
    rotation.resume();

    // Nothing moves before the interval elapses.
    vi.advanceTimersByTime(4_999);
    expect(seen).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(seen, "the second set after the first interval").toEqual([1]);
    expect(rotation.index).toBe(1);

    vi.advanceTimersByTime(5_000);
    expect(seen, "the third set after the second interval").toEqual([1, 2]);
    expect(rotation.index).toBe(2);

    vi.advanceTimersByTime(5_000);
    expect(seen, "loops back to the first after the last").toEqual([1, 2, 0]);
    expect(rotation.index).toBe(0);

    // And keeps looping rather than stopping at the wrap.
    vi.advanceTimersByTime(5_000);
    expect(seen).toEqual([1, 2, 0, 1]);

    rotation.stop();
  });

  it("shows the first set and never rotates under reduced motion", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 3,
      intervalSeconds: 5,
      still: true,
      onChange: (index) => seen.push(index),
    });

    rotation.resume();
    vi.advanceTimersByTime(600_000);
    expect(seen, "no change was ever announced").toEqual([]);
    expect(rotation.index, "the first set stays on screen").toBe(0);
  });

  it("never rotates a single title set", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 1,
      intervalSeconds: 5,
      still: false,
      onChange: (index) => seen.push(index),
    });

    rotation.resume();
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual([]);
    expect(rotation.index).toBe(0);
  });

  it("keeps the shown set while paused and starts a fresh interval on resume", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 3,
      intervalSeconds: 5,
      still: false,
      onChange: (index) => seen.push(index),
    });

    rotation.resume();
    vi.advanceTimersByTime(5_000);
    expect(rotation.index).toBe(1);

    // The pointer rests on the band: the timer clears, the set does not change.
    rotation.pause();
    vi.advanceTimersByTime(20_000);
    expect(seen).toEqual([1]);
    expect(rotation.index).toBe(1);

    // The pointer leaves: a FRESH interval runs from the shown set, not a
    // resumed one that fires immediately.
    rotation.resume();
    vi.advanceTimersByTime(4_999);
    expect(seen).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([1, 2]);

    rotation.stop();
  });

  it("floors a sub-second interval at one second", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 2,
      intervalSeconds: 0.25,
      still: false,
      onChange: (index) => seen.push(index),
    });

    rotation.resume();
    vi.advanceTimersByTime(999);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([1]);
    rotation.stop();
  });

  it("stop() is idempotent and also clears an already-stopped timer", () => {
    const seen: number[] = [];
    const rotation = createTitleRotation({
      count: 2,
      intervalSeconds: 5,
      still: false,
      onChange: (index) => seen.push(index),
    });
    rotation.resume();
    rotation.stop();
    rotation.stop();
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual([]);
  });
});
