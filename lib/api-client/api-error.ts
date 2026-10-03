/** Uniform upstream/API failure carried through BFF routes. Single definition —
 * both real and fixture clients throw this exact class so instanceof checks hold.
 * `fieldErrors` lets a write seam report one message per control (the catalogue
 * admin form) without the route re-deriving the rule; routes that fail whole
 * (auth, upstream) simply omit it.
 *
 * `options.cause` carries the underlying OS/upstream failure for the SERVER. It is
 * never put in `message` — that reaches the visitor as the plain sentence — so a
 * filesystem ENOSPC can be named in a server-side log and on the error object while
 * the screen still reads "the case store could not be written". */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Field name → message, when the failure is per-field validation. */
    readonly fieldErrors?: Record<string, string>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}
