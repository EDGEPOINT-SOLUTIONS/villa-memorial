/** UI-facing session view. Never exposes raw tokens. */
export type Session = {
  userId: string;
  tenantId: string;
  scopes: string[];
  email: string;
  displayName: string;
  /** ISO timestamp of access-token expiry (BFF refreshes before this). */
  expiresAt: string;
  /**
   * Optional v2 role/portal claim (PROPOSED — not in the frozen jwt-claims-v1).
   * Present only when the identity service starts issuing it; absent today, in
   * which case the portal is inferred from scopes exactly as before. Parsed
   * defensively: an unknown value is ignored, never a crash.
   */
  role?: string;
  portal?: string;
};

/** `user` object returned by identity-access login (User#as_safe_json). */
export type SafeUser = {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
};
