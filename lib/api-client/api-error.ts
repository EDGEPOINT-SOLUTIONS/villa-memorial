/** Uniform upstream/API failure carried through BFF routes. Single definition —
 * both real and fixture clients throw this exact class so instanceof checks hold.
 * `fieldErrors` lets a write seam report one message per control (the catalogue
 * admin form) without the route re-deriving the rule; routes that fail whole
 * (auth, upstream) simply omit it. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Field name → message, when the failure is per-field validation. */
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
