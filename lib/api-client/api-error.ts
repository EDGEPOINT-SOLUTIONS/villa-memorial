/** Uniform upstream/API failure carried through BFF routes. Single definition —
 * both real and fixture clients throw this exact class so instanceof checks hold. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
